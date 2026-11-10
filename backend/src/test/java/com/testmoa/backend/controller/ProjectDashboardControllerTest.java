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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 내 프로젝트 전체 현황(#122). 요청부터 DB까지 확인한다
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
    @DisplayName("#122-S4 전체 현황")
    void 모든_프로젝트의_모집과_테스트와_완료된_모집을_센다() throws Exception {
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
                .andExpect(jsonPath("$.data.overview.closed").value(1));
    }

    @Test
    @DisplayName("#122-S5 내 것만")
    void 다른_회원의_모집은_세지_않고_없으면_빈_값이다() throws Exception {
        User other = saveUser();
        Recruitment others = recruiting(saveProject(other, "남의 프로젝트"), true);
        applied(others);

        dashboard(me)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.overview.recruiting").value(0))
                .andExpect(jsonPath("$.data.overview.testing").value(0))
                .andExpect(jsonPath("$.data.overview.closed").value(0));

        dashboard(saveUser())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.overview.recruiting").value(0));

        mvc.perform(get(DASHBOARD)).andExpect(status().isUnauthorized());
    }
}
