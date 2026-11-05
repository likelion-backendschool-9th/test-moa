package com.testmoa.backend.domain.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * 출금 신청 본문. 형식 검사는 프론트 actions.ts와 맞춘다.
 * 출금 가능액 초과·은행 허용 목록은 서비스에서 본다.
 */
public record CashoutCreateRequest(
        @NotNull(message = "금액을 입력해 주세요")
        @Min(value = 1, message = "1 크레딧 이상 입력해 주세요")
        Integer amount,

        @NotBlank(message = "은행을 골라 주세요")
        String bank,

        @NotBlank(message = "계좌번호를 입력해 주세요")
        @Pattern(regexp = "^\\d{10,14}$", message = "계좌번호는 숫자 10~14자리예요")
        String accountNumber,

        @NotBlank(message = "예금주를 입력해 주세요")
        @Size(max = 40, message = "예금주는 40자까지 쓸 수 있어요")
        String accountHolder
) {}
