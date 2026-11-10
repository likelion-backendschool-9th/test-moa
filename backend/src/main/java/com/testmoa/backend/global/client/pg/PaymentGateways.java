package com.testmoa.backend.global.client.pg;

import com.testmoa.backend.entity.enums.PaymentProvider;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

/** 결제 대행사 두 곳을 provider로 찾는다. 테스트가 두 게이트웨이를 가짜로 바꿔 끼워도 같은 방식으로 동작한다 */
@Component
public class PaymentGateways {

    private final KakaoPayGateway kakaoPay;
    private final TossPaymentsGateway tossPayments;

    public PaymentGateways(KakaoPayGateway kakaoPay, TossPaymentsGateway tossPayments) {
        this.kakaoPay = kakaoPay;
        this.tossPayments = tossPayments;
    }

    public PaymentGateway get(PaymentProvider provider) {
        return switch (provider) {
            case KAKAO_PAY -> kakaoPay;
            case TOSS_PAY -> tossPayments;
        };
    }

    /** 키가 설정돼 있어 지금 쓸 수 있는 결제 대행사 */
    public List<PaymentProvider> available() {
        return Arrays.stream(PaymentProvider.values()).filter(provider -> get(provider).available()).toList();
    }
}
