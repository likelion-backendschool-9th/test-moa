package com.testmoa.backend.controller.admin;

import com.testmoa.backend.entity.Cashout;
import com.testmoa.backend.entity.CreditWallet;
import com.testmoa.backend.entity.Payment;
import com.testmoa.backend.entity.Plan;
import com.testmoa.backend.entity.Subscription;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.entity.enums.PaymentProvider;
import com.testmoa.backend.entity.enums.UserStatus;
import com.testmoa.backend.global.client.pg.KakaoPayGateway;
import com.testmoa.backend.global.security.JwtProvider;
import com.testmoa.backend.global.security.Role;
import com.testmoa.backend.repository.CashoutRepository;
import com.testmoa.backend.repository.CreditWalletRepository;
import com.testmoa.backend.repository.PaymentRepository;
import com.testmoa.backend.repository.PlanRepository;
import com.testmoa.backend.repository.SubscriptionRepository;
import com.testmoa.backend.repository.UserRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 운영자 처리 기록(#276-S1~S4, S6, S7). 구독 부여·해제, 출금 지급·반려, 플랜·무료 플랜 저장에 처리한 운영자(회원 id)가 남는다.
 * 환불의 처리자(S5)는 {@code AdminPaymentRefundTest}가 확인한다.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AdminActionRecordTest {

    @Autowired MockMvc mvc;
    @Autowired JwtProvider jwtProvider;
    @Autowired UserRepository userRepository;
    @Autowired PlanRepository planRepository;
    @Autowired SubscriptionRepository subscriptionRepository;
    @Autowired PaymentRepository paymentRepository;
    @Autowired CashoutRepository cashoutRepository;
    @Autowired CreditWalletRepository creditWalletRepository;
    @Autowired JdbcTemplate jdbc;
    @Autowired EntityManager em;
    @MockitoBean KakaoPayGateway kakaoPay;

    private User admin;
    private User member;
    private Plan plan;

    @BeforeEach
    void setUp() {
        admin = saveUser(Role.ADMIN);
        member = saveUser(Role.USER);
        plan = planRepository.save(Plan.builder()
                .tier("기록-" + UUID.randomUUID().toString().substring(0, 8)).cashPrice(10000).creditPrice(9000).periodDays(30).version(1).build());
    }

    private User saveUser(Role role) {
        return userRepository.save(User.builder()
                .name("한서윤")
                .nickname("t" + UUID.randomUUID().toString().substring(0, 8))
                .email(UUID.randomUUID() + "@example.com")
                .role(role)
                .status(UserStatus.ACTIVE)
                .build());
    }

    private String bearer(User user) {
        return "Bearer " + jwtProvider.createAccessToken(user.getId());
    }

    private ResultActions grant(String body) throws Exception {
        return mvc.perform(post("/api/v1/admin/subscriptions").header("Authorization", bearer(admin))
                .contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private String grantBody(String reasonJson) {
        return "{\"email\":\"" + member.getEmail() + "\",\"planId\":" + plan.getId() + reasonJson + "}";
    }

    private List<Map<String, Object>> subscriptionRows() {
        em.flush();
        return jdbc.queryForList("select * from subscriptions where user_id = ? order by id", member.getId());
    }

    private Cashout cashout() {
        CreditWallet wallet = CreditWallet.builder().user(member).build();
        wallet.grantEarned(5000);
        wallet.lockForCashout(5000);
        creditWalletRepository.save(wallet);
        return cashoutRepository.save(Cashout.builder()
                .user(member).amount(5000).bank("토스뱅크").accountNumber("100012345678").accountHolder("한서윤").build());
    }

    private ResultActions process(Cashout cashout, String body) throws Exception {
        return mvc.perform(put("/api/v1/admin/withdrawals/" + cashout.getId()).header("Authorization", bearer(admin))
                .contentType(MediaType.APPLICATION_JSON).content(body));
    }

    @Test
    @DisplayName("#276-S1 구독 부여 때 처리 운영자와 사유가 남고, 사유가 없거나 비어 있으면 시연용 부여가 남는다")
    void grantRecordsAdminAndReason() throws Exception {
        grant(grantBody(",\"reason\":\" 시연 준비 \"")).andExpect(status().isCreated());
        grant(grantBody("")).andExpect(status().isCreated());
        grant(grantBody(",\"reason\":\"   \"")).andExpect(status().isCreated());

        List<Map<String, Object>> rows = subscriptionRows();
        assertEquals(3, rows.size());
        for (Map<String, Object> row : rows) {
            assertEquals(admin.getId(), ((Number) row.get("granted_by")).longValue());
        }
        assertEquals("시연 준비", rows.get(0).get("grant_reason"));
        assertEquals("시연용 부여", rows.get(1).get("grant_reason"));
        assertEquals("시연용 부여", rows.get(2).get("grant_reason"));
    }

    @Test
    @DisplayName("#276-S1 사유가 200자까지는 되고 201자면 400이며 구독이 생기지 않는다")
    void grantReasonLimit() throws Exception {
        grant(grantBody(",\"reason\":\"" + "가".repeat(201) + "\"")).andExpect(status().isBadRequest());
        assertEquals(0, subscriptionRows().size());
        grant(grantBody(",\"reason\":\"" + "가".repeat(200) + "\"")).andExpect(status().isCreated());
        assertEquals(1, subscriptionRows().size());
    }

    @Test
    @DisplayName("#276-S2 구독 해제 때 끝나지 않은 모든 구독에 해제한 운영자와 시연용 해제가 남고, 뺄 구독이 없으면 아무 행도 바뀌지 않는다")
    void revokeRecordsAdmin() throws Exception {
        mvc.perform(delete("/api/v1/admin/subscriptions").param("email", member.getEmail()).header("Authorization", bearer(admin)))
                .andExpect(status().isOk());
        assertEquals(0, subscriptionRows().size());

        grant(grantBody("")).andExpect(status().isCreated());
        grant(grantBody("")).andExpect(status().isCreated());
        mvc.perform(delete("/api/v1/admin/subscriptions").param("email", member.getEmail()).header("Authorization", bearer(admin)))
                .andExpect(status().isOk());

        for (Map<String, Object> row : subscriptionRows()) {
            assertEquals("CANCELLED", row.get("status"));
            assertEquals(admin.getId(), ((Number) row.get("revoked_by")).longValue());
            assertEquals("시연용 해제", row.get("revoke_reason"));
        }
        // 이미 해제된 구독은 다시 해제 대상이 아니라 기록이 바뀌지 않는다
        User other = saveUser(Role.ADMIN);
        mvc.perform(delete("/api/v1/admin/subscriptions").param("email", member.getEmail()).header("Authorization", "Bearer " + jwtProvider.createAccessToken(other.getId())))
                .andExpect(status().isOk());
        for (Map<String, Object> row : subscriptionRows()) {
            assertEquals(admin.getId(), ((Number) row.get("revoked_by")).longValue());
        }
    }

    @Test
    @DisplayName("#276-S3 출금 지급·반려 때 처리 운영자가 남고, 이미 처리한 요청은 처리자를 바꾸지 않는다")
    void cashoutRecordsAdmin() throws Exception {
        Cashout paid = cashout();
        process(paid, "{\"decision\":\"PAID\"}").andExpect(status().isOk());
        em.flush();
        em.clear();
        assertEquals(admin.getId(), cashoutRepository.findById(paid.getId()).orElseThrow().getProcessedBy());
        assertNotNull(cashoutRepository.findById(paid.getId()).orElseThrow().getProcessedAt());

        // 같은 요청을 다른 운영자가 다시 처리하면 거절하고 처리자는 그대로다
        User other = saveUser(Role.ADMIN);
        mvc.perform(put("/api/v1/admin/withdrawals/" + paid.getId()).header("Authorization", "Bearer " + jwtProvider.createAccessToken(other.getId()))
                .contentType(MediaType.APPLICATION_JSON).content("{\"decision\":\"REJECTED\",\"reason\":\"ACCOUNT\"}"))
                .andExpect(status().isConflict());
        em.clear();
        assertEquals(admin.getId(), cashoutRepository.findById(paid.getId()).orElseThrow().getProcessedBy());
    }

    @Test
    @DisplayName("#276-S3 출금 반려 때도 처리 운영자가 남는다")
    void rejectRecordsAdmin() throws Exception {
        Cashout rejected = cashout();
        process(rejected, "{\"decision\":\"REJECTED\",\"reason\":\"HOLDER\"}").andExpect(status().isOk());
        em.flush();
        em.clear();
        Cashout found = cashoutRepository.findById(rejected.getId()).orElseThrow();
        assertEquals(Cashout.Status.REJECTED, found.getStatus());
        assertEquals(admin.getId(), found.getProcessedBy());
    }

    @Test
    @DisplayName("#276-S4 플랜을 등록하면 새 행에 운영자가 남고 이전 버전 행은 바뀌지 않으며, 무료 플랜을 저장하면 마지막 운영자로 바뀐다")
    void planRecordsAdmin() throws Exception {
        String tier = "수정-" + UUID.randomUUID().toString().substring(0, 8);
        String body = "{\"tier\":\"" + tier + "\",\"cashPrice\":1000,\"creditPrice\":900,\"periodDays\":30,\"benefits\":[\"a\"]}";
        mvc.perform(post("/api/v1/admin/plans").header("Authorization", bearer(admin)).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated());
        User other = saveUser(Role.ADMIN);
        mvc.perform(post("/api/v1/admin/plans").header("Authorization", "Bearer " + jwtProvider.createAccessToken(other.getId()))
                .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isCreated());
        em.flush();

        List<Map<String, Object>> rows = jdbc.queryForList("select * from plans where tier = ? order by version", tier);
        assertEquals(2, rows.size());
        assertEquals(admin.getId(), ((Number) rows.get(0).get("updated_by")).longValue());
        assertEquals(other.getId(), ((Number) rows.get(1).get("updated_by")).longValue());

        String free = "{\"tier\":\"FREE\",\"benefits\":[\"b\"]}";
        mvc.perform(put("/api/v1/admin/plans/free").header("Authorization", bearer(admin)).contentType(MediaType.APPLICATION_JSON).content(free))
                .andExpect(status().isOk());
        em.flush();
        assertEquals(admin.getId(), jdbc.queryForObject("select updated_by from free_plans where id = 1", Long.class));
        mvc.perform(put("/api/v1/admin/plans/free").header("Authorization", "Bearer " + jwtProvider.createAccessToken(other.getId()))
                .contentType(MediaType.APPLICATION_JSON).content(free)).andExpect(status().isOk());
        em.flush();
        assertEquals(other.getId(), jdbc.queryForObject("select updated_by from free_plans where id = 1", Long.class));
    }

    @Test
    @DisplayName("#276-S6 요청 본문에 grantedBy·processedBy를 넣어도 무시하고 로그인한 운영자가 남는다")
    void bodyAdminIdIsIgnored() throws Exception {
        grant(grantBody(",\"grantedBy\":" + member.getId())).andExpect(status().isCreated());
        assertEquals(admin.getId(), ((Number) subscriptionRows().get(0).get("granted_by")).longValue());

        Cashout cashout = cashout();
        process(cashout, "{\"decision\":\"PAID\",\"processedBy\":" + member.getId() + "}").andExpect(status().isOk());
        em.flush();
        em.clear();
        assertEquals(admin.getId(), cashoutRepository.findById(cashout.getId()).orElseThrow().getProcessedBy());
    }

    @Test
    @DisplayName("#276-S7 처리자가 비어 있는 옛 구독·출금·결제·플랜 행도 조회가 그대로다")
    void legacyRowsWithoutAdminStillWork() throws Exception {
        Subscription paid = subscriptionRepository.save(Subscription.builder()
                .user(member).plan(plan).startAt(LocalDateTime.now().minusDays(1)).endAt(LocalDateTime.now().plusDays(29)).build());
        paymentRepository.save(Payment.builder().subscription(paid).method(Payment.Method.CASH).provider(PaymentProvider.KAKAO_PAY)
                .pgTransactionId("T-1").amount(10000).paidAt(LocalDateTime.now().minusDays(1)).build());
        Cashout legacy = cashout();
        em.flush();
        em.clear();

        assertNull(subscriptionRepository.findById(paid.getId()).orElseThrow().getGrantedBy());
        assertNull(cashoutRepository.findById(legacy.getId()).orElseThrow().getProcessedBy());
        mvc.perform(get("/api/v1/my/subscription/status").header("Authorization", bearer(member))).andExpect(status().isOk());
        mvc.perform(get("/api/v1/my/subscription/payments").header("Authorization", bearer(member))).andExpect(status().isOk());
        mvc.perform(get("/api/v1/admin/withdrawals").header("Authorization", bearer(admin))).andExpect(status().isOk());
        mvc.perform(get("/api/v1/admin/subscriptions").param("email", member.getEmail()).header("Authorization", bearer(admin)))
                .andExpect(status().isOk());
    }
}
