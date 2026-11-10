package com.testmoa.backend.dto.response;

import com.testmoa.backend.entity.enums.PaymentProvider;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 구독 결제 화면 조회. 운영자는 구독 대상이 아니라서 eligible=false이고 나머지가 모두 null이다(providers만 빈 목록).
 * providers는 지금 쓸 수 있는 현금 결제 대행사다(키가 설정된 곳만).
 */
public record CheckoutResponse(
        boolean eligible,
        PlanResponse plan,
        Integer payableCredits,
        Boolean active,
        LocalDateTime currentEndAt,
        Credit credit,
        Period period,
        List<PaymentProvider> providers
) {
    /** 크레딧으로 결제할 수 있는지. 모자라면 remainingAfter는 null이다 */
    public record Credit(boolean affordable, int shortfall, Integer remainingAfter) {
        public static Credit of(int payable, int creditPrice) {
            boolean affordable = payable >= creditPrice;
            return new Credit(affordable, Math.max(0, creditPrice - payable), affordable ? payable - creditPrice : null);
        }
    }

    /** 이번에 결제하면 생기는 이용 기간 */
    public record Period(LocalDateTime startAt, LocalDateTime endAt) {
    }

    public static CheckoutResponse notEligible() {
        return new CheckoutResponse(false, null, null, null, null, null, null, List.of());
    }

    public static CheckoutResponse of(
            PlanResponse plan, int payableCredits, boolean active, LocalDateTime currentEndAt, Period period,
            List<PaymentProvider> providers
    ) {
        return new CheckoutResponse(
                true, plan, payableCredits, active, currentEndAt,
                Credit.of(payableCredits, plan.creditPrice()), period, providers
        );
    }
}
