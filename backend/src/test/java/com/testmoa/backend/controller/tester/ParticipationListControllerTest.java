package com.testmoa.backend.controller.tester;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.testmoa.backend.entity.Feedback;
import com.testmoa.backend.entity.Project;
import com.testmoa.backend.entity.Recruitment;
import com.testmoa.backend.entity.Register;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.entity.enums.SelectionMode;
import com.testmoa.backend.entity.enums.UserStatus;
import com.testmoa.backend.global.security.JwtProvider;
import com.testmoa.backend.global.security.Role;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 내 참여 목록·요약·마감 일정(#117). 요청부터 DB까지 확인한다
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ParticipationListControllerTest {
    private static final String BASE = "/api/v1/tester/participations";
    private static final ObjectMapper JSON = new ObjectMapper();

    @Autowired MockMvc mvc;
    @Autowired EntityManager em;
    @Autowired JwtProvider jwtProvider;

    private User developer;
    private User tester;
    /* 상태 이름 → 그 상태인 테스터의 참가 */
    private Register pendingLater, pendingSooner, notSelected;
    private Register beforeLater, beforeSooner, payoutPending, underReview;
    private Register paid, incomplete, excluded, cancelled;

    @BeforeEach
    void setUp() {
        developer = saveUser();
        tester = saveUser();
        LocalDateTime now = LocalDateTime.now();

        pendingLater = applied(saveRecruitment("선정 대기 늦음", 5, 12));
        pendingSooner = applied(saveRecruitment("선정 대기 이름", 3, 10));
        notSelected = applied(saveRecruitment("미선정", 3, 10));
        notSelected.reject();

        beforeLater = confirmed(saveRecruitment("제출 전 늦음", -1, 9));
        beforeSooner = confirmed(saveRecruitment("제출 전 이름", -1, 4));
        payoutPending = confirmed(saveRecruitment("지급 대기", -1, 6));
        feedback(payoutPending, now.minusHours(1));
        underReview = confirmed(saveRecruitment("검토 중", -1, 6));
        feedback(underReview, now.minusHours(2)).report("광고 글이에요");

        paid = confirmed(saveRecruitment("지급 완료", -5, -4));
        feedback(paid, now).reward();
        incomplete = confirmed(saveRecruitment("미제출", -9, -3));
        excluded = confirmed(saveRecruitment("보상 제외", -5, -1));
        Feedback excludedFeedback = feedback(excluded, now.minusDays(2));
        excludedFeedback.report("광고 글이에요");
        excludedFeedback.exclude();
        Recruitment cancelledRecruitment = saveRecruitment("모집 취소", 3, 10);
        cancelled = applied(cancelledRecruitment);
        cancelledRecruitment.cancel("일정이 바뀌었어요", now.minusDays(1));
        cancelled.cancel();

        /* 다른 테스터의 참가는 보이지 않는다 */
        confirmed(saveRecruitment("남의 참가", -1, 5), saveUser());
    }

    private User saveUser() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        User user = User.builder().name("김모아").nickname("모아" + suffix).email(suffix + "@example.com")
                .role(Role.USER).status(UserStatus.ACTIVE).build();
        em.persist(user);
        return user;
    }

    // 모집 마감은 recruitDays일 뒤, 제출 마감은 submitDays일 뒤(음수면 지남)
    private Recruitment saveRecruitment(String title, int recruitDays, int submitDays) {
        Project project = Project.builder().user(developer).title(title + " 앱").imageUrl("https://img.test/app.png").build();
        em.persist(project);
        Recruitment saved = Recruitment.builder().project(project).title(title).description("써 봐 주세요")
                .conditions("누구나").accessUrl("https://beta.example.com")
                .recruitDeadline(LocalDateTime.now().plusDays(recruitDays)).feedbackDeadline(LocalDateTime.now().plusDays(submitDays))
                .selectionMode(SelectionMode.MANUAL).build();
        em.persist(saved);
        return saved;
    }

    private Register applied(Recruitment target) {
        return applied(target, tester);
    }

    private Register applied(Recruitment target, User user) {
        Register register = Register.builder().recruitment(target).user(user).build();
        em.persist(register);
        return register;
    }

    private Register confirmed(Recruitment target) {
        return confirmed(target, tester);
    }

    private Register confirmed(Recruitment target, User user) {
        Register register = applied(target, user);
        register.confirm(1000, 0, LocalDateTime.now());
        return register;
    }

    private Feedback feedback(Register register, LocalDateTime submittedAt) {
        Feedback saved = Feedback.builder().register(register).content("좋아요").submittedAt(submittedAt).build();
        em.persist(saved);
        return saved;
    }

    // user가 null이면 토큰 없이 보낸다
    private ResultActions send(User user, String path) throws Exception {
        var request = get(path);
        if (user != null) request.header("Authorization", "Bearer " + jwtProvider.createAccessToken(user.getId()));
        em.flush();
        em.clear();
        return mvc.perform(request);
    }

    private JsonNode data(ResultActions result) throws Exception {
        return JSON.readTree(result.andReturn().getResponse().getContentAsString()).get("data");
    }

    private static List<Long> ids(JsonNode rows) {
        List<Long> ids = new ArrayList<>();
        rows.forEach(row -> ids.add(row.get("id").asLong()));
        return ids;
    }

    @Test
    @DisplayName("#117-S1 탭별 목록과 정렬")
    void 탭마다_상태를_묶고_할_일_순서나_최근_순으로_준다() throws Exception {
        JsonNode applied = data(send(tester, BASE + "?tab=applied").andExpect(status().isOk()));
        assertThat(ids(applied)).containsExactly(pendingSooner.getId(), pendingLater.getId(), notSelected.getId());

        JsonNode ongoing = data(send(tester, BASE + "?tab=ongoing").andExpect(status().isOk()));
        assertThat(ids(ongoing)).containsExactly(beforeSooner.getId(), beforeLater.getId(), payoutPending.getId(), underReview.getId());

        JsonNode history = data(send(tester, BASE + "?tab=history").andExpect(status().isOk()));
        assertThat(ids(history)).containsExactly(paid.getId(), cancelled.getId(), excluded.getId(), incomplete.getId());

        /* 행에는 상태, 보상, 모집글 정보가 있고 상세의 항목·피드백·접속 링크는 없다 */
        JsonNode first = ongoing.get(0);
        assertThat(first.get("status").asText()).isEqualTo("beforeSubmit");
        assertThat(first.get("reward").asInt()).isEqualTo(1000);
        assertThat(first.get("earnedCredits").asInt()).isZero();
        assertThat(first.at("/recruitment/title").asText()).isEqualTo("제출 전 이름");
        assertThat(first.at("/recruitment/projectName").asText()).isEqualTo("제출 전 이름 앱");
        assertThat(first.at("/recruitment/submitDeadline").isNull()).isFalse();
        assertThat(first.has("accessUrl")).isFalse();
        assertThat(first.has("feedbacks")).isFalse();
        JsonNode payout = ongoing.get(2);
        assertThat(payout.get("status").asText()).isEqualTo("payoutPending");
        assertThat(LocalDateTime.parse(payout.get("payoutAt").asText()))
                .isEqualTo(LocalDateTime.parse(payout.get("submittedAt").asText()).plusHours(72));
        assertThat(history.get(0).get("earnedCredits").asInt()).isEqualTo(1000);
        assertThat(history.get(1).get("status").asText()).isEqualTo("cancelled");

        /* 탭을 비우면 참여 중 탭이다 */
        assertThat(ids(data(send(tester, BASE).andExpect(status().isOk())))).isEqualTo(ids(ongoing));
    }

    @Test
    @DisplayName("#117-S2 요약")
    void 탭별_개수와_제출할_피드백_수와_지급_대기_크레딧을_준다() throws Exception {
        send(tester, BASE + "/summary")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.counts.applied").value(3))
                .andExpect(jsonPath("$.data.counts.ongoing").value(4))
                .andExpect(jsonPath("$.data.counts.history").value(4))
                .andExpect(jsonPath("$.data.feedbackToSubmit").value(2))
                .andExpect(jsonPath("$.data.payoutPendingCredits").value(1000));
    }

    @Test
    @DisplayName("#117-S3 마감 일정")
    void 제출_전_참여만_제출_마감이_가까운_순서로_준다() throws Exception {
        JsonNode deadlines = data(send(tester, BASE + "/deadlines").andExpect(status().isOk()));
        assertThat(ids(deadlines)).containsExactly(beforeSooner.getId(), beforeLater.getId());
    }

    @Test
    @DisplayName("#117-S4 빈 목록, 없는 탭, 비로그인")
    void 참가가_없으면_비고_없는_탭은_400이고_비로그인은_401이다() throws Exception {
        User newcomer = saveUser();
        send(newcomer, BASE + "?tab=history").andExpect(status().isOk()).andExpect(jsonPath("$.data.length()").value(0));
        send(newcomer, BASE + "/deadlines").andExpect(status().isOk()).andExpect(jsonPath("$.data.length()").value(0));
        send(newcomer, BASE + "/summary")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.counts.applied").value(0))
                .andExpect(jsonPath("$.data.counts.ongoing").value(0))
                .andExpect(jsonPath("$.data.counts.history").value(0))
                .andExpect(jsonPath("$.data.feedbackToSubmit").value(0))
                .andExpect(jsonPath("$.data.payoutPendingCredits").value(0));

        send(tester, BASE + "?tab=done")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_INPUT"))
                .andExpect(jsonPath("$.error.fields.tab").value("탭을 확인해 주세요"));

        send(null, BASE).andExpect(status().isUnauthorized());
        send(null, BASE + "/summary").andExpect(status().isUnauthorized());
        send(null, BASE + "/deadlines").andExpect(status().isUnauthorized());
    }
}
