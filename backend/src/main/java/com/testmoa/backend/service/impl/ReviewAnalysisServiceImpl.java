package com.testmoa.backend.service.impl;

import com.testmoa.backend.dto.request.AnalysisGroupUpdateRequest;
import com.testmoa.backend.dto.response.GroupReviewResponse;
import com.testmoa.backend.dto.response.PraiseReviewResponse;
import com.testmoa.backend.dto.response.ReviewAnalysisResponse;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.global.client.GitHubIssueClient;
import com.testmoa.backend.global.client.GitHubIssueClient.IssueRef;
import com.testmoa.backend.service.ProjectRepositoryLinkProvider;
import com.testmoa.backend.service.ProjectRepositoryLinkProvider.RepositoryLink;
import com.testmoa.backend.service.ReviewAnalysisLimiter;
import com.testmoa.backend.service.ReviewAnalysisReader;
import com.testmoa.backend.service.ReviewAnalysisReader.AnalysisTarget;
import com.testmoa.backend.service.ReviewAnalysisReader.IssueDraft;
import com.testmoa.backend.service.ReviewAnalysisService;
import com.testmoa.backend.service.ReviewAnalysisWorker;
import com.testmoa.backend.service.ReviewAnalysisWriter;
import com.testmoa.backend.service.SubscriptionChecker;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.task.TaskRejectedException;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

// 분석 서버는 분석 전용 스레드(ReviewAnalysisWorker)에서 부르고, 이 서비스에는 트랜잭션을 두지 않음.
// 조회는 ReviewAnalysisReader의 읽기 트랜잭션, 상태 바꾸기와 저장은 ReviewAnalysisWriter의 쓰기 트랜잭션에서 끝냄
@Slf4j
@Service
@RequiredArgsConstructor
public class ReviewAnalysisServiceImpl implements ReviewAnalysisService {

    private final SubscriptionChecker subscriptionChecker;
    private final ReviewAnalysisReader reviewAnalysisReader;
    private final ReviewAnalysisWriter reviewAnalysisWriter;
    private final ReviewAnalysisWorker reviewAnalysisWorker;
    private final ReviewAnalysisLimiter reviewAnalysisLimiter;
    private final ProjectRepositoryLinkProvider repositoryLinkProvider;
    private final GitHubIssueClient gitHubIssueClient;

    /**
     * 리뷰가 없으면 한도를 쓰기 전에 거절함. 이미 진행 중이거나 분석 스레드 대기열이 차서 시작하지 못하면 쓴 횟수를 되돌림.
     * PENDING으로 바꾼 트랜잭션이 끝난 뒤 분석을 넘겨서, 분석 스레드는 바뀐 상태를 봄
     */
    @Override
    public ReviewAnalysisResponse start(Long userId, Long recruitmentId) {
        subscriptionChecker.require(userId);

        AnalysisTarget target = reviewAnalysisReader.readTarget(userId, recruitmentId);

        LocalDate countedIn = reviewAnalysisLimiter.acquire(userId);
        try {
            reviewAnalysisWriter.markPending(target.recruitmentId());
        } catch (RuntimeException e) {
            reviewAnalysisLimiter.release(userId, countedIn);
            throw e;
        }

        try {
            reviewAnalysisWorker.analyze(target, userId, countedIn);
        } catch (TaskRejectedException e) {
            log.warn("분석 스레드 대기열이 차서 리뷰 분석을 시작하지 못함 recruitmentId={}", target.recruitmentId());
            reviewAnalysisWriter.markFailed(target.recruitmentId());
            reviewAnalysisLimiter.release(userId, countedIn);
            throw new BusinessException(ErrorCode.AI_UNAVAILABLE);
        }
        return reviewAnalysisReader.readResult(userId, recruitmentId);
    }

    @Override
    public ReviewAnalysisResponse find(Long userId, Long recruitmentId) {
        subscriptionChecker.require(userId);
        return reviewAnalysisReader.readResult(userId, recruitmentId);
    }

    @Override
    public List<PraiseReviewResponse> findPraises(Long userId, Long recruitmentId) {
        subscriptionChecker.require(userId);
        return reviewAnalysisReader.readPraises(userId, recruitmentId);
    }

    @Override
    public List<GroupReviewResponse> findGroupReviews(Long userId, Long recruitmentId, Long groupId) {
        subscriptionChecker.require(userId);
        return reviewAnalysisReader.readGroupReviews(userId, recruitmentId, groupId);
    }

    /**
     * 주인·초안 확인과 레포 조회는 차지하기 전에 해서 거절할 때 차지를 건드리지 않음. 등록을 먼저 차지해 두 번 눌러도 이슈가 하나만 생기게 하고,
     * GitHub는 트랜잭션 밖에서 부름. 실패하면(초안 다시 읽기 포함) 차지를 풀어 다시 누를 수 있게 함
     */
    @Override
    public ReviewAnalysisResponse registerIssue(Long userId, Long recruitmentId, Long groupId) {
        subscriptionChecker.require(userId);
        IssueDraft checked = reviewAnalysisReader.readIssueDraft(userId, recruitmentId, groupId);
        RepositoryLink repository = repositoryLinkProvider.find(checked.projectId())
                .orElseThrow(() -> new BusinessException(ErrorCode.GITHUB_REPO_NOT_LINKED));

        reviewAnalysisWriter.claimIssueRegistration(groupId);
        IssueRef issue;
        try {
            // 차지한 뒤에는 초안을 고칠 수 없어서, 여기서 다시 읽은 초안이 화면에 남는 초안과 같음
            IssueDraft draft = reviewAnalysisReader.readIssueDraft(userId, recruitmentId, groupId);
            issue = gitHubIssueClient.create(repository, draft.title(), draft.body(), draft.labels());
        } catch (RuntimeException e) {
            reviewAnalysisWriter.releaseIssueRegistration(groupId);
            throw e;
        }
        try {
            reviewAnalysisWriter.markIssueRegistered(groupId, issue.url(), issue.number());
        } catch (RuntimeException e) {
            // shortcut: 이슈는 만들어졌는데 저장에 실패하면 차지를 풀지 않아 5분 동안 두 번째 이슈를 막는다. 링크는 로그로 남김
            log.error("GitHub 이슈는 만들었지만 저장하지 못함 groupId={} url={}", groupId, issue.url(), e);
            throw e;
        }
        return reviewAnalysisReader.readResult(userId, recruitmentId);
    }

    @Override
    public ReviewAnalysisResponse editGroup(Long userId, Long recruitmentId, Long groupId, AnalysisGroupUpdateRequest request) {
        subscriptionChecker.require(userId);
        reviewAnalysisWriter.editGroup(userId, recruitmentId, groupId, request);
        return reviewAnalysisReader.readResult(userId, recruitmentId);
    }
}
