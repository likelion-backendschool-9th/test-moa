package com.testmoa.backend.service;

import com.testmoa.backend.dto.response.ReviewAnalysisResponse;
import com.testmoa.backend.dto.response.ReviewAnalysisResponse.Group;
import com.testmoa.backend.entity.ClusterGroup;
import com.testmoa.backend.entity.Feedback;
import com.testmoa.backend.entity.Recruitment;
import com.testmoa.backend.entity.enums.FeedbackStatus;
import com.testmoa.backend.global.client.AnalysisClient.AnalysisRequest;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.repository.ClusterGroupRepository;
import com.testmoa.backend.repository.FeedbackClusterRepository;
import com.testmoa.backend.repository.FeedbackRepository;
import com.testmoa.backend.repository.RecruitmentRepository;
import com.testmoa.backend.repository.projection.GroupFeedbackStats;
import com.testmoa.backend.repository.projection.RepresentativeSample;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 리뷰 묶기의 조회를 짧은 읽기 트랜잭션 안에서 끝냄. 분석 요청은 엔티티가 아니라 보낼 값만 돌려줘
 * 엔티티와 지연 로딩이 이 밖(분석 스레드)으로 나가지 않게 함
 */
@Component
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReviewAnalysisReader {
    // 분석 서버가 한 번에 받는 리뷰 수
    private static final int MAX_FEEDBACKS = 1000;

    // 분석하는 리뷰 상태. 신고됨(REPORTED)·보상 제외(EXCLUDED) 리뷰는 그룹과 리뷰 수에 넣지 않음
    private static final List<FeedbackStatus> ANALYZED_STATUSES = List.of(FeedbackStatus.SUBMITTED, FeedbackStatus.REWARDED);

    // 심각도 오름차순(null은 맨 뒤) → 테스터 수 내림차순 → 먼저 저장한 그룹
    private static final Comparator<Group> PRIORITY = Comparator
            .comparing(Group::improvementRank, Comparator.nullsLast(Comparator.<Integer>naturalOrder()))
            .thenComparing(Comparator.comparingLong((Group group) -> group.testerCount()).reversed())
            .thenComparing(Group::groupId);

    private final RecruitmentRepository recruitmentRepository;
    private final FeedbackRepository feedbackRepository;
    private final ClusterGroupRepository clusterGroupRepository;
    private final FeedbackClusterRepository feedbackClusterRepository;

    /**
     * 분석할 리뷰와 분석 서버에 보낼 요청. 그 모집글 참가에 달린 제출·지급 리뷰이고, 1,000개가 넘으면 최근 제출한 1,000개.
     * 리뷰가 없으면 409 NO_FEEDBACKS
     */
    public AnalysisTarget readTarget(Long userId, Long recruitmentId) {
        Recruitment recruitment = findMine(userId, recruitmentId);
        List<Feedback> feedbacks = feedbackRepository.findForAnalysis(recruitment.getId(), ANALYZED_STATUSES, Limit.of(MAX_FEEDBACKS));
        if (feedbacks.isEmpty()) throw new BusinessException(ErrorCode.NO_FEEDBACKS);
        AnalysisRequest request = new AnalysisRequest(
                AnalysisRequests.context(recruitment),
                feedbacks.stream().map(AnalysisRequests::feedbackItem).toList());
        return new AnalysisTarget(recruitment.getProject().getId(), recruitment.getId(),
                feedbacks.stream().map(Feedback::getId).toList(), request);
    }

    /**
     * 저장된 분석 결과. 리뷰 수·테스터 수·대표 리뷰는 저장하지 않고 매핑(feedback_clusters)으로 계산함
     */
    public ReviewAnalysisResponse readResult(Long userId, Long recruitmentId) {
        Recruitment recruitment = findMine(userId, recruitmentId);
        Long id = recruitment.getId();
        Map<Long, String> samples = feedbackClusterRepository.findRepresentativeSamples(id).stream()
                .collect(Collectors.toMap(RepresentativeSample::groupId, RepresentativeSample::content, (first, second) -> first));
        Map<Long, GroupFeedbackStats> stats = feedbackClusterRepository.findGroupStats(id).stream()
                .collect(Collectors.toMap(GroupFeedbackStats::groupId, Function.identity()));

        List<Group> groups = clusterGroupRepository.findByRecruitmentIdOrderByIdAsc(id).stream()
                .map(group -> {
                    GroupFeedbackStats counted = stats.get(group.getId());
                    return Group.of(group, samples.get(group.getId()),
                            counted == null ? 0 : counted.feedbackCount(), counted == null ? 0 : counted.testerCount());
                })
                .sorted(PRIORITY)
                .toList();
        return ReviewAnalysisResponse.of(recruitment, feedbackClusterRepository.findLastAnalyzedFeedbackAt(id),
                feedbackRepository.countUnanalyzed(id, ANALYZED_STATUSES), groups);
    }

    /**
     * GitHub에 등록할 이슈. 이미 등록했거나, 칭찬·미분류 그룹이거나, 제목·내용이 비어 있으면 거절함.
     * 본문은 그룹의 이슈 내용, 근거(리뷰 수·테스터 수·버전), 리뷰 인용 최대 3개이고 테스터를 알 수 있는 값은 넣지 않음
     */
    public IssueDraft readIssueDraft(Long userId, Long recruitmentId, Long groupId) {
        Recruitment recruitment = findMine(userId, recruitmentId);
        ClusterGroup group = clusterGroupRepository.findMine(groupId, recruitmentId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (group.getGitIssueUrl() != null) throw new BusinessException(ErrorCode.ISSUE_ALREADY_REGISTERED);
        if (!group.getCategory().hasIssue()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "칭찬·미분류 그룹은 이슈로 등록할 수 없어요");
        }
        if (isBlank(group.getGitIssueTitle()) || isBlank(group.getGitIssueContent())) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "이슈 제목과 내용을 채워 주세요");
        }
        GroupFeedbackStats stats = feedbackClusterRepository.findGroupStats(recruitmentId).stream()
                .filter(found -> found.groupId().equals(groupId)).findFirst()
                .orElse(new GroupFeedbackStats(groupId, 0, 0));
        StringBuilder body = new StringBuilder(group.getGitIssueContent())
                .append("\n\n## 근거\n- 리뷰 ").append(stats.feedbackCount()).append("개 · 테스터 ").append(stats.testerCount())
                .append("명 · 테스트 버전 v").append(recruitment.getVersion()).append("\n\n## 대표 리뷰\n");
        for (String content : feedbackClusterRepository.findSampleContents(groupId, Limit.of(3))) {
            // 리뷰 안의 @이름이 GitHub 사용자에게 알림을 보내지 않도록 @ 뒤에 보이지 않는 글자를 둠
            body.append("> ").append(content.replace("@", "@\u200B").replace("\n", "\n> ")).append("\n\n");
        }
        body.append("---\ntest-moa 분석 결과에서 생성됨");
        return new IssueDraft(recruitment.getProject().getId(), group.getGitIssueTitle(), body.toString(), labelsOf(group));
    }

    // 라벨: test-moa, 카테고리, 심각도
    private static List<String> labelsOf(ClusterGroup group) {
        List<String> labels = new ArrayList<>(List.of("test-moa", switch (group.getCategory()) {
            case BUG -> "bug";
            case UX -> "ux";
            default -> "request";
        }));
        Integer rank = group.getImprovementRank();
        if (rank != null) labels.add("severity:" + switch (rank) {
            case 1 -> "critical";
            case 2 -> "blocker";
            case 3 -> "minor";
            default -> "trivial";
        });
        return labels;
    }

    private static boolean isBlank(String text) {
        return text == null || text.isBlank();
    }

    // 다른 회원의 모집글은 없는 모집글과 같이 404
    private Recruitment findMine(Long userId, Long recruitmentId) {
        return recruitmentRepository.findMineWithProject(recruitmentId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }

    public record IssueDraft(Long projectId, String title, String body, List<String> labels) {}

    /**
     * 분석할 모집글과 보낸 리뷰. 저장할 때 다시 읽도록 엔티티 대신 id만 둠
     *
     * @param feedbackIds 이번에 보낸 리뷰. 응답의 리뷰 ID가 이 안에 있어야 매핑함
     */
    public record AnalysisTarget(Long projectId, Long recruitmentId, List<Long> feedbackIds, AnalysisRequest request) {}
}
