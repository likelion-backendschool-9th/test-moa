package com.testmoa.backend.controller;

import com.testmoa.backend.entity.CreditLedger;
import com.testmoa.backend.entity.CreditWallet;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.repository.CreditLedgerRepository;
import com.testmoa.backend.repository.CreditWalletRepository;
import com.testmoa.backend.repository.UserRepository;
import com.testmoa.backend.global.security.Role;
import com.testmoa.backend.entity.enums.UserStatus;
import com.testmoa.backend.global.security.JwtProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 크레딧 조회는 토큰의 회원만 본다. 주소에 회원 id가 없다.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CreditControllerAuthTest {

    @Autowired MockMvc mvc;
    @Autowired JwtProvider jwtProvider;
    @Autowired UserRepository userRepository;
    @Autowired CreditWalletRepository creditWalletRepository;
    @Autowired CreditLedgerRepository creditLedgerRepository;

    private User saveUser() {
        User user = User.builder()
                .nickname("t" + UUID.randomUUID().toString().substring(0, 8))
                .email(UUID.randomUUID() + "@example.com")
                .role(Role.USER)
                .status(UserStatus.ACTIVE)
                .build();
        return userRepository.save(user);
    }

    @Test
    @DisplayName("#66-S5 토큰의 회원만 자기 크레딧을 본다")
    void 토큰의_회원만_자기_크레딧을_본다() throws Exception {
        User me = saveUser();
        User other = saveUser();
        CreditWallet wallet = creditWalletRepository.save(CreditWallet.builder().user(other).build());
        CreditLedger ledger = creditLedgerRepository.save(CreditLedger.builder()
                .creditWallet(wallet)
                .delta(1000)
                .description("B의 가입 크레딧")
                .type(CreditLedger.Type.EARNED)
                .build());
        String mine = jwtProvider.createAccessToken(me.getId());
        String theirs = jwtProvider.createAccessToken(other.getId());

        mvc.perform(get("/api/v1/my/credits").header("Authorization", "Bearer " + mine))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.userId").value(me.getId()));

        mvc.perform(get("/api/v1/my/credits/ledger").header("Authorization", "Bearer " + theirs))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id").value(ledger.getId()));
        mvc.perform(get("/api/v1/my/credits/ledger").header("Authorization", "Bearer " + mine))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.id == " + ledger.getId() + ")]").isEmpty());

        mvc.perform(get("/api/v1/my/credits")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("#205-S11 limit을 주면 최신 내역부터 그 개수만, 범위 밖이나 숫자가 아니면 400")
    void limit을_주면_그_개수만_받는다() throws Exception {
        User me = saveUser();
        CreditWallet wallet = creditWalletRepository.save(CreditWallet.builder().user(me).build());
        for (int i = 1; i <= 3; i++) {
            creditLedgerRepository.save(CreditLedger.builder()
                    .creditWallet(wallet)
                    .delta(1000 * i)
                    .description("보상 " + i)
                    .type(CreditLedger.Type.EARNED)
                    .build());
        }
        String token = "Bearer " + jwtProvider.createAccessToken(me.getId());

        mvc.perform(get("/api/v1/my/credits/ledger").header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(3));
        mvc.perform(get("/api/v1/my/credits/ledger?type=all&limit=2").header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2));
        for (String limit : new String[]{"0", "101", "abc"}) {
            mvc.perform(get("/api/v1/my/credits/ledger?limit=" + limit).header("Authorization", token))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error.code").value("INVALID_INPUT"));
        }
    }
}
