package com.testmoa.backend.controller;

import com.jayway.jsonpath.JsonPath;
import com.testmoa.backend.entity.CreditLedger;
import com.testmoa.backend.entity.CreditWallet;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.global.security.OAuthClient;
import com.testmoa.backend.global.security.OAuthClient.OAuthProfile;
import com.testmoa.backend.global.security.Provider;
import com.testmoa.backend.repository.CreditLedgerRepository;
import com.testmoa.backend.repository.CreditWalletRepository;
import com.testmoa.backend.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 가입하면 지갑이 만들어지고 가입 크레딧이 지급된다(#255). 실제 DB에 쓰고 테스트마다 되돌린다.
 * 소셜 제공자와의 통신(OAuthClient)만 가짜로 바꾼다
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class SignupCreditTest {

    @Autowired MockMvc mvc;
    @Autowired UserRepository userRepository;
    @Autowired CreditWalletRepository creditWalletRepository;
    @Autowired CreditLedgerRepository creditLedgerRepository;
    @MockitoBean OAuthClient oauthClient;

    private final String suffix = UUID.randomUUID().toString().substring(0, 8);
    private final String email = "bonus" + suffix + "@example.com";

    private ResultActions postJson(String path, String json) throws Exception {
        return mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private ResultActions signup(String email, String nickname) throws Exception {
        return postJson("/api/auth/signup", """
                {"email":"%s","password":"password123!","name":"김가입","nickname":"%s"}""".formatted(email, nickname));
    }

    private String field(ResultActions result, String path) throws Exception {
        return JsonPath.read(result.andReturn().getResponse().getContentAsString(), path);
    }

    private void assertSignupCredit(User user, int amount) {
        CreditWallet wallet = creditWalletRepository.findByUserId(user.getId()).orElseThrow();
        assertThat(wallet.getEventCredit()).isEqualTo(amount);
        assertThat(wallet.getEarnedBalance()).isZero();
        assertThat(wallet.getLockedBalance()).isZero();
        List<CreditLedger> ledgers = creditLedgerRepository.findByCreditWalletIdOrderByCreatedAtDesc(wallet.getId());
        assertThat(ledgers).hasSize(1);
        assertThat(ledgers.get(0).getDelta()).isEqualTo(amount);
        assertThat(ledgers.get(0).getType()).isEqualTo(CreditLedger.Type.EVENT);
        assertThat(ledgers.get(0).getDescription()).isEqualTo("가입 크레딧");
    }

    @Test
    @DisplayName("#255-S1 이메일로 가입하면 지갑이 만들어지고 가입 크레딧 3,000이 지급된다")
    void 이메일로_가입하면_지갑이_만들어지고_가입_크레딧이_지급된다() throws Exception {
        signup(email, "보너스" + suffix).andExpect(status().isCreated());

        assertSignupCredit(userRepository.findByEmail(email).orElseThrow(), 3000);
    }

    @Test
    @DisplayName("#255-S2 소셜로 가입해도 지갑이 만들어지고 가입 크레딧 3,000이 지급된다")
    void 소셜로_가입해도_가입_크레딧이_지급된다() throws Exception {
        given(oauthClient.fetchProfile(eq(Provider.GITHUB), eq("code"), anyString()))
                .willReturn(new OAuthProfile(Provider.GITHUB, "gh" + suffix, email, true, "깃" + suffix));
        String signupToken = field(postJson("/api/auth/oauth/github", """
                {"code":"code","redirectUri":"http://localhost:3000/auth/callback/github"}"""), "$.data.signupToken");

        postJson("/api/auth/oauth/signup", """
                {"signupToken":"%s","name":"김소셜"}""".formatted(signupToken)).andExpect(status().isCreated());

        assertSignupCredit(userRepository.findByEmail(email).orElseThrow(), 3000);
    }

    @Test
    @DisplayName("#255-S3 이미 있는 이메일로 가입하면 409이고 새 지갑·장부가 생기지 않는다")
    void 이미_있는_이메일이면_새_지갑과_장부가_생기지_않는다() throws Exception {
        signup(email, "보너스" + suffix).andExpect(status().isCreated());
        long wallets = creditWalletRepository.count();
        long ledgers = creditLedgerRepository.count();

        signup(email, "다른" + suffix).andExpect(status().isConflict()).andExpect(jsonPath("$.error.code").value("EMAIL_TAKEN"));

        assertThat(creditWalletRepository.count()).isEqualTo(wallets);
        assertThat(creditLedgerRepository.count()).isEqualTo(ledgers);
    }

    @Test
    @DisplayName("#255-S5 가입 직후 쓸 수 있는 크레딧은 3,000이고 출금할 수 있는 크레딧은 0이며 내역에 가입 크레딧이 보인다")
    void 가입_직후_쓸_수_있는_크레딧은_3000이고_출금은_0이다() throws Exception {
        signup(email, "보너스" + suffix).andExpect(status().isCreated());
        String token = field(postJson("/api/auth/login", """
                {"email":"%s","password":"password123!"}""".formatted(email)), "$.data.accessToken");

        mvc.perform(get("/api/v1/my/credits").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.eventCredit").value(3000))
                .andExpect(jsonPath("$.data.payableCredits").value(3000))
                .andExpect(jsonPath("$.data.cashableCredits").value(0))
                .andExpect(jsonPath("$.data.totalCredits").value(3000));
        mvc.perform(get("/api/v1/my/credits/ledger").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].description").value("가입 크레딧"))
                .andExpect(jsonPath("$.data[0].delta").value(3000));
    }
}
