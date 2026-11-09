package com.testmoa.backend.service.admin;

import com.testmoa.backend.dto.request.AdminSubscriptionGrantRequest;
import com.testmoa.backend.dto.response.AdminSubscriptionResponse;

/** 운영자가 시연·확인용으로 회원의 구독을 결제 없이 보고 주고 빼는 서비스(#204) */
public interface AdminSubscriptionService {
    /** 이메일로 회원의 구독 상태를 본다. 없는 이메일은 404 */
    AdminSubscriptionResponse find(String email);

    /** 결제 없이 구독 기간을 만든다. 운영자 계정은 403, 지금 파는 플랜이 아니면 404 */
    AdminSubscriptionResponse grant(AdminSubscriptionGrantRequest request);

    /** 끝나지 않은 구독 기간을 모두 취소한다. 뺄 구독이 없어도 같은 결과다 */
    AdminSubscriptionResponse revoke(String email);
}
