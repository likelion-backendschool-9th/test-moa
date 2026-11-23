package com.testmoa.backend.service;

import com.testmoa.backend.entity.CreditLedger;
import com.testmoa.backend.entity.CreditWallet;
import com.testmoa.backend.entity.Feedback;
import com.testmoa.backend.entity.Project;
import com.testmoa.backend.entity.Recruitment;
import com.testmoa.backend.entity.Register;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.entity.enums.FeedbackStatus;
import com.testmoa.backend.entity.enums.SelectionMode;
import com.testmoa.backend.entity.enums.UserStatus;
import com.testmoa.backend.global.security.JwtProvider;
import com.testmoa.backend.global.security.Role;
import com.testmoa.backend.repository.CreditLedgerRepository;
import com.testmoa.backend.repository.CreditWalletRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 피드백 보상 자동 지급(#288). 지급 조건, 장부, 참여 상태, 같은 참가를 두 번 지급하지 않는지 확인한다
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class FeedbackPayoutServiceTest {
    @Autowired FeedbackPayoutService payoutService;
    @Autowired EntityManager em;
    @Autowired MockMvc mvc;
    @Autowired JwtProvider jwtProvider;
    @Autowired CreditWalletRepository creditWalletRepository;
    @Autowired CreditLedgerRepository creditLedgerRepository;

    private User developer;
    private User tester;
    private LocalDateTime now;

    @BeforeEach
    void setUp() {
        developer = saveUser();
        tester = saveUser();
        now = LocalDateTime.now();
    }

    private User saveUser() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        User user = User.builder().name("김모아").nickname("모아" + suffix).email(suffix + "@example.com")
                .role(Role.USER).status(UserStatus.ACTIVE).build();
        em.persist(user);
        return user;
    }

    private Recruitment saveRecruitment(String title) {
        Project project = Project.builder().user(developer).title("북로그").build();
        em.persist(project);
        Recruitment recruitment = Recruitment.builder().project(project).title(title).description("써 봐 주세요")
                .conditions("누구나").accessUrl("https://booklog.example.com")
                .recruitDeadline(now.minusDays(5)).feedbackDeadline(now.plusDays(2))
                .selectionMode(SelectionMode.FIRST_COME).build();
        em.persist(recruitment);
        return recruitment;
    }

    /** 확정 참가와 hoursAgo시간 전에 낸 피드백 두 건(항목, 기타 의견) */
    private Register submitted(Recruitment recruitment, int baseReward, long hoursAgo) {
        Register register = Register.builder().recruitment(recruitment).user(tester).build();
        em.persist(register);
        register.confirm(baseReward, 0, now.minusDays(6));
        LocalDateTime submittedAt = now.minusHours(hoursAgo);
        em.persist(Feedback.builder().register(register).content("밑줄 저장이 잘 돼요").submittedAt(submittedAt).build());
        em.persist(Feedback.builder().register(register).content("검색이 느려요").submittedAt(submittedAt).build());
        return register;
    }

    private List<Feedback> feedbacks(Register register) {
        return em.createQuery("select f from feedbacks f where f.register.id = :id order by f.id", Feedback.class)
                .setParameter("id", register.getId()).getResultList();
    }

    private int earned() {
        em.flush();
        em.clear();
        return creditWalletRepository.findByUserId(tester.getId()).map(CreditWallet::getEarnedBalance).orElse(0);
    }

    private int pay() {
        em.flush();
        em.clear();
        return payoutService.payDue(now);
    }

    @Test
    @DisplayName("#288-S1 제출한 지 72시간이 지나고 신고가 없으면 참가 단위로 한 번 지급한다")
    void 피드백이_여러_건이어도_보상을_한_번_적립하고_지급_완료가_된다() throws Exception {
        Register register = submitted(saveRecruitment("북로그 1차 테스트"), 1000, 73);

        assertThat(pay()).isEqualTo(1);

        assertThat(feedbacks(register)).extracting(Feedback::getStatus).containsOnly(FeedbackStatus.REWARDED);
        assertThat(earned()).isEqualTo(1000);
        CreditWallet wallet = creditWalletRepository.findByUserId(tester.getId()).orElseThrow();
        List<CreditLedger> ledgers = creditLedgerRepository.findByCreditWalletIdOrderByCreatedAtDesc(wallet.getId());
        assertThat(ledgers).hasSize(1);
        assertThat(ledgers.getFirst().getType()).isEqualTo(CreditLedger.Type.EARNED);
        assertThat(ledgers.getFirst().getDelta()).isEqualTo(1000);
        assertThat(ledgers.getFirst().getDescription()).isEqualTo("피드백 보상 · 북로그 1차 테스트");

        mvc.perform(get("/api/v1/tester/participations/" + register.getId())
                        .header("Authorization", "Bearer " + jwtProvider.createAccessToken(tester.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("paid"))
                .andExpect(jsonPath("$.data.earnedCredits").value(1000));

        /* 다시 돌아도 같은 참가는 지급하지 않는다 */
        assertThat(pay()).isZero();
        assertThat(earned()).isEqualTo(1000);
    }

    @Test
    @DisplayName("#288-S2 72시간이 지나지 않았으면 지급하지 않는다")
    void 기한_전이면_제출_상태로_남는다() {
        Register register = submitted(saveRecruitment("북로그 1차 테스트"), 1000, 71);

        assertThat(pay()).isZero();

        assertThat(feedbacks(register)).extracting(Feedback::getStatus).containsOnly(FeedbackStatus.SUBMITTED);
        assertThat(earned()).isZero();
    }

    @Test
    @DisplayName("#288-S3 한 건이라도 신고됐거나 보상 제외면 참가 전체 지급을 보류한다")
    void 신고된_참가와_보상_제외된_참가는_지급하지_않고_기각되면_지급한다() {
        Register reported = submitted(saveRecruitment("신고된 모집"), 1000, 73);
        Feedback reportedFeedback = feedbacks(reported).getFirst();
        reportedFeedback.report("광고 글이에요");

        assertThat(pay()).isZero();
        assertThat(earned()).isZero();

        /* 운영자가 기각하면 제출로 돌아가 다음 실행에 지급된다(AdminReportServiceImpl) */
        Feedback dismissed = em.find(Feedback.class, reportedFeedback.getId());
        dismissed.dismissReport();
        assertThat(pay()).isEqualTo(1);
        assertThat(earned()).isEqualTo(1000);

        Register excluded = submitted(saveRecruitment("보상 제외 모집"), 1000, 73);
        Feedback excludedFeedback = feedbacks(excluded).getFirst();
        excludedFeedback.report("광고 글이에요");
        excludedFeedback.exclude();
        assertThat(pay()).isZero();
        assertThat(feedbacks(excluded)).extracting(Feedback::getStatus)
                .containsExactly(FeedbackStatus.EXCLUDED, FeedbackStatus.SUBMITTED);
    }

    @Test
    @DisplayName("#288-S4 모집이 취소돼도 피드백을 낸 참가는 지급한다")
    void 취소된_모집의_피드백도_72시간_뒤에_지급한다() {
        Recruitment recruitment = saveRecruitment("취소된 모집");
        submitted(recruitment, 1000, 73);
        recruitment.cancel("서버 장애로 진행할 수 없어요", now.minusHours(1));

        assertThat(pay()).isEqualTo(1);
        assertThat(earned()).isEqualTo(1000);
    }

    @Test
    @DisplayName("#288-S5 지급된 피드백은 신고할 수 없다")
    void 지급된_피드백을_신고하면_409다() throws Exception {
        Register register = submitted(saveRecruitment("북로그 1차 테스트"), 1000, 73);
        pay();
        Long feedbackId = feedbacks(register).getFirst().getId();

        mvc.perform(post("/api/v1/developer/feedbacks/" + feedbackId + "/report")
                        .header("Authorization", "Bearer " + jwtProvider.createAccessToken(developer.getId()))
                        .contentType("application/json").content("{\"reason\":\"광고 글이에요\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("FEEDBACK_NOT_REPORTABLE"));
    }
}
