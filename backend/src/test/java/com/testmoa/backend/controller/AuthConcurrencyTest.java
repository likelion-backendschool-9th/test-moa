package com.testmoa.backend.controller;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * 같은 세션에 요청이 동시에 올 때. 트랜잭션이 서로 보여야 해서 @Transactional 없이 실제로 커밋하고, 끝나면 만든 회원을 지운다
 */
@SpringBootTest
@AutoConfigureMockMvc
class AuthConcurrencyTest {

    private static final int ROUNDS = 5;

    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;

    private final String suffix = UUID.randomUUID().toString().substring(0, 8);
    private final String email = "race" + suffix + "@example.com";

    @AfterEach
    void cleanUp() {
        // 가입하면 지갑과 가입 크레딧 장부가 생긴다(#255)
        jdbc.update("delete from credit_ledgers where credit_wallet_id in (select id from credit_wallets where user_id in (select id from users where email = ?))", email);
        jdbc.update("delete from credit_wallets where user_id in (select id from users where email = ?)", email);
        jdbc.update("delete from refresh_tokens where user_id in (select id from users where email = ?)", email);
        jdbc.update("delete from accounts where user_id in (select id from users where email = ?)", email);
        jdbc.update("delete from users where email = ?", email);
    }

    @Test
    @DisplayName("#80-S11 같은 refresh 토큰으로 동시에 갱신하면 하나만 성공한다")
    void 같은_토큰으로_동시에_갱신하면_하나만_성공한다() throws Exception {
        signup();
        for (int round = 0; round < ROUNDS; round++) {
            String token = refreshToken(login());

            List<MvcResult> results = concurrently(
                    () -> send("/api/auth/refresh", token),
                    () -> send("/api/auth/refresh", token),
                    () -> send("/api/auth/refresh", token));

            assertThat(results).extracting(r -> r.getResponse().getStatus())
                    .containsExactlyInAnyOrder(200, 401, 401);
        }
    }

    @Test
    @DisplayName("#80-S11 갱신과 로그아웃이 동시에 와도, 로그아웃이 끝나면 그 세션의 토큰은 모두 못 쓴다")
    void 갱신과_로그아웃이_동시에_와도_세션이_끝난다() throws Exception {
        signup();
        for (int round = 0; round < ROUNDS; round++) {
            String token = refreshToken(login());

            List<MvcResult> results = concurrently(
                    () -> send("/api/auth/refresh", token),
                    () -> send("/api/auth/logout", token));

            MvcResult refreshed = results.get(0);
            assertThat(results.get(1).getResponse().getStatus()).isEqualTo(200);
            if (refreshed.getResponse().getStatus() == 200) {
                // 갱신이 먼저 끝났어도 그 새 토큰까지 로그아웃에 함께 끝나야 한다
                assertThat(send("/api/auth/refresh", refreshToken(refreshed)).getResponse().getStatus()).isEqualTo(401);
                String access = JsonPath.read(refreshed.getResponse().getContentAsString(), "$.data.accessToken");
                assertThat(mvc.perform(get("/api/users/me").header("Authorization", "Bearer " + access))
                        .andReturn().getResponse().getStatus()).isEqualTo(401);
            } else {
                assertThat(refreshed.getResponse().getStatus()).isEqualTo(401);
            }
        }
    }

    private void signup() throws Exception {
        mvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON).content("""
                {"name":"김모아","nickname":"경쟁%s","email":"%s","password":"moa2026pw"}""".formatted(suffix, email)));
    }

    private MvcResult login() throws Exception {
        return mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content("""
                {"email":"%s","password":"moa2026pw"}""".formatted(email))).andReturn();
    }

    private MvcResult send(String path, String refreshToken) throws Exception {
        return mvc.perform(post(path)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"refreshToken\":\"" + refreshToken + "\"}")).andReturn();
    }

    private static String refreshToken(MvcResult result) throws Exception {
        return JsonPath.read(result.getResponse().getContentAsString(), "$.data.refreshToken");
    }

    // 요청들을 스레드마다 하나씩, 출발선에서 동시에 보낸다. 결과는 넘긴 순서대로
    @SafeVarargs
    private static List<MvcResult> concurrently(Callable<MvcResult>... requests) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(requests.length);
        try {
            CountDownLatch start = new CountDownLatch(1);
            List<Future<MvcResult>> futures = new ArrayList<>();
            for (Callable<MvcResult> request : requests) {
                futures.add(pool.submit(() -> {
                    start.await();
                    return request.call();
                }));
            }
            start.countDown();
            List<MvcResult> results = new ArrayList<>();
            for (Future<MvcResult> future : futures) results.add(future.get());
            return results;
        } finally {
            pool.shutdown();
        }
    }
}
