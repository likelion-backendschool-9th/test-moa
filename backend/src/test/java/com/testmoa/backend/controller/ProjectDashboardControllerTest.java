package com.testmoa.backend.controller;

import com.testmoa.backend.support.ChatFixtures;
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
import java.util.UUID;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 내 프로젝트의 할 일·전체 현황(#122). 요청부터 DB까지 확인한다
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ProjectDashboardControllerTest {
    private static final String DASHBOARD = "/api/v1/developer/projects/dashboard";

    @Autowired MockMvc mvc;
    @Autowired EntityManager em;
    @Autowired JwtProvider jwtProvider;

    private User me;
    private Project project;

    @BeforeEach
    void setUp() {
        me = saveUser();
        project = saveProject(me, "북로그");
    }

    private User saveUser() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        User user = User.builder().name("김모아").nickname("모아" + suffix).email(suffix + "@example.com")
                .role(Role.USER).status(UserStatus.ACTIVE).build();
        em.persist(user);
        return user;
    }

    private Project saveProject(User owner, String title) {
        Project saved = Project.builder().user(owner).title(title).build();
        em.persist(saved);
        return saved;
    }

    // 구독 여부는 DB가 읽을 때 계산하는 값이라, 저장만 한 엔티티에는 아직 채워지지 않는다. 구독을 만든 뒤 다시 읽어 맞춘다
    private void refreshSubscription(Recruitment recruitment, boolean subscription) {
        if (!subscription) return;
        em.flush();
        em.refresh(recruitment);
    }

    private Recruitment save(Project owner, boolean subscription, LocalDateTime recruitDeadline, LocalDateTime feedbackDeadline) {
        Recruitment recruitment = Recruitment.builder().project(owner).title("모집")
                .recruitDeadline(recruitDeadline).feedbackDeadline(feedbackDeadline)
                .selectionMode(SelectionMode.MANUAL).build();
        if (subscription) new ChatFixtures(em).subscribe(owner.getUser());
        em.persist(recruitment);
        refreshSubscription(recruitment, subscription);
        return recruitment;
    }

    private Recruitment recruiting(Project owner, boolean subscription) {
        return save(owner, subscription, LocalDateTime.now().plusDays(3), LocalDateTime.now().plusDays(8));
    }

    private Recruitment testing(Project owner) {
        return save(owner, false, LocalDateTime.now().minusDays(1), LocalDateTime.now().plusDays(5));
    }

    private Recruitment closed(Project owner) {
        return save(owner, true, LocalDateTime.now().minusDays(10), LocalDateTime.now().minusDays(1));
    }

    private Register applied(Recruitment recruitment) {
        Register register = Register.builder().recruitment(recruitment).user(saveUser()).build();
        em.persist(register);
        return register;
    }

    private Register confirmed(Recruitment recruitment) {
        Register register = applied(recruitment);
        register.confirm(1000, 0, LocalDateTime.now());
        return register;
    }

    private Feedback feedback(Recruitment recruitment, LocalDateTime submittedAt) {
        Feedback saved = Feedback.builder().register(confirmed(recruitment)).content("내용").submittedAt(submittedAt).build();
        em.persist(saved);
        return saved;
    }

    private ResultActions dashboard(User user) throws Exception {
        em.flush();
        em.clear();
        return mvc.perform(get(DASHBOARD).header("Authorization", "Bearer " + jwtProvider.createAccessToken(user.getId())));
    }

    @Test
    @DisplayName("#122-S1 지원자 할 일")
    void 구독_모집_중인_모집의_대기_지원자만_센다() throws Exception {
        Recruitment target = recruiting(project, true);
        applied(target);
        applied(target);
        confirmed(target);

        applied(recruiting(project, false));
        applied(closed(project));
        recruiting(project, true);
        Recruitment cancelled = recruiting(project, true);
        applied(cancelled);
        cancelled.cancel(null, LocalDateTime.now());

        dashboard(me)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.todos", hasSize(1)))
                .andExpect(jsonPath("$.data.todos[0].kind").value("applicants"))
                .andExpect(jsonPath("$.data.todos[0].recruitmentId").value(target.getId()))
                .andExpect(jsonPath("$.data.todos[0].projectName").value("북로그"))
                .andExpect(jsonPath("$.data.todos[0].count").value(2))
                .andExpect(jsonPath("$.data.todos[0].payoutAt").value(nullValue()));
    }

    @Test
    @DisplayName("#122-S2 신고 대기 피드백")
    void 제출_후_72시간이_지나지_않은_제출_상태_피드백만_센다() throws Exception {
        Recruitment target = testing(project);
        LocalDateTime earlier = LocalDateTime.of(LocalDateTime.now().minusHours(10).toLocalDate(), LocalDateTime.now().minusHours(10).toLocalTime().withNano(0));
        feedback(target, earlier);
        feedback(target, earlier.plusHours(5));
        feedback(target, LocalDateTime.now().minusHours(73));
        feedback(target, LocalDateTime.now().minusHours(2)).report("문제가 있어요");

        Recruitment cancelled = testing(project);
        feedback(cancelled, LocalDateTime.now().minusHours(1));
        cancelled.cancel("사유", LocalDateTime.now());

        dashboard(me)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.todos", hasSize(1)))
                .andExpect(jsonPath("$.data.todos[0].kind").value("feedback"))
                .andExpect(jsonPath("$.data.todos[0].recruitmentId").value(target.getId()))
                .andExpect(jsonPath("$.data.todos[0].count").value(2))
                .andExpect(jsonPath("$.data.todos[0].payoutAt", startsWith(earlier.plusHours(72).toString().substring(0, 16))));
    }

    @Test
    @DisplayName("#122-S3 순서")
    void 지원자가_먼저이고_피드백은_자동_지급이_가까운_순서다() throws Exception {
        Recruitment later = testing(project);
        feedback(later, LocalDateTime.now().minusHours(1));
        Recruitment sooner = testing(project);
        feedback(sooner, LocalDateTime.now().minusHours(60));
        Recruitment waiting = recruiting(project, true);
        applied(waiting);

        dashboard(me)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.todos[*].kind", contains("applicants", "feedback", "feedback")))
                .andExpect(jsonPath("$.data.todos[*].recruitmentId", contains(
                        waiting.getId().intValue(), sooner.getId().intValue(), later.getId().intValue())));
    }

    @Test
    @DisplayName("#122-S4 전체 현황")
    void 모든_프로젝트의_진행_중인_모집과_신고_대기를_센다() throws Exception {
        Project second = saveProject(me, "메모");
        recruiting(project, false);
        recruiting(second, true);
        Recruitment inTest = testing(second);
        feedback(inTest, LocalDateTime.now().minusHours(3));
        feedback(inTest, LocalDateTime.now().minusHours(2));
        closed(project);
        recruiting(second, false).cancel(null, LocalDateTime.now());

        dashboard(me)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.overview.recruiting").value(2))
                .andExpect(jsonPath("$.data.overview.testing").value(1))
                .andExpect(jsonPath("$.data.overview.waitingReports").value(2));
    }

    @Test
    @DisplayName("#122-S5 내 것만")
    void 다른_회원의_모집은_세지_않고_없으면_빈_값이다() throws Exception {
        User other = saveUser();
        Recruitment others = recruiting(saveProject(other, "남의 프로젝트"), true);
        applied(others);

        dashboard(me)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.todos", empty()))
                .andExpect(jsonPath("$.data.overview.recruiting").value(0))
                .andExpect(jsonPath("$.data.overview.testing").value(0))
                .andExpect(jsonPath("$.data.overview.waitingReports").value(0));

        dashboard(saveUser())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.todos", empty()));

        mvc.perform(get(DASHBOARD)).andExpect(status().isUnauthorized());
    }
}
