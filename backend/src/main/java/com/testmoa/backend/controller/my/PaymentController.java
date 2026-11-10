package com.testmoa.backend.controller.my;

import com.testmoa.backend.dto.request.PaymentRequest;
import com.testmoa.backend.dto.request.PgApproveRequest;
import com.testmoa.backend.dto.request.PgReadyRequest;
import com.testmoa.backend.dto.response.PaymentHistoryResponse;
import com.testmoa.backend.dto.response.PaymentResponse;
import com.testmoa.backend.dto.response.PgReadyResponse;
import com.testmoa.backend.global.util.ApiResponse;
import com.testmoa.backend.service.my.PaymentService;
import com.testmoa.backend.service.my.PgPaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 구독 결제 실행과 내 결제 이력. 회원 id는 토큰에서 꺼낸다.
 * 결제 화면 값을 계산하는 조회는 {@link com.testmoa.backend.controller.SubscriptionController}가 맡는다.
 */
@RestController
@RequestMapping("/api/v1/my/subscription")
public class PaymentController {

    private final PaymentService paymentService;
    private final PgPaymentService pgPaymentService;

    public PaymentController(PaymentService paymentService, PgPaymentService pgPaymentService) {
        this.paymentService = paymentService;
        this.pgPaymentService = pgPaymentService;
    }

    @Operation(summary = "구독 결제 실행(크레딧)", description = "크레딧으로 결제한다. 현금은 PG 승인을 거쳐야 해서 400. 직전 결제 후 5초 안이면 409")
    @PostMapping("/checkout")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<PaymentResponse> pay(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
            @Valid @RequestBody PaymentRequest request
    ) {
        return ApiResponse.ok(paymentService.pay(userId, request));
    }

    @Operation(summary = "구독 현금 결제 준비", description = "서버가 금액을 정해 결제 시도를 저장하고 카카오페이·토스 결제창 정보를 준다")
    @PostMapping("/checkout/ready")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<PgReadyResponse> ready(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
            @Valid @RequestBody PgReadyRequest request
    ) {
        return ApiResponse.ok(pgPaymentService.ready(userId, request));
    }

    @Operation(summary = "구독 현금 결제 승인", description = "결제창에서 돌아온 값으로 PG 승인을 부르고, 성공하면 결제와 이용 기간을 저장한다")
    @PostMapping("/checkout/approve")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<PaymentResponse> approve(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
            @Valid @RequestBody PgApproveRequest request
    ) {
        return ApiResponse.ok(pgPaymentService.approve(userId, request));
    }

    @Operation(summary = "내 결제 이력", description = "최신순. 운영자는 빈 배열")
    @GetMapping("/payments")
    public ApiResponse<List<PaymentHistoryResponse>> getPayments(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId
    ) {
        return ApiResponse.ok(paymentService.getPayments(userId));
    }
}
