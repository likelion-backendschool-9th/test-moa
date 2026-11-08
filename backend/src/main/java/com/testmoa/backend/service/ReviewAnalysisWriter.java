package com.testmoa.backend.service;

import com.testmoa.backend.dto.request.AnalysisGroupUpdateRequest;
import com.testmoa.backend.entity.ClusterGroup;
import com.testmoa.backend.entity.Feedback;
import com.testmoa.backend.entity.FeedbackCluster;
import com.testmoa.backend.entity.Recruitment;
import com.testmoa.backend.entity.enums.AnalysisStatus;
import com.testmoa.backend.entity.enums.ClusterCategory;
import com.testmoa.backend.global.client.AnalysisClient;
import com.testmoa.backend.global.client.AnalysisClient.AnalysisGroup;
import com.testmoa.backend.global.client.AnalysisClient.AnalysisResponse;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.repository.ClusterGroupRepository;
import com.testmoa.backend.repository.FeedbackClusterRepository;
import com.testmoa.backend.repository.FeedbackRepository;
import com.testmoa.backend.repository.RecruitmentRepository;
import com.testmoa.backend.service.ReviewAnalysisReader.AnalysisTarget;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 리뷰 묶기의 상태 바꾸기와 결과 저장. 메서드마다 짧은 쓰기 트랜잭션 하나
 */
@Component
@RequiredArgsConstructor
public class ReviewAnalysisWriter {
    // 그룹 이름·이슈 제목 컬럼(varchar(255))의 길이. 넘으면 저장이 통째로 실패해 미리 자름
    private static final int COLUMN_MAX = 255;
    // 등록 중 표시가 이 시간보다 오래되면 서버가 멈춰 남은 것으로 보고 다시 등록할 수 있음
    private static final Duration STALE_REGISTERING = Duration.ofMinutes(5);

    private final GroupCodeIssuer groupCodeIssuer;
    private final RecruitmentRepository recruitmentRepository;
    private final FeedbackRepository feedbackRepository;
    private final ClusterGroupRepository clusterGroupRepository;
    private final FeedbackClusterRepository feedbackClusterRepository;

    /**
     * 분석 시작. 진행 중이 아닐 때만 PENDING으로 바꾸고, 이미 진행 중이면 409 ANALYSIS_IN_PROGRESS
     */
    @Transactional
    public void markPending(Long recruitmentId) {
        if (recruitmentRepository.markAnalysisPending(recruitmentId, AnalysisStatus.PENDING, LocalDateTime.now()) == 0) {
            throw new BusinessException(ErrorCode.ANALYSIS_IN_PROGRESS);
        }
    }

    // 분석 실패. 지난 결과와 analyzed_at은 건드리지 않아, 지난 결과가 있으면 버전 비교는 그대로 쓸 수 있음
    @Transactional
    public void markFailed(Long recruitmentId) {
        recruitmentRepository.markAnalysisFailed(recruitmentId, AnalysisStatus.PENDING, AnalysisStatus.FAILED);
    }

    /**
     * 분석 결과 저장. 지난 그룹과 매핑을 지우되 GitHub에 등록한 그룹은 매핑과 함께 남기고, 응답의 그룹마다 새 코드를 발급함.
     * 응답은 그대로 믿지 않고 이번에 보낸 리뷰만 매핑하며, 남는 리뷰가 없는 그룹은 버림. 응답 안의 key는 저장하지 않음.
     * 하나라도 실패하면 트랜잭션이 되돌아가 지난 결과가 그대로 남음
     */
    @Transactional
    public void save(AnalysisTarget target, AnalysisResponse response) {
        // 지우기 전에 최대 코드를 읽어 지운 코드를 다시 쓰지 않음. 끝날 때까지 프로젝트 행을 잠금
        GroupCodeIssuer.Codes codes = groupCodeIssuer.open(target.projectId());
        // 등록한 그룹과 GitHub에 등록하는 중인 그룹은 남김. 지우면 만들어진 이슈의 링크를 저장할 그룹이 없어짐
        LocalDateTime staleBefore = LocalDateTime.now().minus(STALE_REGISTERING);
        feedbackClusterRepository.deleteUnregisteredByRecruitmentId(target.recruitmentId(), staleBefore);
        clusterGroupRepository.deleteUnregisteredByRecruitmentId(target.recruitmentId(), staleBefore);

        Recruitment recruitment = recruitmentRepository.findById(target.recruitmentId())
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        Map<Long, Feedback> sent = feedbackRepository.findAllById(target.feedbackIds()).stream()
                .collect(Collectors.toMap(Feedback::getId, Function.identity()));

        for (AnalysisGroup group : response.groups()) {
            if (group == null) continue;
            List<Feedback> members = membersOf(group, sent);
            if (members.isEmpty()) continue;
            // 계약에 없는 카테고리면 IllegalArgumentException으로 분석 실패
            ClusterCategory category = ClusterCategory.valueOf(group.category());
            boolean hasIssue = category.hasIssue();
            ClusterGroup saved = clusterGroupRepository.save(ClusterGroup.builder()
                    .recruitment(recruitment)
                    .groupCode(codes.next())
                    .name(AnalysisClient.cut(group.name(), COLUMN_MAX))
                    .category(category)
                    .improvementRank(hasIssue ? validRank(group.improvementRank()) : null)
                    .gitIssueTitle(hasIssue ? AnalysisClient.cut(group.gitIssueTitle(), COLUMN_MAX) : null)
                    .gitIssueContent(hasIssue ? group.gitIssueContent() : null)
                    .build());
            for (Feedback feedback : members) {
                feedbackClusterRepository.save(FeedbackCluster.builder()
                        .clusterGroup(saved)
                        .feedback(feedback)
                        .representative(feedback.getId().equals(group.representativeFeedbackId()))
                        .build());
            }
        }
        recruitment.completeAnalysis(response.praiseSummary(), LocalDateTime.now());
    }

    /**
     * GitHub 이슈 등록을 차지함. 이미 등록했거나 등록 중이면 409 ISSUE_ALREADY_REGISTERED
     */
    @Transactional
    public void claimIssueRegistration(Long groupId) {
        LocalDateTime now = LocalDateTime.now();
        if (clusterGroupRepository.claimIssueRegistration(groupId, now, now.minus(STALE_REGISTERING)) == 0) {
            throw new BusinessException(ErrorCode.ISSUE_ALREADY_REGISTERED);
        }
    }

    // GitHub 등록에 실패했을 때 차지를 풀어 다시 누를 수 있게 함
    @Transactional
    public void releaseIssueRegistration(Long groupId) {
        clusterGroupRepository.releaseIssueRegistration(groupId);
    }

    // GitHub 이슈를 만든 뒤 링크와 번호를 저장함
    @Transactional
    public void markIssueRegistered(Long groupId, String url, int number) {
        clusterGroupRepository.findById(groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND))
                .markIssueRegistered(url, number);
    }

    /**
     * 개발자의 그룹 수정. 보낸 값만 바꿈. 칭찬·미분류 그룹에 심각도·이슈 초안을 보내면 400.
     * 다른 모집글이나 다른 회원의 그룹은 없는 그룹과 같이 404
     */
    @Transactional
    public void editGroup(Long userId, Long recruitmentId, Long groupId, AnalysisGroupUpdateRequest request) {
        ClusterGroup group = clusterGroupRepository.findMine(groupId, recruitmentId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        boolean editsIssue = request.improvementRank() != null || request.gitIssueTitle() != null || request.gitIssueContent() != null;
        if (editsIssue && !group.getCategory().hasIssue()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "칭찬·미분류 그룹에는 심각도와 이슈 초안이 없어요");
        }
        // 등록한 이슈 초안은 GitHub와 달라지지 않도록 고칠 수 없다
        boolean editsDraft = request.gitIssueTitle() != null || request.gitIssueContent() != null;
        if (editsDraft && group.getGitIssueUrl() != null) throw new BusinessException(ErrorCode.ISSUE_ALREADY_REGISTERED);
        if (request.name() != null) group.rename(request.name().trim());
        if (request.improvementRank() != null) group.changeImprovementRank(request.improvementRank());
        if (editsDraft) {
            group.editIssueDraft(
                    request.gitIssueTitle() != null ? request.gitIssueTitle() : group.getGitIssueTitle(),
                    request.gitIssueContent() != null ? request.gitIssueContent() : group.getGitIssueContent());
        }
    }

    // 그룹의 리뷰 중 이번에 보낸 것만, 같은 리뷰는 한 번만. 리뷰 하나가 여러 그룹에 드는 것은 정상
    private static List<Feedback> membersOf(AnalysisGroup group, Map<Long, Feedback> sent) {
        if (group.feedbackIds() == null) return List.of();
        return group.feedbackIds().stream()
                .filter(Objects::nonNull)
                .distinct()
                .map(sent::get)
                .filter(Objects::nonNull)
                .toList();
    }

    // 심각도는 1 = 치명 ~ 4 = 사소. 그 밖의 값은 없는 것으로 저장
    private static Integer validRank(Integer rank) {
        return rank != null && rank >= 1 && rank <= 4 ? rank : null;
    }
}
