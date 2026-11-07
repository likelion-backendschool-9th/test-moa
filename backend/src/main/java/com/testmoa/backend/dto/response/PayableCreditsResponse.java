package com.testmoa.backend.dto.response;

/**
 * 구독 결제에 쓸 수 있는 크레딧(이벤트 + 적립, 출금 처리 중 제외).
 * 운영자는 구독 대상이 아니라서 eligible=false이고 payableCredits가 null이다.
 */
public record PayableCreditsResponse(boolean eligible, Integer payableCredits) {
    public static PayableCreditsResponse notEligible() {
        return new PayableCreditsResponse(false, null);
    }

    public static PayableCreditsResponse of(int payableCredits) {
        return new PayableCreditsResponse(true, payableCredits);
    }
}
