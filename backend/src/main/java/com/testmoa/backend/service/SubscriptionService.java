package com.testmoa.backend.service;

import com.testmoa.backend.dto.response.CheckoutResponse;
import com.testmoa.backend.dto.response.PayableCreditsResponse;
import com.testmoa.backend.dto.response.SubscriptionResponse;

public interface SubscriptionService {
    /** 내 구독 상태 */
    SubscriptionResponse getStatus(Long userId);

    /** 구독 결제에 쓸 수 있는 크레딧 */
    PayableCreditsResponse getPayableCredits(Long userId);

    /** 구독 결제 화면에 필요한 값. planId는 지금 파는 플랜이어야 한다 */
    CheckoutResponse getCheckout(Long userId, Long planId);
}
