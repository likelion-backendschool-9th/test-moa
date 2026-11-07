package com.testmoa.backend.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 내 출금 내역은 로그인한 회원만 본다.
 */
@SpringBootTest
@AutoConfigureMockMvc
class CashoutControllerAuthTest {

    @Autowired MockMvc mvc;

    @Test
    @DisplayName("#67-S7 토큰 없이 출금 내역을 보면 401")
    void 토큰_없이_출금_내역을_보면_401() throws Exception {
        mvc.perform(get("/api/v1/my/credits/withdrawals")).andExpect(status().isUnauthorized());
    }
}
