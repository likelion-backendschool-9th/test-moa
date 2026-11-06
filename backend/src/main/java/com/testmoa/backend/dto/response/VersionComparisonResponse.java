package com.testmoa.backend.dto.response;

import com.testmoa.backend.entity.ClusterGroup;
import com.testmoa.backend.entity.Recruitment;
import com.testmoa.backend.entity.VersionComparison;
import com.testmoa.backend.entity.enums.ClusterCategory;

import java.time.LocalDateTime;
import java.util.List;

/**
 * AI 버전 비교 결과. 화면에는 "해결됨"이라고 쓰지 않고 notReportedGroups를 "이번 버전에서 보고되지 않음"으로 보여 준다
 *
 * @param comparedAt        비교한 시각
 * @param stale             비교한 뒤 두 버전 중 하나를 다시 분석했으면 true(오래된 비교)
 * @param groups            현재 버전 그룹
 * @param notReportedGroups 직전 버전에는 있고 현재 버전에는 같은 코드가 없는 그룹
 */
public record VersionComparisonResponse(
        Long currentRecruitmentId,
        int currentVersion,
        Long previousRecruitmentId,
        int previousVersion,
        String summary,
        LocalDateTime comparedAt,
        boolean stale,
        List<CurrentGroup> groups,
        List<NotReportedGroup> notReportedGroups
) {
    public static VersionComparisonResponse of(VersionComparison comparison, Recruitment current, Recruitment previous, boolean stale,
                                               List<CurrentGroup> groups, List<NotReportedGroup> notReportedGroups) {
        return new VersionComparisonResponse(current.getId(), current.getVersion(), previous.getId(), previous.getVersion(),
                comparison.getSummary(), comparison.getUpdatedAt(), stale, groups, notReportedGroups);
    }

    /**
     * @param improvementRank    심각도 1 = 치명 ~ 4 = 사소. 칭찬·미분류는 null
     * @param previouslyReported 직전 버전에 같은 코드가 있으면 true("이전에도 있음"), 없으면 false("신규")
     */
    public record CurrentGroup(Long groupId, String groupCode, String name, ClusterCategory category, Integer improvementRank,
                               boolean previouslyReported) {
        public static CurrentGroup of(ClusterGroup group, boolean previouslyReported) {
            return new CurrentGroup(group.getId(), group.getGroupCode(), group.getName(), group.getCategory(),
                    group.getImprovementRank(), previouslyReported);
        }
    }

    public record NotReportedGroup(Long groupId, String groupCode, String name, ClusterCategory category, Integer improvementRank) {
        public static NotReportedGroup of(ClusterGroup group) {
            return new NotReportedGroup(group.getId(), group.getGroupCode(), group.getName(), group.getCategory(),
                    group.getImprovementRank());
        }
    }
}
