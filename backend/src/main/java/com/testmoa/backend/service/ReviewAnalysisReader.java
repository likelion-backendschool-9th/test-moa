package com.testmoa.backend.service;

import com.testmoa.backend.dto.response.ReviewAnalysisResponse;
import com.testmoa.backend.dto.response.ReviewAnalysisResponse.Group;
import com.testmoa.backend.entity.Feedback;
import com.testmoa.backend.entity.Recruitment;
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
    public static final int MAX_FEEDBACKS = 1000;

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
     * 분석할 리뷰와 분석 서버에 보낼 요청. 그 모집글 참가에 달린 리뷰 전부이고, 1,000개가 넘으면 최근 제출한 1,000개.
     * 리뷰가 없으면 409 NO_FEEDBACKS
     */
    public AnalysisTarget readTarget(Long userId, Long recruitmentId) {
        Recruitment recruitment = findMine(userId, recruitmentId);
        List<Feedback> feedbacks = feedbackRepository.findForAnalysis(recruitment.getId(), Limit.of(MAX_FEEDBACKS));
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
                feedbackRepository.countUnanalyzed(id), groups);
    }

    // 다른 회원의 모집글은 없는 모집글과 같이 404
    private Recruitment findMine(Long userId, Long recruitmentId) {
        return recruitmentRepository.findMineWithProject(recruitmentId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }

    /**
     * 분석할 모집글과 보낸 리뷰. 저장할 때 다시 읽도록 엔티티 대신 id만 둠
     *
     * @param feedbackIds 이번에 보낸 리뷰. 응답의 리뷰 ID가 이 안에 있어야 매핑함
     */
    public record AnalysisTarget(Long projectId, Long recruitmentId, List<Long> feedbackIds, AnalysisRequest request) {}
}
