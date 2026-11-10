package com.testmoa.backend.global.client.pg;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.testmoa.backend.entity.enums.PaymentProvider;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

/**
 * 카카오페이 단건 결제(open-api.kakaopay.com). 테스트는 개발용 Secret key와 테스트 CID(TC0ONETIME)를 쓴다.
 * 인증은 `Authorization: SECRET_KEY {키}`다. 키는 로그와 응답에 남기지 않는다
 */
@Slf4j
@Component
public class KakaoPayGateway implements PaymentGateway {

    private final PaymentProperties.Kakaopay properties;
    private final RestClient restClient;

    @Autowired
    public KakaoPayGateway(PaymentProperties properties) {
        this(properties, PaymentRestClients.build(properties.kakaopay().baseUrl()));
    }

    /** 테스트가 가짜 서버에 연결한 RestClient를 넣는 용도 */
    KakaoPayGateway(PaymentProperties properties, RestClient restClient) {
        this.properties = properties.kakaopay();
        this.restClient = restClient;
    }

    @Override
    public PaymentProvider provider() {
        return PaymentProvider.KAKAO_PAY;
    }

    @Override
    public boolean available() {
        return properties.configured();
    }

    @Override
    public Ready ready(ReadyCommand command) {
        ReadyBody body = new ReadyBody(
                properties.cid(), command.orderId(), String.valueOf(command.userId()), command.orderName(), 1,
                command.amount(), 0, command.successUrl(), command.cancelUrl(), command.failUrl());
        try {
            ReadyResponse response = restClient.post()
                    .uri("/online/v1/payment/ready")
                    .header("Authorization", "SECRET_KEY " + properties.secretKey())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(ReadyResponse.class);
            if (response == null || response.tid() == null || response.pcUrl() == null) {
                log.error("카카오페이 준비 응답에 tid 또는 결제창 주소가 없음");
                throw new BusinessException(ErrorCode.PG_UNAVAILABLE);
            }
            return new Ready(response.tid(), response.pcUrl(), response.mobileUrl(), null, null);
        } catch (RestClientResponseException e) {
            log.error("카카오페이 결제 준비 거절 status={} body={}", e.getStatusCode().value(), e.getResponseBodyAsString());
            throw new BusinessException(ErrorCode.PG_UNAVAILABLE);
        } catch (RestClientException e) {
            log.error("카카오페이 결제 준비 연결 실패: {}", e.getMessage());
            throw new BusinessException(ErrorCode.PG_UNAVAILABLE);
        }
    }

    @Override
    public Approved approve(ApproveCommand command) {
        ApproveBody body = new ApproveBody(
                properties.cid(), command.pgTransactionId(), command.orderId(), String.valueOf(command.userId()), command.pgToken());
        try {
            ApproveResponse response = restClient.post()
                    .uri("/online/v1/payment/approve")
                    .header("Authorization", "SECRET_KEY " + properties.secretKey())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(ApproveResponse.class);
            if (response == null || response.tid() == null) {
                log.error("카카오페이 승인 응답에 tid가 없음");
                throw new BusinessException(ErrorCode.PG_APPROVE_FAILED);
            }
            return new Approved(response.tid());
        } catch (RestClientResponseException e) {
            log.error("카카오페이 결제 승인 거절 status={} body={}", e.getStatusCode().value(), e.getResponseBodyAsString());
            throw new BusinessException(ErrorCode.PG_APPROVE_FAILED);
        } catch (RestClientException e) {
            log.error("카카오페이 결제 승인 연결 실패: {}", e.getMessage());
            throw new BusinessException(ErrorCode.PG_APPROVE_FAILED);
        }
    }

    record ReadyBody(
            String cid,
            @JsonProperty("partner_order_id") String partnerOrderId,
            @JsonProperty("partner_user_id") String partnerUserId,
            @JsonProperty("item_name") String itemName,
            int quantity,
            @JsonProperty("total_amount") int totalAmount,
            @JsonProperty("tax_free_amount") int taxFreeAmount,
            @JsonProperty("approval_url") String approvalUrl,
            @JsonProperty("cancel_url") String cancelUrl,
            @JsonProperty("fail_url") String failUrl
    ) {
    }

    record ReadyResponse(
            String tid,
            @JsonProperty("next_redirect_pc_url") String pcUrl,
            @JsonProperty("next_redirect_mobile_url") String mobileUrl
    ) {
    }

    record ApproveBody(
            String cid,
            String tid,
            @JsonProperty("partner_order_id") String partnerOrderId,
            @JsonProperty("partner_user_id") String partnerUserId,
            @JsonProperty("pg_token") String pgToken
    ) {
    }

    @com.fasterxml.jackson.annotation.JsonIgnoreProperties(ignoreUnknown = true)
    record ApproveResponse(String tid) {
    }
}
