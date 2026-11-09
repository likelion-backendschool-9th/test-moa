package com.testmoa.backend.global.client;

import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.util.List;
import java.util.UUID;

/**
 * AI 분석 서버(파이썬 analysis-server) 호출. 요청·응답 모양은 분석 서버의 계약(api/schemas)과 같음.
 * 분석 서버를 쓸 수 없으면(5xx·연결 실패·시간 초과) 503 AI_UNAVAILABLE,
 * 요청을 거절하거나(401·422) 응답이 계약과 다르면 메인 백엔드의 설정·계약 문제라 500 INTERNAL_ERROR로 바꿈
 */
@Slf4j
public class AnalysisClient {
    private static final String TOKEN_HEADER = "X-Internal-Token";
    private static final String REQUEST_ID_HEADER = "X-Request-ID";

    // 분석 서버가 받는 글자 수. 넘으면 422로 거부함
    public static final int TITLE_MAX = 200;
    public static final int DESCRIPTION_MAX = 5000;
    public static final int CONTENT_MAX = 4000;

    private final RestClient restClient;
    // 리뷰 묶기 전용. 응답까지 몇 분 걸릴 수 있어 응답 대기 시간이 긴 RestClient를 따로 씀
    private final RestClient reviewAnalysisClient;
    private final String internalToken;

    public AnalysisClient(RestClient.Builder builder, RestClient.Builder reviewAnalysisBuilder, String internalToken) {
        this.restClient = builder.build();
        this.reviewAnalysisClient = reviewAnalysisBuilder.build();
        this.internalToken = internalToken;
    }

    /**
     * 리뷰 하나로 테스터에게 보낼 후속 질문을 추천받음(POST /v1/followup-questions)
     */
    public List<String> suggestFollowupQuestions(FollowupRequest request) {
        FollowupResponse response = post(restClient, "/v1/followup-questions", request, FollowupResponse.class);
        if (response.questions() == null) {
            log.error("분석 서버 응답에 questions가 없음");
            throw new BusinessException(ErrorCode.INTERNAL_ERROR);
        }
        return response.questions();
    }

    /**
     * 직전 버전과 현재 버전의 분석 그룹을 비교받음(POST /v1/comparisons).
     * 짝·새 그룹·요약이 없으면 계약과 다른 응답이라 500
     */
    public ComparisonResponse compare(ComparisonRequest request) {
        ComparisonResponse response = post(restClient, "/v1/comparisons", request, ComparisonResponse.class);
        if (response.matches() == null || response.newGroupIds() == null || response.summary() == null) {
            log.error("분석 서버 응답에 matches, newGroupIds, summary 중 없는 값이 있음");
            throw new BusinessException(ErrorCode.INTERNAL_ERROR);
        }
        return response;
    }

    /**
     * 모집글(버전) 하나의 리뷰를 문제별로 묶고 그룹마다 이슈 초안을 받음(POST /v1/analyses).
     * 응답까지 몇 분 걸릴 수 있어 비동기로만 부름. groups가 없으면 계약과 다른 응답이라 500
     */
    public AnalysisResponse analyze(AnalysisRequest request) {
        AnalysisResponse response = post(reviewAnalysisClient, "/v1/analyses", request, AnalysisResponse.class);
        if (response.groups() == null) {
            log.error("분석 서버 응답에 groups가 없음");
            throw new BusinessException(ErrorCode.INTERNAL_ERROR);
        }
        return response;
    }

    private <T> T post(RestClient client, String path, Object body, Class<T> responseType) {
        if (internalToken == null || internalToken.isBlank()) {
            log.error("분석 서버 내부 토큰(ANALYSIS_INTERNAL_TOKEN)이 설정되지 않음");
            throw new BusinessException(ErrorCode.AI_UNAVAILABLE);
        }
        String requestId = UUID.randomUUID().toString();
        long startedAt = System.nanoTime();
        T response;
        try {
            response = client.post()
                    .uri(path)
                    .header(TOKEN_HEADER, internalToken)
                    .header(REQUEST_ID_HEADER, requestId)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(responseType);
        } catch (RestClientResponseException e) {
            int status = e.getStatusCode().value();
            if (e.getStatusCode().is5xxServerError()) {
                log.warn("분석 서버 오류 path={} status={} requestId={}", path, status, requestId);
                throw new BusinessException(ErrorCode.AI_UNAVAILABLE);
            }
            // 분석 서버의 오류 본문에는 리뷰 원문이 없고 위치와 사유만 있음
            log.error("분석 서버가 요청을 거절함 path={} status={} requestId={} body={}",
                    path, status, requestId, e.getResponseBodyAsString());
            throw new BusinessException(ErrorCode.INTERNAL_ERROR);
        } catch (ResourceAccessException e) {
            log.warn("분석 서버에 연결하지 못했거나 응답 대기 시간을 넘김 path={} requestId={}", path, requestId, e);
            throw new BusinessException(ErrorCode.AI_UNAVAILABLE);
        } catch (RestClientException e) {
            // 200이지만 JSON이 아니거나 모양이 다름. 주소를 잘못 넣었거나 계약이 어긋남
            log.error("분석 서버 응답을 읽지 못함 path={} requestId={}", path, requestId, e);
            throw new BusinessException(ErrorCode.INTERNAL_ERROR);
        }
        if (response == null) {
            log.error("분석 서버가 빈 응답을 줌 path={} requestId={}", path, requestId);
            throw new BusinessException(ErrorCode.INTERNAL_ERROR);
        }
        // 성공도 요청 ID를 남겨 분석 서버 로그와 이어 봄
        log.info("분석 서버 응답 path={} requestId={} elapsedMs={}",
                path, requestId, (System.nanoTime() - startedAt) / 1_000_000);
        return response;
    }

    // 코드 포인트 기준으로 max자까지 자름. 분석 서버도 코드 포인트로 세므로 이모지가 반으로 잘리지 않음
    public static String cut(String text, int max) {
        if (text == null || text.codePointCount(0, text.length()) <= max) return text;
        return text.substring(0, text.offsetByCodePoints(0, max));
    }

    /**
     * 후속 질문 요청(FollowupRequest). 계약에 없는 필드를 더하면 분석 서버가 422로 거부함
     */
    public record FollowupRequest(Context context, FeedbackItem feedback) {}

    /**
     * @param version 모집글 버전. 1부터
     */
    public record Context(
            String projectTitle,
            String projectDescription,
            String recruitmentTitle,
            String recruitmentDescription,
            int version
    ) {}

    /**
     * @param userId        리뷰를 쓴 테스터
     * @param testItemTitle 리뷰 대상 테스트 항목. 기타 의견은 null
     */
    public record FeedbackItem(
            Long feedbackId,
            Long userId,
            String content,
            String testItemTitle
    ) {}

    record FollowupResponse(List<String> questions) {}

    /**
     * 버전 비교 요청(ComparisonRequest). previous.version이 current.version보다 작아야 함
     */
    public record ComparisonRequest(VersionGroups previous, VersionGroups current) {}

    /**
     * @param version 모집글 버전
     * @param groups  그 버전의 분석 그룹(cluster_groups 행)
     */
    public record VersionGroups(int version, List<GroupItem> groups) {}

    /**
     * @param category        BUG, UX, REQUEST, PRAISE, UNCLASSIFIED
     * @param improvementRank 심각도 1 = 치명 ~ 4 = 사소. 칭찬·미분류는 null
     * @param sample          대표 리뷰 내용. 대표 리뷰가 없으면 null
     */
    public record GroupItem(
            Long groupId,
            String name,
            String category,
            Integer improvementRank,
            String sample
    ) {}

    /**
     * 버전 비교 결과. 분석 서버가 주는 notReportedGroupIds는 저장하지 않고 그룹 코드로 계산하므로 읽지 않음
     *
     * @param matches     같은 문제로 짝지은 그룹
     * @param newGroupIds 이번 버전에 새로 나타난 현재 버전 그룹
     * @param summary     변화 요약 문장
     */
    public record ComparisonResponse(List<GroupMatch> matches, List<Long> newGroupIds, String summary) {}

    public record GroupMatch(Long currentGroupId, Long previousGroupId) {}

    /**
     * 리뷰 묶기 요청(AnalysisRequest). feedbacks는 중복 없이 1~1,000개
     */
    public record AnalysisRequest(Context context, List<FeedbackItem> feedbacks) {}

    /**
     * 리뷰 묶기 결과
     *
     * @param analyticsSummary 리뷰 전체를 한 문장으로 요약한 분석. 없으면 null
     * @param praiseSummary 칭찬 리뷰 한 줄 요약. 칭찬이 없으면 null
     */
    public record AnalysisResponse(List<AnalysisGroup> groups, String analyticsSummary, String praiseSummary) {}

    /**
     * 묶은 그룹 하나. 응답 안에서만 쓰는 임시 key는 저장하지 않아 읽지 않음.
     * 리뷰 하나가 여러 그룹의 feedbackIds에 들어 있을 수 있음
     *
     * @param category                 BUG, UX, REQUEST, PRAISE, UNCLASSIFIED
     * @param improvementRank          심각도 1 = 치명 ~ 4 = 사소. 칭찬·미분류는 null
     * @param representativeFeedbackId 그룹을 대표하는 리뷰
     * @param gitIssueContent          GitHub 이슈 초안 본문(마크다운). 칭찬·미분류는 null
     */
    public record AnalysisGroup(
            String name,
            String category,
            Integer improvementRank,
            Long representativeFeedbackId,
            List<Long> feedbackIds,
            String gitIssueTitle,
            String gitIssueContent
    ) {}
}
