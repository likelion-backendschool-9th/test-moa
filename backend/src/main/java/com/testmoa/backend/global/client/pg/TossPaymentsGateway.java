package com.testmoa.backend.global.client.pg;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.testmoa.backend.entity.enums.PaymentProvider;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Map;

/**
 * 토스페이먼츠 결제. 결제창은 브라우저의 토스 SDK가 열고, 서버는 결제 승인(POST /v1/payments/confirm)만 부른다.
 * 인증은 `Authorization: Basic base64(시크릿키:)`다(콜론이 있어야 한다). 시크릿 키는 응답과 로그에 내보내지 않는다
 */
@Slf4j
@Component
public class TossPaymentsGateway implements PaymentGateway {

    private final PaymentProperties.Tosspayments properties;
    private final RestClient restClient;
    private final String customerKeySecret;

    @Autowired
    public TossPaymentsGateway(PaymentProperties properties, @Value("${jwt.secret}") String jwtSecret) {
        this(properties, PaymentRestClients.build(properties.tosspayments().baseUrl()), jwtSecret);
    }

    /** 테스트가 가짜 서버에 연결한 RestClient를 넣는 용도 */
    TossPaymentsGateway(PaymentProperties properties, RestClient restClient, String jwtSecret) {
        this.properties = properties.tosspayments();
        this.restClient = restClient;
        this.customerKeySecret = jwtSecret;
    }

    @Override
    public PaymentProvider provider() {
        return PaymentProvider.TOSS_PAY;
    }

    @Override
    public boolean available() {
        return properties.configured();
    }

    /** 토스는 서버가 PG를 부르지 않는다. 브라우저가 결제창을 열 키와 회원 키만 준다 */
    @Override
    public Ready ready(ReadyCommand command) {
        return new Ready(null, null, null, properties.clientKey(), customerKey(command.userId()));
    }

    @Override
    public Approved approve(ApproveCommand command) {
        try {
            ConfirmResponse response = restClient.post()
                    .uri("/v1/payments/confirm")
                    .header("Authorization", basicAuth())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("paymentKey", command.paymentKey(), "orderId", command.orderId(), "amount", command.amount()))
                    .retrieve()
                    .body(ConfirmResponse.class);
            if (response == null || !"DONE".equals(response.status())) {
                log.error("토스 승인 응답의 상태가 DONE이 아님 status={}", response == null ? null : response.status());
                throw new BusinessException(ErrorCode.PG_APPROVE_FAILED);
            }
            return new Approved(command.paymentKey());
        } catch (RestClientResponseException e) {
            log.error("토스 결제 승인 거절 status={} body={}", e.getStatusCode().value(), e.getResponseBodyAsString());
            throw new BusinessException(ErrorCode.PG_APPROVE_FAILED);
        } catch (RestClientException e) {
            log.error("토스 결제 승인 연결 실패: {}", e.getMessage());
            throw new BusinessException(ErrorCode.PG_APPROVE_FAILED);
        }
    }

    private String basicAuth() {
        return "Basic " + Base64.getEncoder().encodeToString((properties.secretKey() + ":").getBytes(StandardCharsets.UTF_8));
    }

    /**
     * 회원마다 정해진 키. 토스 규칙(22~50자, 영문·숫자·-_=.@, 특수문자 1개 이상)에 맞고 이메일 같은 개인정보를 담지 않는다.
     * 서명 키(jwt.secret)로 계산해서 회원 id만으로는 알아낼 수 없다
     */
    String customerKey(Long userId) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(customerKeySecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] digest = mac.doFinal(("toss-customer:" + userId).getBytes(StandardCharsets.UTF_8));
            return "moa-" + HexFormat.of().formatHex(digest, 0, 16);
        } catch (java.security.GeneralSecurityException e) {
            throw new IllegalStateException("customerKey를 만들지 못함", e);
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record ConfirmResponse(String status) {
    }
}
