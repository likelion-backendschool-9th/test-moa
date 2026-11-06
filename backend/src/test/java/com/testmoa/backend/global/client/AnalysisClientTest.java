package com.testmoa.backend.global.client;

import com.testmoa.backend.global.client.AnalysisClient.Context;
import com.testmoa.backend.global.client.AnalysisClient.FeedbackItem;
import com.testmoa.backend.global.client.AnalysisClient.FollowupRequest;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.json.JsonCompareMode;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/**
 * 분석 서버 호출. 분석 서버는 MockRestServiceServer로 흉내 냄
 */
class AnalysisClientTest {
    private static final String BASE_URL = "http://analysis.test";
    private static final String URL = BASE_URL + "/v1/followup-questions";
    private static final String TOKEN = "t".repeat(32);
    private static final MediaType PROBLEM_JSON = MediaType.valueOf("application/problem+json");

    private final RestClient.Builder builder = RestClient.builder().baseUrl(BASE_URL);
    private final MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
    private final AnalysisClient client = new AnalysisClient(builder, TOKEN);

    private FollowupRequest request() {
        return new FollowupRequest(
                new Context("북로그", "독서 기록 앱", "1차 베타 테스트", "기록 화면을 봐 주세요", 1),
                new FeedbackItem(10L, 20L, "사진을 여러 장 올리면 순서가 바뀌어요", "사진 올리기"));
    }

    private static void assertErrorCode(ThrowingCallable call, ErrorCode code) {
        assertThatThrownBy(call).isInstanceOfSatisfying(BusinessException.class,
                e -> assertThat(e.getErrorCode()).isEqualTo(code));
    }

    @Test
    @DisplayName("#109-S1 계약 모양의 camelCase JSON과 내부 토큰·요청 ID 헤더로 보내고 질문을 받는다")
    void 질문을_받는다() {
        server.expect(requestTo(URL))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("X-Internal-Token", TOKEN))
                .andExpect(header("X-Request-ID", matchesPattern("[0-9a-f-]{36}")))
                .andExpect(content().json("""
                        {
                          "context": {
                            "projectTitle": "북로그",
                            "projectDescription": "독서 기록 앱",
                            "recruitmentTitle": "1차 베타 테스트",
                            "recruitmentDescription": "기록 화면을 봐 주세요",
                            "version": 1
                          },
                          "feedback": {
                            "feedbackId": 10,
                            "userId": 20,
                            "content": "사진을 여러 장 올리면 순서가 바뀌어요",
                            "testItemTitle": "사진 올리기"
                          }
                        }
                        """, JsonCompareMode.STRICT))
                .andRespond(withSuccess("""
                        {"questions": ["어떤 순서로 올리셨나요?", "몇 장을 올리셨나요?", "바뀐 순서는 어땠나요?"]}
                        """, MediaType.APPLICATION_JSON));

        assertThat(client.suggestFollowupQuestions(request()))
                .containsExactly("어떤 순서로 올리셨나요?", "몇 장을 올리셨나요?", "바뀐 순서는 어땠나요?");
        server.verify();
    }

    @Test
    @DisplayName("#109-S3 분석 서버의 글자 수에 맞춰 코드 포인트 단위로 자른다")
    void 글자_수에_맞춰_자른다() {
        assertThat(AnalysisClient.cut("가".repeat(5001), AnalysisClient.DESCRIPTION_MAX)).isEqualTo("가".repeat(5000));
        assertThat(AnalysisClient.cut("가".repeat(200), AnalysisClient.TITLE_MAX)).isEqualTo("가".repeat(200));
        // 이모지는 자바 문자열에서 2칸이지만 한 글자로 셈
        assertThat(AnalysisClient.cut("😀".repeat(201), AnalysisClient.TITLE_MAX)).isEqualTo("😀".repeat(200));
        assertThat(AnalysisClient.cut(null, AnalysisClient.TITLE_MAX)).isNull();
    }

    @Test
    @DisplayName("#109-S10 분석 서버가 5xx를 주면 503 AI_UNAVAILABLE")
    void 분석_서버_오류() {
        server.expect(requestTo(URL)).andRespond(withStatus(HttpStatus.BAD_GATEWAY).contentType(PROBLEM_JSON).body("""
                {"type": "llm-upstream-error", "title": "LLM upstream failure", "status": 502, "detail": "timeout"}
                """));

        assertErrorCode(() -> client.suggestFollowupQuestions(request()), ErrorCode.AI_UNAVAILABLE);
    }

    @Test
    @DisplayName("#109-S10 분석 서버에 연결하지 못하거나 응답 대기 시간을 넘기면 503 AI_UNAVAILABLE")
    void 연결_실패() {
        server.expect(requestTo(URL)).andRespond(withException(new IOException("Connection refused")));

        assertErrorCode(() -> client.suggestFollowupQuestions(request()), ErrorCode.AI_UNAVAILABLE);
    }

    @Test
    @DisplayName("#109-S11 분석 서버가 요청을 거절하면(422·401) 500 INTERNAL_ERROR")
    void 요청_거절() {
        server.expect(requestTo(URL)).andRespond(withStatus(HttpStatus.UNPROCESSABLE_CONTENT).contentType(PROBLEM_JSON).body("""
                {"type": "validation-error", "title": "Invalid request", "status": 422, "detail": []}
                """));
        server.expect(requestTo(URL)).andRespond(withStatus(HttpStatus.UNAUTHORIZED));

        assertErrorCode(() -> client.suggestFollowupQuestions(request()), ErrorCode.INTERNAL_ERROR);
        assertErrorCode(() -> client.suggestFollowupQuestions(request()), ErrorCode.INTERNAL_ERROR);
    }

    @Test
    @DisplayName("#109-S11 200이지만 응답이 계약과 다르면(JSON이 아님, questions 없음) 500 INTERNAL_ERROR")
    void 계약과_다른_응답() {
        // 주소를 잘못 넣어 다른 서버의 HTML을 받은 경우
        server.expect(requestTo(URL)).andRespond(withSuccess("<html></html>", MediaType.TEXT_HTML));
        server.expect(requestTo(URL)).andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));

        assertErrorCode(() -> client.suggestFollowupQuestions(request()), ErrorCode.INTERNAL_ERROR);
        assertErrorCode(() -> client.suggestFollowupQuestions(request()), ErrorCode.INTERNAL_ERROR);
    }

    @Test
    @DisplayName("#109-S12 내부 토큰이 비어 있으면 분석 서버를 부르지 않고 503 AI_UNAVAILABLE")
    void 토큰_없음() {
        RestClient.Builder noTokenBuilder = RestClient.builder().baseUrl(BASE_URL);
        MockRestServiceServer noTokenServer = MockRestServiceServer.bindTo(noTokenBuilder).build();
        AnalysisClient noToken = new AnalysisClient(noTokenBuilder, "");

        assertErrorCode(() -> noToken.suggestFollowupQuestions(request()), ErrorCode.AI_UNAVAILABLE);
        noTokenServer.verify();
    }
}
