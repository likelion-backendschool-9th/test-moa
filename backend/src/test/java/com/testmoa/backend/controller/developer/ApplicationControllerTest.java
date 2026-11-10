package com.testmoa.backend.controller.developer;

import com.testmoa.backend.support.ChatFixtures;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.testmoa.backend.entity.Feedback;
import com.testmoa.backend.entity.Project;
import com.testmoa.backend.entity.Recruitment;
import com.testmoa.backend.entity.Register;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.entity.enums.RegisterStatus;
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
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 테스터 관리 탭의 지원 목록과 확정·거절(#175). 요청부터 DB까지 확인한다
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ApplicationControllerTest {
    private static final String RECRUITMENTS = "/api/v1/developer/recruitments";
    private static final ObjectMapper JSON = new ObjectMapper();

    @Autowired MockMvc mvc;
    @Autowired EntityManager em;
    @Autowired JwtProvider jwtProvider;

    private User developer;
    private Project project;

    @BeforeEach
    void setUp() {
        developer = saveUser("개발자");
        project = Project.builder().user(developer).title("북로그").build();
        em.persist(project);
    }

    private User saveUser(String nickname) {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        User user = User.builder().name("김모아").nickname(nickname + suffix).email(suffix + "@example.com")
                .role(Role.USER).status(UserStatus.ACTIVE).build();
        em.persist(user);
        return user;
    }

    // 모집 마감을 지금부터 며칠 뒤로 둔다. 음수면 마감된 모집이다
    private Recruitment saveRecruitment(boolean subscription, SelectionMode selectionMode, int recruitDays) {
        Recruitment recruitment = Recruitment.builder().project(project).title("2차 모집")
                .recruitDeadline(LocalDateTime.now().plusDays(recruitDays)).feedbackDeadline(LocalDateTime.now().plusDays(9))
                .selectionMode(selectionMode).build();
        if (subscription) new ChatFixtures(em).subscribe(developer);
        em.persist(recruitment);
        return recruitment;
    }

    private Register apply(Recruitment recruitment, User tester) {
        Register register = Register.builder().recruitment(recruitment).user(tester).build();
        em.persist(register);
        em.flush();
        return register;
    }

    private ResultActions send(User user, MockHttpServletRequestBuilder request, Object body) throws Exception {
        request.header("Authorization", "Bearer " + jwtProvider.createAccessToken(user.getId()));
        if (body != null) request.contentType(MediaType.APPLICATION_JSON).content(JSON.writeValueAsString(body));
        em.flush();
        ResultActions result = mvc.perform(request);
        em.flush();
        em.clear();
        return result;
    }

    private ResultActions decide(Recruitment recruitment, List<Long> ids, String status) throws Exception {
        return send(developer, patch(RECRUITMENTS + "/" + recruitment.getId() + "/applications"), Map.of("registerIds", ids, "status", status));
    }

    private RegisterStatus statusOf(Register register) {
        return em.find(Register.class, register.getId()).getStatus();
    }

    @Test
    @DisplayName("#175-S7 지원 목록")
    void 지원한_순서대로_닉네임과_피드백_제출_여부를_준다() throws Exception {
        Recruitment recruitment = saveRecruitment(true, SelectionMode.MANUAL, 3);
        Register waiting = apply(recruitment, saveUser("대기"));
        Register confirmed = apply(recruitment, saveUser("확정"));
        confirmed.confirm(1000, 0, LocalDateTime.now());
        em.persist(Feedback.builder().register(confirmed).content("검색이 느려요").submittedAt(LocalDateTime.now()).build());
        apply(saveRecruitment(true, SelectionMode.MANUAL, 3), saveUser("다른모집"));

        send(developer, get(RECRUITMENTS + "/" + recruitment.getId() + "/applications"), null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].registerId", contains(waiting.getId().intValue(), confirmed.getId().intValue())))
                .andExpect(jsonPath("$.data[*].status", contains("applied", "confirmed")))
                .andExpect(jsonPath("$.data[*].feedbackSubmitted", contains(false, true)))
                .andExpect(jsonPath("$.data[0].nickname").value(waiting.getUser().getNickname()))
                .andExpect(jsonPath("$.data[0].appliedAt").isNotEmpty());

        send(saveUser("남"), get(RECRUITMENTS + "/" + recruitment.getId() + "/applications"), null).andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("#175-S8 지원자 확정·거절")
    void 고른_지원을_한_번에_확정하거나_거절한다() throws Exception {
        Recruitment recruitment = saveRecruitment(true, SelectionMode.MANUAL, 3);
        Register first = apply(recruitment, saveUser("첫"));
        Register second = apply(recruitment, saveUser("둘"));
        Register third = apply(recruitment, saveUser("셋"));

        decide(recruitment, List.of(first.getId(), second.getId(), first.getId()), "confirmed").andExpect(status().isOk());
        decide(recruitment, List.of(third.getId()), "rejected").andExpect(status().isOk());

        Register saved = em.find(Register.class, first.getId());
        assertThat(saved.getStatus()).isEqualTo(RegisterStatus.CONFIRMED);
        assertThat(saved.getBaseRewardSnapshot()).isEqualTo(1000);
        assertThat(saved.getConfirmedAt()).isNotNull();
        assertThat(statusOf(second)).isEqualTo(RegisterStatus.CONFIRMED);
        assertThat(statusOf(third)).isEqualTo(RegisterStatus.REJECTED);
    }

    @Test
    @DisplayName("#175-S9 확정·거절할 수 없는 경우")
    void 선발형_구독_모집의_모집_기간에_지원_상태만_고를_수_있다() throws Exception {
        for (Recruitment recruitment : List.of(
                saveRecruitment(false, SelectionMode.MANUAL, 3),
                saveRecruitment(true, SelectionMode.FIRST_COME, 3),
                saveRecruitment(true, SelectionMode.MANUAL, -1))) {
            Register register = apply(recruitment, saveUser("막힘"));
            decide(recruitment, List.of(register.getId()), "confirmed")
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.error.code").value("APPLICANTS_NOT_SELECTABLE"));
            assertThat(statusOf(register)).isEqualTo(RegisterStatus.APPLIED);
        }

        Recruitment recruitment = saveRecruitment(true, SelectionMode.MANUAL, 3);
        Register waiting = apply(recruitment, saveUser("대기"));
        Register rejected = apply(recruitment, saveUser("거절"));
        rejected.reject();
        Register others = apply(saveRecruitment(true, SelectionMode.MANUAL, 3), saveUser("다른모집"));
        for (Long wrong : List.of(rejected.getId(), others.getId())) {
            decide(recruitment, List.of(waiting.getId(), wrong), "confirmed")
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error.code").value("INVALID_INPUT"));
        }
        assertThat(statusOf(waiting)).isEqualTo(RegisterStatus.APPLIED);

        decide(recruitment, List.of(waiting.getId()), "hold").andExpect(status().isBadRequest());
        send(saveUser("남"), patch(RECRUITMENTS + "/" + recruitment.getId() + "/applications"),
                Map.of("registerIds", List.of(waiting.getId()), "status", "confirmed")).andExpect(status().isNotFound());
        assertThat(statusOf(waiting)).isEqualTo(RegisterStatus.APPLIED);
    }
}
