package com.testmoa.backend.controller;

import com.testmoa.backend.entity.CreditLedger;
import com.testmoa.backend.repository.CreditLedgerRepository;
import com.testmoa.backend.repository.CreditWalletRepository;
import com.testmoa.backend.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 가입 크레딧 지급이 실패하면 가입도 되돌아가는지(#255). 롤백을 눈으로 보려고 테스트 트랜잭션 없이 돌린다.
 * 실패한 가입은 아무것도 남기지 않아서 따로 지울 데이터가 없다
 */
@SpringBootTest
@AutoConfigureMockMvc
class SignupCreditRollbackTest {

    @Autowired MockMvc mvc;
    @Autowired UserRepository userRepository;
    @Autowired CreditWalletRepository creditWalletRepository;
    @MockitoSpyBean CreditLedgerRepository creditLedgerRepository;

    @Test
    @DisplayName("#255-S3 지급 중 저장이 실패하면 가입이 오류이고 회원·지갑·장부가 남지 않는다")
    void 지급이_실패하면_회원과_지갑과_장부가_남지_않는다() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String email = "rollback" + suffix + "@example.com";
        long wallets = creditWalletRepository.count();
        long ledgers = creditLedgerRepository.count();
        doThrow(new IllegalStateException("장부 저장 실패")).when(creditLedgerRepository).save(any(CreditLedger.class));

        mvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON).content("""
                        {"email":"%s","password":"password123!","name":"김롤백","nickname":"롤백%s"}""".formatted(email, suffix)))
                .andExpect(status().is5xxServerError());

        assertThat(userRepository.findByEmail(email)).isEmpty();
        assertThat(creditWalletRepository.count()).isEqualTo(wallets);
        assertThat(creditLedgerRepository.count()).isEqualTo(ledgers);
    }
}
