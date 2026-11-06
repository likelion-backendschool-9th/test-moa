package com.testmoa.backend.controller;

import com.testmoa.backend.domain.entity.User;
import com.testmoa.backend.domain.repository.AccountRepository;
import com.testmoa.backend.domain.repository.UserRepository;
import com.testmoa.backend.global.common.Provider;
import com.testmoa.backend.global.common.Role;
import com.testmoa.backend.global.common.UserStatus;
import com.testmoa.backend.global.security.JwtProvider;
import com.testmoa.backend.global.security.OAuthClient;
import com.testmoa.backend.global.security.OAuthClient.OAuthProfile;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 제공자와 통신하는 동안에는 DB 트랜잭션이 없어야 한다. 제공자가 느려도 연결 풀을 잡고 기다리지 않게 하려는 것이다.
 * 테스트 전체를 트랜잭션으로 감싸면 확인할 수 없어서 OAuthControllerTest와 나누고, 만든 회원은 직접 지운다
 */
@SpringBootTest
@AutoConfigureMockMvc
class OAuthTransactionTest {

    @Autowired MockMvc mvc;
    @Autowired UserRepository userRepository;
    @Autowired AccountRepository accountRepository;
    @Autowired JwtProvider jwtProvider;
    @MockitoBean OAuthClient oauthClient;

    private final String suffix = UUID.randomUUID().toString().substring(0, 8);
    private final List<Boolean> inTransaction = new ArrayList<>();
    private User user;

    // 제공자를 부르는 순간에 트랜잭션이 있었는지 적어 두고 새 회원 정보를 준다
    private void provider(Provider provider) {
        given(oauthClient.fetchProfile(any(), anyString(), anyString())).willAnswer(call -> {
            inTransaction.add(TransactionSynchronizationManager.isActualTransactionActive());
            return new OAuthProfile(provider, "tx-" + suffix, "tx" + suffix + "@example.com", true, "tx" + suffix);
        });
    }

    @AfterEach
    void cleanUp() {
        if (user == null) return;
        accountRepository.deleteAll(accountRepository.findByUserId(user.getId()));
        userRepository.delete(user);
    }

    @Test
    @DisplayName("#83-S14 소셜 로그인과 계정 연동은 제공자와 통신하는 동안 DB 트랜잭션을 잡지 않는다")
    void 제공자와_통신하는_동안_트랜잭션을_잡지_않는다() throws Exception {
        provider(Provider.GITHUB);
        mvc.perform(post("/api/auth/oauth/github").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"code":"c","redirectUri":"http://localhost:3000/auth/callback/github"}"""))
                .andExpect(status().isOk());

        user = userRepository.save(User.builder()
                .name("김트랜").nickname("트랜" + suffix).email("link" + suffix + "@example.com")
                .role(Role.USER).status(UserStatus.ACTIVE).build());
        mvc.perform(post("/api/users/me/accounts/github").contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + jwtProvider.createAccessToken(user.getId()))
                        .content("""
                                {"code":"c","redirectUri":"http://localhost:3000/auth/callback/github"}"""))
                .andExpect(status().isOk());

        assertThat(inTransaction).containsExactly(false, false);
        assertThat(accountRepository.findByUserId(user.getId())).hasSize(1); // 연동은 트랜잭션 안에서 저장됐다
    }
}
