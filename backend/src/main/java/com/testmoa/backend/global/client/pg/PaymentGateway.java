package com.testmoa.backend.global.client.pg;

import com.testmoa.backend.entity.enums.PaymentProvider;

/** 결제 대행사(PG) 하나. 준비와 승인을 부른다. 테스트는 이 클래스를 가짜로 바꿔 끼운다 */
public interface PaymentGateway {

    PaymentProvider provider();

    /** 키가 모두 설정돼 있어 쓸 수 있는지 */
    boolean available();

    /**
     * 결제 준비. 카카오페이는 서버가 PG에 준비를 요청하고, 토스는 브라우저가 결제창을 열 값만 만든다.
     * 연결하지 못하거나 거절되면 503 PG_UNAVAILABLE
     */
    Ready ready(ReadyCommand command);

    /** 결제 승인. 거절되거나 연결하지 못하면 502 PG_APPROVE_FAILED. 성공하면 거래 식별자를 돌려준다 */
    Approved approve(ApproveCommand command);

    /**
     * 승인한 결제를 전액 취소한다(#274). 거절되거나 연결하지 못하면 502 PG_CANCEL_FAILED.
     * 이미 취소된 결제를 다시 취소하면 토스는 성공으로 보고(ALREADY_CANCELED_PAYMENT), 카카오페이는 취소 가능 금액
     * 초과(-710)로 거절하므로 실패로 본다. 보상 취소는 한 번만 부르고 재시도하지 않는다
     */
    void cancel(CancelCommand command);

    /**
     * @param orderId     우리 주문번호
     * @param userId      회원 id(카카오페이 partner_user_id, 토스 customerKey 계산)
     * @param orderName   결제창에 보일 이름
     * @param amount      서버가 정한 금액
     * @param successUrl  결제 승인 뒤 돌아올 주소(토스는 PG가 쿼리를 붙인다, 카카오페이는 pg_token을 붙인다)
     * @param cancelUrl   취소 뒤 돌아올 주소
     * @param failUrl     실패 뒤 돌아올 주소
     */
    record ReadyCommand(String orderId, Long userId, String orderName, int amount,
                        String successUrl, String cancelUrl, String failUrl) {
    }

    /** 카카오페이는 tid와 결제창 주소, 토스는 결제창을 여는 키 값을 채운다. 쓰지 않는 값은 null이다 */
    record Ready(String pgTransactionId, String redirectUrl, String mobileRedirectUrl, String clientKey, String customerKey) {
    }

    /**
     * @param pgTransactionId 카카오페이는 준비 때 받은 tid, 토스는 쓰지 않는다
     * @param pgToken         카카오페이 승인 토큰
     * @param paymentKey      토스가 돌려준 paymentKey
     */
    record ApproveCommand(String orderId, Long userId, int amount, String pgTransactionId, String pgToken, String paymentKey) {
    }

    /**
     * @param orderId         우리 주문번호(멱등 키에 쓴다)
     * @param amount          취소할 금액(전액)
     * @param pgTransactionId 승인한 결제의 거래 식별자(카카오페이 tid, 토스 paymentKey)
     * @param reason          취소 사유
     */
    record CancelCommand(String orderId, int amount, String pgTransactionId, String reason) {
    }

    /** @param pgTransactionId 결제 대행사의 거래 식별자(카카오페이 tid, 토스 paymentKey) */
    record Approved(String pgTransactionId) {
    }
}
