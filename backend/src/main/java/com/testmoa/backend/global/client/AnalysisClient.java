package com.testmoa.backend.global.client;

import com.testmoa.backend.domain.entity.Feedback;
import com.testmoa.backend.domain.entity.Project;
import com.testmoa.backend.domain.entity.Recruitment;
import com.testmoa.backend.domain.entity.TestItem;
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
    static final int TITLE_MAX = 200;
    static final int DESCRIPTION_MAX = 5000;
    static final int CONTENT_MAX = 4000;

    private final RestClient restClient;
    private final String internalToken;

    public AnalysisClient(RestClient.Builder builder, String internalToken) {
        this.restClient = builder.build();
        this.internalToken = internalToken;
    }

    /**
     * 리뷰 하나로 테스터에게 보낼 후속 질문을 추천받음(POST /v1/followup-questions)
     */
    public List<String> suggestFollowupQuestions(FollowupRequest request) {
        FollowupResponse response = post("/v1/followup-questions", request, FollowupResponse.class);
        if (response.questions() == null) {
            log.error("분석 서버 응답에 questions가 없음");
            throw new BusinessException(ErrorCode.INTERNAL_ERROR);
        }
        return response.questions();
    }

    private <T> T post(String path, Object body, Class<T> responseType) {
        if (internalToken == null || internalToken.isBlank()) {
            log.error("분석 서버 내부 토큰(ANALYSIS_INTERNAL_TOKEN)이 설정되지 않음");
            throw new BusinessException(ErrorCode.AI_UNAVAILABLE);
        }
        String requestId = UUID.randomUUID().toString();
        long startedAt = System.nanoTime();
        T response;
        try {
            response = restClient.post()
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
    static String cut(String text, int max) {
        if (text == null || text.codePointCount(0, text.length()) <= max) return text;
        return text.substring(0, text.offsetByCodePoints(0, max));
    }

    /**
     * 후속 질문 요청(FollowupRequest). 계약에 없는 필드를 더하면 분석 서버가 422로 거부함
     */
    public record FollowupRequest(Context context, FeedbackItem feedback) {
        // 리뷰와 그 모집글·프로젝트로 요청을 만듦. 분석 서버의 글자 수에 맞춰 자름
        public static FollowupRequest from(Feedback feedback) {
            Recruitment recruitment = feedback.getRegister().getRecruitment();
            Project project = recruitment.getProject();
            TestItem testItem = feedback.getTestItem();

            return new FollowupRequest(
                    new Context(
                            cut(project.getTitle(), TITLE_MAX),
                            cut(project.getDescription(), DESCRIPTION_MAX),
                            cut(recruitment.getTitle(), TITLE_MAX),
                            cut(recruitment.getDescription(), DESCRIPTION_MAX),
                            recruitment.getVersion()),
                    new FeedbackItem(
                            feedback.getId(),
                            feedback.getRegister().getUser().getId(),
                            cut(feedback.getContent(), CONTENT_MAX),
                            testItem == null ? null : cut(testItem.getTitle(), TITLE_MAX)));
        }
    }

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
}
