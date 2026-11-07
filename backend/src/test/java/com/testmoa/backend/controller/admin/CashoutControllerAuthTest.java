package com.testmoa.backend.controller.admin;

import com.testmoa.backend.entity.Cashout;
import com.testmoa.backend.entity.CreditWallet;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.repository.CashoutRepository;
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
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * #68-S7 운영자가 아니면 출금 목록·상세·처리 모두 막힌다.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CashoutControllerAuthTest {

    @Autowired MockMvc mvc;
    @Autowired JwtProvider jwtProvider;
    @Autowired UserRepository userRepository;
    @Autowired CreditWalletRepository creditWalletRepository;
    @Autowired CashoutRepository cashoutRepository;

    private User saveUser(Role role) {
        return userRepository.save(User.builder()
                .name("한서윤")
                .nickname("t" + UUID.randomUUID().toString().substring(0, 8))
                .email(UUID.randomUUID() + "@example.com")
                .role(role)
                .status(UserStatus.ACTIVE)
                .build());
    }

    private Cashout saveRequested(User owner) {
        CreditWallet wallet = CreditWallet.builder().user(owner).build();
        wallet.grantEarned(5000);
        wallet.lockForCashout(5000);
        creditWalletRepository.save(wallet);
        return cashoutRepository.save(Cashout.builder()
                .user(owner)
                .amount(5000)
                .bank("토스뱅크")
                .accountNumber("100012345678")
                .accountHolder("한서윤")
                .build());
    }

    @Test
    @DisplayName("#68-S7 토큰이 없으면 401, 일반 회원이면 403이고 요청은 그대로")
    void onlyAdminCanUseCashoutApis() throws Exception {
        User owner = saveUser(Role.USER);
        Cashout cashout = saveRequested(owner);
        String member = "Bearer " + jwtProvider.createAccessToken(owner.getId());
        String admin = "Bearer " + jwtProvider.createAccessToken(saveUser(Role.ADMIN).getId());
        String id = String.valueOf(cashout.getId());
        String pay = "{\"decision\":\"PAID\"}";
        String reject = "{\"decision\":\"REJECTED\",\"reason\":\"ACCOUNT\"}";

        mvc.perform(get("/api/v1/admin/withdrawals")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/admin/withdrawals/" + id)).andExpect(status().isUnauthorized());
        mvc.perform(put("/api/v1/admin/withdrawals/" + id).contentType(MediaType.APPLICATION_JSON).content(pay))
                .andExpect(status().isUnauthorized());
        mvc.perform(put("/api/v1/admin/withdrawals/" + id).contentType(MediaType.APPLICATION_JSON).content(reject))
                .andExpect(status().isUnauthorized());

        mvc.perform(get("/api/v1/admin/withdrawals").header("Authorization", member)).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/admin/withdrawals/" + id).header("Authorization", member)).andExpect(status().isForbidden());
        mvc.perform(put("/api/v1/admin/withdrawals/" + id).header("Authorization", member)
                        .contentType(MediaType.APPLICATION_JSON).content(pay))
                .andExpect(status().isForbidden());
        mvc.perform(put("/api/v1/admin/withdrawals/" + id).header("Authorization", member)
                        .contentType(MediaType.APPLICATION_JSON).content(reject))
                .andExpect(status().isForbidden());

        assertEquals(Cashout.Status.REQUESTED, cashoutRepository.findById(cashout.getId()).orElseThrow().getStatus());
        assertEquals(5000, creditWalletRepository.findByUserId(owner.getId()).orElseThrow().getLockedBalance());

        mvc.perform(get("/api/v1/admin/withdrawals?tab=pending").header("Authorization", admin))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/admin/withdrawals/" + id).header("Authorization", admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("REQUESTED"))
                .andExpect(jsonPath("$.data.accountNumber").value("100012345678"));
        mvc.perform(get("/api/v1/admin/withdrawals?tab=all").header("Authorization", admin))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("#68-S14 운영자는 PUT 하나로 지급·반려를 처리하고, 잘못된 본문은 400이다")
    void adminProcessesWithPut() throws Exception {
        User owner = saveUser(Role.USER);
        Cashout cashout = saveRequested(owner);
        String admin = "Bearer " + jwtProvider.createAccessToken(saveUser(Role.ADMIN).getId());
        String url = "/api/v1/admin/withdrawals/" + cashout.getId();

        mvc.perform(put(url).header("Authorization", admin).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
        mvc.perform(put(url).header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"REQUESTED\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(put(url).header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"PAID\",\"reason\":\"OTHER\"}"))
                .andExpect(status().isBadRequest());
        assertEquals(Cashout.Status.REQUESTED, cashoutRepository.findById(cashout.getId()).orElseThrow().getStatus());

        mvc.perform(put(url).header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"PAID\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PAID"))
                .andExpect(jsonPath("$.data.accountNumber").value("****5678"));
        mvc.perform(put(url).header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"PAID\"}"))
                .andExpect(status().isConflict());
        assertEquals(0, creditWalletRepository.findByUserId(owner.getId()).orElseThrow().getLockedBalance());
    }
}
