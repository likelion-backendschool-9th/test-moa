package com.testmoa.backend.service;

import com.testmoa.backend.dto.response.VersionComparisonResponse;
import com.testmoa.backend.dto.response.VersionComparisonResponse.CurrentGroup;
import com.testmoa.backend.dto.response.VersionComparisonResponse.NotReportedGroup;
import com.testmoa.backend.entity.ClusterGroup;
import com.testmoa.backend.entity.Recruitment;
import com.testmoa.backend.entity.VersionComparison;
import com.testmoa.backend.entity.enums.AnalysisStatus;
import com.testmoa.backend.global.client.AnalysisClient;
import com.testmoa.backend.global.client.AnalysisClient.ComparisonRequest;
import com.testmoa.backend.global.client.AnalysisClient.GroupItem;
import com.testmoa.backend.global.client.AnalysisClient.VersionGroups;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.repository.ClusterGroupRepository;
import com.testmoa.backend.repository.FeedbackClusterRepository;
import com.testmoa.backend.repository.RecruitmentRepository;
import com.testmoa.backend.repository.VersionComparisonRepository;
import com.testmoa.backend.repository.projection.RepresentativeSample;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * 버전 비교의 조회를 짧은 읽기 트랜잭션 안에서 끝냄. 비교 요청은 엔티티가 아니라 보낼 값만 돌려줘
 * 엔티티와 지연 로딩이 이 밖(분석 서버 호출)으로 나가지 않게 함
 */
@Component
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class VersionComparisonReader {
    private final RecruitmentRepository recruitmentRepository;
    private final ClusterGroupRepository clusterGroupRepository;
    private final FeedbackClusterRepository feedbackClusterRepository;
    private final VersionComparisonRepository versionComparisonRepository;

    /**
     * 비교할 두 버전과 분석 서버에 보낼 요청.
     * 직전 버전은 같은 프로젝트에서 현재보다 버전이 작은 것 중 가장 큰 모집글이고, 두 버전 모두 분석 결과가 있고 분석 중이 아니어야 함
     */
    public ComparisonTarget readTarget(Long userId, Long recruitmentId) {
        Recruitment current = findMine(userId, recruitmentId);
        Recruitment previous = findAnalyzedPrevious(current);
        requireNotAnalyzing(current, previous);
        ComparisonRequest request = new ComparisonRequest(toVersionGroups(previous), toVersionGroups(current));
        return new ComparisonTarget(current.getProject().getId(), current.getId(), previous.getId(), request);
    }

    /**
     * 저장된 비교 결과. 현재 버전 그룹은 직전 버전에 같은 코드가 있으면 "이전에도 있음",
     * 직전 버전 그룹 중 현재 버전에 같은 코드가 없는 것은 "이번 버전에서 보고되지 않음".
     * 비교 전이면 화면이 상태를 가르도록 직전 버전 없음 → 분석 전 → 비교 전 순으로 알림
     */
    public VersionComparisonResponse readResult(Long userId, Long recruitmentId) {
        Recruitment current = findMine(userId, recruitmentId);
        VersionComparison comparison = versionComparisonRepository.findByRecruitmentId(current.getId()).orElse(null);
        if (comparison == null) {
            findAnalyzedPrevious(current);
            throw new BusinessException(ErrorCode.COMPARISON_NOT_FOUND);
        }
        Recruitment previous = comparison.getPreviousRecruitment();

        List<ClusterGroup> currentGroups = clusterGroupRepository.findByRecruitmentIdOrderByIdAsc(current.getId());
        List<ClusterGroup> previousGroups = clusterGroupRepository.findByRecruitmentIdOrderByIdAsc(previous.getId());
        Set<String> currentCodes = codesOf(currentGroups);
        Set<String> previousCodes = codesOf(previousGroups);

        List<CurrentGroup> groups = currentGroups.stream()
                .map(group -> CurrentGroup.of(group, previousCodes.contains(group.getGroupCode())))
                .toList();
        List<NotReportedGroup> notReported = previousGroups.stream()
                .filter(group -> !currentCodes.contains(group.getGroupCode()))
                .map(NotReportedGroup::of)
                .toList();
        return VersionComparisonResponse.of(comparison, current, previous, isStale(comparison, current, previous), groups, notReported);
    }

    // 직전 버전은 같은 프로젝트에서 현재보다 버전이 작은 것 중 가장 큰 모집글.
    // 분석 결과(analyzed_at)가 있어야 비교함. 다시 분석하다 실패해도(FAILED) 지난 결과가 그대로 남아 비교할 수 있음
    private Recruitment findAnalyzedPrevious(Recruitment current) {
        Recruitment previous = recruitmentRepository
                .findFirstByProjectIdAndVersionLessThanOrderByVersionDescIdDesc(current.getProject().getId(), current.getVersion())
                .orElseThrow(() -> new BusinessException(ErrorCode.NO_PREVIOUS_VERSION));
        if (current.getAnalyzedAt() == null || previous.getAnalyzedAt() == null) {
            throw new BusinessException(ErrorCode.ANALYSIS_NOT_DONE);
        }
        return previous;
    }

    // 다시 분석하는 중이면 곧 그룹이 바뀌어 끝난 뒤 비교하거나 짝을 고침
    static void requireNotAnalyzing(Recruitment current, Recruitment previous) {
        if (current.getAnalysisStatus() == AnalysisStatus.PENDING || previous.getAnalysisStatus() == AnalysisStatus.PENDING) {
            throw new BusinessException(ErrorCode.ANALYSIS_IN_PROGRESS);
        }
    }

    // 다른 회원의 모집글은 없는 모집글과 같이 404
    private Recruitment findMine(Long userId, Long recruitmentId) {
        return recruitmentRepository.findMineWithProject(recruitmentId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }

    // 그룹 이름과 대표 리뷰는 분석 서버의 글자 수에 맞춰 자름. 칭찬·미분류는 심각도를 보내지 않음
    private VersionGroups toVersionGroups(Recruitment recruitment) {
        Map<Long, String> samples = feedbackClusterRepository.findRepresentativeSamples(recruitment.getId()).stream()
                .collect(Collectors.toMap(RepresentativeSample::groupId, RepresentativeSample::content, (first, second) -> first));
        List<GroupItem> groups = clusterGroupRepository.findByRecruitmentIdOrderByIdAsc(recruitment.getId()).stream()
                .map(group -> new GroupItem(
                        group.getId(),
                        AnalysisClient.cut(group.getName(), AnalysisClient.TITLE_MAX),
                        group.getCategory().name(),
                        group.getCategory().hasIssue() ? group.getImprovementRank() : null,
                        AnalysisClient.cut(samples.get(group.getId()), AnalysisClient.CONTENT_MAX)))
                .toList();
        return new VersionGroups(recruitment.getVersion(), groups);
    }

    private static Set<String> codesOf(List<ClusterGroup> groups) {
        return groups.stream().map(ClusterGroup::getGroupCode).collect(Collectors.toSet());
    }

    // 비교한 뒤 두 버전 중 하나라도 다시 분석했으면 오래된 비교
    private static boolean isStale(VersionComparison comparison, Recruitment current, Recruitment previous) {
        LocalDateTime comparedAt = comparison.getUpdatedAt();
        return Stream.of(current.getAnalyzedAt(), previous.getAnalyzedAt())
                .anyMatch(analyzedAt -> analyzedAt != null && comparedAt.isBefore(analyzedAt));
    }

    /**
     * 비교할 두 버전. 저장할 때 다시 읽도록 엔티티 대신 id만 둠
     */
    public record ComparisonTarget(Long projectId, Long currentRecruitmentId, Long previousRecruitmentId, ComparisonRequest request) {}
}
