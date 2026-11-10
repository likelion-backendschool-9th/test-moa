package com.testmoa.backend.global.client.pg;

import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/**
 * 결제 대행사 게이트웨이가 PG에 보내는 요청과 응답·오류 처리(#249). 가짜 서버로 확인하고 실제 PG는 부르지 않는다.
 * 요청의 키 값은 가짜 값이고, 응답과 예외에 키가 섞여 나가지 않는지도 본다.
 */
class PaymentGatewayTest {

    private static final PaymentProperties PROPERTIES = new PaymentProperties(
            "http://localhost:3005",
            new PaymentProperties.Kakaopay("https://open-api.kakaopay.com", "dev-secret", "TC0ONETIME"),
            new PaymentProperties.Tosspayments("https://api.tosspayments.com", "test_ck_fake", "test_sk_fake"));

    private static final PaymentGateway.ReadyCommand READY = new PaymentGateway.ReadyCommand(
            "MOAorder1", 7L, "구독-PRO", 10000,
            "http://localhost:3005/my/subscription/checkout/result?orderId=MOAorder1",
            "http://localhost:3005/my/subscription/checkout?pg=cancel",
            "http://localhost:3005/my/subscription/checkout?pg=fail");

    private record Kakao(KakaoPayGateway gateway, MockRestServiceServer server) {
    }

    private record Toss(TossPaymentsGateway gateway, MockRestServiceServer server) {
    }

    private static Kakao kakao(PaymentProperties properties) {
        RestClient.Builder builder = RestClient.builder().baseUrl(properties.kakaopay().baseUrl());
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        return new Kakao(new KakaoPayGateway(properties, builder.build()), server);
    }

    private static Toss toss(PaymentProperties properties) {
        RestClient.Builder builder = RestClient.builder().baseUrl(properties.tosspayments().baseUrl());
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        return new Toss(new TossPaymentsGateway(properties, builder.build(), "jwt-secret-for-test-0123456789"), server);
    }

    @Test
    @DisplayName("#249-S1 카카오페이 준비 요청은 SECRET_KEY 헤더와 테스트 CID, 서버가 정한 금액·주소를 보낸다")
    void kakaoReadySendsExpectedRequest() {
        Kakao kakao = kakao(PROPERTIES);
        kakao.server().expect(requestTo("https://open-api.kakaopay.com/online/v1/payment/ready"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "SECRET_KEY dev-secret"))
                .andExpect(jsonPath("$.cid").value("TC0ONETIME"))
                .andExpect(jsonPath("$.partner_order_id").value("MOAorder1"))
                .andExpect(jsonPath("$.partner_user_id").value("7"))
                .andExpect(jsonPath("$.item_name").value("구독-PRO"))
                .andExpect(jsonPath("$.quantity").value(1))
                .andExpect(jsonPath("$.total_amount").value(10000))
                .andExpect(jsonPath("$.tax_free_amount").value(0))
                .andExpect(jsonPath("$.approval_url").value(READY.successUrl()))
                .andExpect(jsonPath("$.cancel_url").value(READY.cancelUrl()))
                .andExpect(jsonPath("$.fail_url").value(READY.failUrl()))
                .andRespond(withSuccess("""
                        {"tid":"T123","next_redirect_pc_url":"https://pc.example/pay","next_redirect_mobile_url":"https://m.example/pay",
                         "next_redirect_app_url":"app","android_app_scheme":"a","ios_app_scheme":"i","created_at":"2026-11-10T15:35:49","tms_result":false}
                        """, MediaType.APPLICATION_JSON));

        PaymentGateway.Ready ready = kakao.gateway().ready(READY);

        assertEquals("T123", ready.pgTransactionId());
        assertEquals("https://pc.example/pay", ready.redirectUrl());
        assertEquals("https://m.example/pay", ready.mobileRedirectUrl());
        assertNull(ready.clientKey());
        kakao.server().verify();
    }

    @Test
    @DisplayName("#249-S1 카카오페이가 준비를 거절하면 503 PG_UNAVAILABLE이고 키는 예외에 담기지 않는다")
    void kakaoReadyFailure() {
        Kakao kakao = kakao(PROPERTIES);
        kakao.server().expect(requestTo("https://open-api.kakaopay.com/online/v1/payment/ready"))
                .andRespond(withStatus(HttpStatus.BAD_REQUEST).contentType(MediaType.APPLICATION_JSON)
                        .body("{\"error_code\":-400,\"error_message\":\"도메인 검증 불가\"}"));

        BusinessException e = assertThrows(BusinessException.class, () -> kakao.gateway().ready(READY));

        assertEquals(ErrorCode.PG_UNAVAILABLE, e.getErrorCode());
        assertTrue(!String.valueOf(e.getMessage()).contains("dev-secret"));
    }

    @Test
    @DisplayName("#249-S5 카카오페이 승인 요청은 준비 때 받은 tid와 pg_token을 보내고 tid를 돌려받는다")
    void kakaoApprove() {
        Kakao kakao = kakao(PROPERTIES);
        kakao.server().expect(requestTo("https://open-api.kakaopay.com/online/v1/payment/approve"))
                .andExpect(header("Authorization", "SECRET_KEY dev-secret"))
                .andExpect(jsonPath("$.cid").value("TC0ONETIME"))
                .andExpect(jsonPath("$.tid").value("T123"))
                .andExpect(jsonPath("$.partner_order_id").value("MOAorder1"))
                .andExpect(jsonPath("$.partner_user_id").value("7"))
                .andExpect(jsonPath("$.pg_token").value("pg-token-1"))
                .andRespond(withSuccess("{\"aid\":\"A1\",\"tid\":\"T123\",\"amount\":{\"total\":10000}}", MediaType.APPLICATION_JSON));

        PaymentGateway.Approved approved = kakao.gateway().approve(
                new PaymentGateway.ApproveCommand("MOAorder1", 7L, 10000, "T123", "pg-token-1", null));

        assertEquals("T123", approved.pgTransactionId());
        kakao.server().verify();
    }

    @Test
    @DisplayName("#249-S7 카카오페이가 승인을 거절하면 502 PG_APPROVE_FAILED")
    void kakaoApproveFailure() {
        Kakao kakao = kakao(PROPERTIES);
        kakao.server().expect(requestTo("https://open-api.kakaopay.com/online/v1/payment/approve"))
                .andRespond(withStatus(HttpStatus.BAD_REQUEST).contentType(MediaType.APPLICATION_JSON)
                        .body("{\"error_code\":-780,\"error_message\":\"승인 실패\"}"));

        BusinessException e = assertThrows(BusinessException.class, () -> kakao.gateway().approve(
                new PaymentGateway.ApproveCommand("MOAorder1", 7L, 10000, "T123", "pg-token-1", null)));

        assertEquals(ErrorCode.PG_APPROVE_FAILED, e.getErrorCode());
    }

    @Test
    @DisplayName("#249-S4 키가 비어 있으면 그 결제 대행사만 쓸 수 없다")
    void availability() {
        PaymentProperties noKakao = new PaymentProperties("http://localhost:3005",
                new PaymentProperties.Kakaopay("https://open-api.kakaopay.com", "", "TC0ONETIME"),
                new PaymentProperties.Tosspayments("https://api.tosspayments.com", "test_ck_fake", " "));

        assertTrue(!kakao(noKakao).gateway().available());
        assertTrue(!toss(noKakao).gateway().available());
        assertTrue(kakao(PROPERTIES).gateway().available());
        assertTrue(toss(PROPERTIES).gateway().available());
    }

    @Test
    @DisplayName("#249-S2 토스 준비는 PG를 부르지 않고 클라이언트 키와 회원 키만 준다(시크릿 키는 없다)")
    void tossReadyDoesNotCallPg() {
        Toss toss = toss(PROPERTIES);

        PaymentGateway.Ready ready = toss.gateway().ready(READY);

        assertEquals("test_ck_fake", ready.clientKey());
        assertTrue(ready.customerKey().startsWith("moa-"));
        assertNull(ready.pgTransactionId());
        assertNull(ready.redirectUrl());
        assertTrue(!ready.toString().contains("test_sk_fake"));
        toss.server().verify();
    }

    @Test
    @DisplayName("#249-S2 토스 회원 키는 회원마다 같고 서로 다르며 토스 규칙(22~50자, 특수문자 포함)에 맞는다")
    void tossCustomerKey() {
        TossPaymentsGateway gateway = toss(PROPERTIES).gateway();

        String first = gateway.customerKey(7L);

        assertEquals(first, gateway.customerKey(7L));
        assertNotEquals(first, gateway.customerKey(8L));
        assertTrue(first.length() >= 22 && first.length() <= 50, first);
        assertTrue(first.matches("[A-Za-z0-9\\-_=.@]+"), first);
        assertTrue(first.contains("-"));
        assertTrue(!first.contains("7") || first.length() > 5);
        // 서명 키가 다르면 같은 회원도 다른 키가 나온다(회원 id만으로는 계산할 수 없다)
        Toss other = new Toss(new TossPaymentsGateway(PROPERTIES, RestClient.create(), "another-secret-0123456789abcdef"), null);
        assertNotEquals(first, other.gateway().customerKey(7L));
    }

    @Test
    @DisplayName("#249-S5 토스 승인은 Basic(시크릿키:) 인증으로 paymentKey·orderId·서버 금액을 보내고 DONE이면 paymentKey를 돌려준다")
    void tossConfirm() {
        Toss toss = toss(PROPERTIES);
        String basic = "Basic " + Base64.getEncoder().encodeToString("test_sk_fake:".getBytes(StandardCharsets.UTF_8));
        toss.server().expect(requestTo("https://api.tosspayments.com/v1/payments/confirm"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", basic))
                .andExpect(jsonPath("$.paymentKey").value("PK1"))
                .andExpect(jsonPath("$.orderId").value("MOAorder1"))
                .andExpect(jsonPath("$.amount").value(10000))
                .andRespond(withSuccess("{\"status\":\"DONE\",\"paymentKey\":\"PK1\",\"orderId\":\"MOAorder1\"}", MediaType.APPLICATION_JSON));

        PaymentGateway.Approved approved = toss.gateway().approve(
                new PaymentGateway.ApproveCommand("MOAorder1", 7L, 10000, null, null, "PK1"));

        assertEquals("PK1", approved.pgTransactionId());
        toss.server().verify();
    }

    @Test
    @DisplayName("#249-S7 토스가 승인을 거절하거나 DONE이 아니면 502 PG_APPROVE_FAILED")
    void tossConfirmFailure() {
        Toss rejected = toss(PROPERTIES);
        rejected.server().expect(requestTo("https://api.tosspayments.com/v1/payments/confirm"))
                .andRespond(withStatus(HttpStatus.BAD_REQUEST).contentType(MediaType.APPLICATION_JSON)
                        .body("{\"code\":\"INVALID_REQUEST\",\"message\":\"잘못된 요청\"}"));
        BusinessException e = assertThrows(BusinessException.class, () -> rejected.gateway().approve(
                new PaymentGateway.ApproveCommand("MOAorder1", 7L, 10000, null, null, "PK1")));
        assertEquals(ErrorCode.PG_APPROVE_FAILED, e.getErrorCode());

        Toss notDone = toss(PROPERTIES);
        notDone.server().expect(requestTo("https://api.tosspayments.com/v1/payments/confirm"))
                .andRespond(withSuccess("{\"status\":\"IN_PROGRESS\"}", MediaType.APPLICATION_JSON));
        BusinessException e2 = assertThrows(BusinessException.class, () -> notDone.gateway().approve(
                new PaymentGateway.ApproveCommand("MOAorder1", 7L, 10000, null, null, "PK1")));
        assertEquals(ErrorCode.PG_APPROVE_FAILED, e2.getErrorCode());
    }
}
