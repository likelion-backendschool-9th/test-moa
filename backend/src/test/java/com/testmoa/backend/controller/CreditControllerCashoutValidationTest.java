package com.testmoa.backend.controller;

import com.testmoa.backend.global.exception.GlobalExceptionHandler;
import com.testmoa.backend.service.CreditService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 출금 신청 @Valid 경로. DB 없이 컨트롤러만 띄운다.
 */
class CreditControllerCashoutValidationTest {

    private final CreditService creditService = mock(CreditService.class);
    private final MockMvc mvc = MockMvcBuilders
            .standaloneSetup(new CreditController(creditService))
            .setControllerAdvice(new GlobalExceptionHandler())
            .build();

    @Test
    @DisplayName("#67-S3 금액 1 미만·계좌 형식이 틀리면 400·서비스 미호출")
    void invalidCashoutBodyReturns400() throws Exception {
        mvc.perform(post("/api/users/1/credits/cashouts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"amount":0,"bank":"토스뱅크","accountNumber":"12-34","accountHolder":"한서윤"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_INPUT"))
                .andExpect(jsonPath("$.error.fields.amount").value("1 크레딧 이상 입력해 주세요"))
                .andExpect(jsonPath("$.error.fields.accountNumber").value("계좌번호는 숫자 10~14자리예요"));

        verify(creditService, never()).requestCashout(anyLong(), any());
    }
}
