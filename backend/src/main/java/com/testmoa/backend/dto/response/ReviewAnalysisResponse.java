package com.testmoa.backend.dto.response;

import com.testmoa.backend.entity.ClusterGroup;
import com.testmoa.backend.entity.Recruitment;
import com.testmoa.backend.entity.enums.AnalysisStatus;
import com.testmoa.backend.entity.enums.ClusterCategory;

import java.time.LocalDateTime;
import java.util.List;

/**
 * AI 리뷰 묶기 결과. 분석 중(PENDING)이나 실패(FAILED)여도 지난 결과의 그룹을 함께 준다
 *
 * @param analysisStatus          마지막 분석 요청의 상태(NONE, PENDING, DONE, FAILED)
 * @param analysisRequestedAt     마지막 분석 요청(접수) 시각. PENDING이면 화면이 "n분째 분석 중"을 보여 준다
 * @param analyzedAt              마지막으로 분석을 마친 시각. 분석 전에는 null
 * @param analyticsSummary        리뷰 전체를 한 문장으로 요약한 분석. 화면 맨 위 "핵심 요약"에 쓴다. 분석 전이면 null
 * @param praiseSummary           칭찬 리뷰 한 줄 요약. 칭찬이 없으면 null
 * @param lastAnalyzedFeedbackAt  분석에 들어간 리뷰 중 가장 늦게 제출한 시각. 분석한 리뷰가 없으면 null
 * @param unanalyzedFeedbackCount 이 모집글의 제출·지급 리뷰 중 어느 그룹에도 들지 않은 수. 신고·보상 제외 리뷰는 세지 않는다
 * @param groups                  심각도 오름차순(null은 맨 뒤), 같으면 테스터 수 내림차순
 */
public record ReviewAnalysisResponse(
        Long recruitmentId,
        int version,
        AnalysisStatus analysisStatus,
        LocalDateTime analysisRequestedAt,
        LocalDateTime analyzedAt,
        String analyticsSummary,
        String praiseSummary,
        LocalDateTime lastAnalyzedFeedbackAt,
        long unanalyzedFeedbackCount,
        List<Group> groups
) {
    public static ReviewAnalysisResponse of(Recruitment recruitment, LocalDateTime lastAnalyzedFeedbackAt, long unanalyzedFeedbackCount,
                                            List<Group> groups) {
        return new ReviewAnalysisResponse(recruitment.getId(), recruitment.getVersion(), recruitment.getAnalysisStatus(),
                recruitment.getAnalysisRequestedAt(), recruitment.getAnalyzedAt(), recruitment.getAnalyticsSummary(), recruitment.getPraiseSummary(),
                lastAnalyzedFeedbackAt, unanalyzedFeedbackCount, groups);
    }

    /**
     * @param improvementRank        심각도 1 = 치명 ~ 4 = 사소. 칭찬·미분류는 null
     * @param gitIssueUrl            등록한 GitHub 이슈 링크. 등록 전에는 null
     * @param gitIssueNumber         등록한 GitHub 이슈 번호. 등록 전에는 null
     * @param representativeFeedback 대표 리뷰 내용. 없으면 null
     * @param feedbackCount          그룹에 든 리뷰 수
     * @param testerCount            그 리뷰를 쓴 테스터 수. 같은 테스터의 리뷰는 한 명으로 셈
     */
    public record Group(
            Long groupId,
            String groupCode,
            String name,
            ClusterCategory category,
            Integer improvementRank,
            String gitIssueTitle,
            String gitIssueContent,
            String gitIssueUrl,
            Integer gitIssueNumber,
            String representativeFeedback,
            long feedbackCount,
            long testerCount
    ) {
        public static Group of(ClusterGroup group, String representativeFeedback, long feedbackCount, long testerCount) {
            return new Group(group.getId(), group.getGroupCode(), group.getName(), group.getCategory(), group.getImprovementRank(),
                    group.getGitIssueTitle(), group.getGitIssueContent(), group.getGitIssueUrl(), group.getGitIssueNumber(), representativeFeedback,
                    feedbackCount, testerCount);
        }
    }
}
