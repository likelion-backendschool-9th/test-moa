package com.testmoa.backend.controller.tester;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.testmoa.backend.entity.Feedback;
import com.testmoa.backend.entity.Project;
import com.testmoa.backend.entity.Recruitment;
import com.testmoa.backend.entity.Register;
import com.testmoa.backend.entity.TestItem;
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
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 테스터의 지원 취소(#286). 요청부터 DB까지 확인한다
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ParticipationCancelControllerTest {
    private static final String BASE = "/api/v1/tester/participations/";
    private static final ObjectMapper JSON = new ObjectMapper();

    @Autowired MockMvc mvc;
    @Autowired EntityManager em;
    @Autowired JwtProvider jwtProvider;

    private User developer;
    private User tester;

    @BeforeEach
    void setUp() {
        developer = saveUser();
        tester = saveUser();
    }

    private User saveUser() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        User user = User.builder().name("김모아").nickname("모아" + suffix).email(suffix + "@example.com")
                .role(Role.USER).status(UserStatus.ACTIVE).build();
        em.persist(user);
        return user;
    }

    // 모집 마감은 recruitDays일 뒤(음수면 지나 테스트 중), 제출 마감은 그 7일 뒤
    private Recruitment saveRecruitment(SelectionMode mode, int recruitDays) {
        Project project = Project.builder().user(developer).title("북로그").build();
        em.persist(project);
        Recruitment saved = Recruitment.builder().project(project).title("북로그 1차 테스트").description("밑줄 저장을 써 봐 주세요")
                .conditions("누구나").accessUrl("https://beta.booklog.example.com")
                .recruitDeadline(LocalDateTime.now().plusDays(recruitDays)).feedbackDeadline(LocalDateTime.now().plusDays(recruitDays + 7))
                .selectionMode(mode).build();
        em.persist(saved);
        em.persist(TestItem.builder().recruitment(saved).title("밑줄 저장").required(true).build());
        return saved;
    }

    private Register applied(Recruitment recruitment) {
        Register register = Register.builder().recruitment(recruitment).user(tester).build();
        em.persist(register);
        return register;
    }

    private Register confirmed(Recruitment recruitment) {
        Register register = applied(recruitment);
        register.confirm(1000, 0, LocalDateTime.now());
        return register;
    }

    // user가 null이면 토큰 없이 보낸다
    private ResultActions send(User user, MockHttpServletRequestBuilder request) throws Exception {
        if (user != null) request.header("Authorization", "Bearer " + jwtProvider.createAccessToken(user.getId()));
        em.flush();
        em.clear();
        return mvc.perform(request);
    }

    private ResultActions cancel(User user, Register register) throws Exception {
        return send(user, post(BASE + register.getId() + "/cancel"));
    }

    private Register reload(Register register) {
        em.flush();
        em.clear();
        return em.find(Register.class, register.getId());
    }

    private JsonNode data(ResultActions result) throws Exception {
        return JSON.readTree(result.andReturn().getResponse().getContentAsString()).get("data");
    }

    @Test
    @DisplayName("#286-S1 선정 대기인 지원을 취소한다")
    void 대기_지원을_취소하면_참여_취소가_되고_참여했던_탭에_취소일과_함께_보인다() throws Exception {
        Register register = applied(saveRecruitment(SelectionMode.MANUAL, 3));

        cancel(tester, register).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("cancelled"))
                .andExpect(jsonPath("$.data.accessUrl").doesNotExist());

        Register saved = reload(register);
        assertThat(saved.getStatus()).isEqualTo(RegisterStatus.CANCELLED);
        assertThat(saved.getCancelledAt()).isNotNull();
        JsonNode history = data(send(tester, get("/api/v1/tester/participations").param("tab", "history")).andExpect(status().isOk()));
        assertThat(history).hasSize(1);
        assertThat(history.get(0).get("status").asText()).isEqualTo("cancelled");
        /* 행의 날짜는 지원일이 아니라 취소일이다 */
        assertThat(history.get(0).get("keyDate").asText())
                .isEqualTo(DateTimeFormatter.ISO_OFFSET_DATE_TIME.format(saved.getCancelledAt().atZone(ZoneId.systemDefault())));
    }

    @Test
    @DisplayName("#286-S2 확정된 참가도 테스트 시작 전이고 피드백을 내기 전이면 취소한다")
    void 선착순과_선발형의_확정_참가를_취소하면_개발자_지원자_목록에_참여_취소로_보인다() throws Exception {
        for (SelectionMode mode : SelectionMode.values()) {
            Recruitment recruitment = saveRecruitment(mode, 3);
            Register register = confirmed(recruitment);

            cancel(tester, register).andExpect(status().isOk()).andExpect(jsonPath("$.data.status").value("cancelled"));

            send(developer, get("/api/v1/developer/recruitments/" + recruitment.getId() + "/applications"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data[0].status").value("cancelled"));
        }
    }

    @Test
    @DisplayName("#286-S3 테스트가 시작됐거나 피드백을 냈거나 끝난 참가는 취소할 수 없다")
    void 취소할_수_없는_참가는_409이고_상태가_그대로다() throws Exception {
        Register testing = confirmed(saveRecruitment(SelectionMode.FIRST_COME, -1));
        Register submitted = confirmed(saveRecruitment(SelectionMode.FIRST_COME, 3));
        em.persist(Feedback.builder().register(submitted).content("좋아요").submittedAt(LocalDateTime.now()).build());
        Register rejected = applied(saveRecruitment(SelectionMode.MANUAL, 3));
        rejected.reject();
        Register cancelled = applied(saveRecruitment(SelectionMode.MANUAL, 3));
        cancelled.cancel(LocalDateTime.now());

        for (Register register : new Register[]{testing, submitted, rejected, cancelled}) {
            RegisterStatus before = register.getStatus();
            cancel(tester, register).andExpect(status().isConflict())
                    .andExpect(jsonPath("$.error.code").value("PARTICIPATION_NOT_CANCELLABLE"));
            assertThat(reload(register).getStatus()).isEqualTo(before);
        }
    }

    @Test
    @DisplayName("#286-S4 다른 회원의 참가와 비로그인")
    void 다른_회원의_참가는_404이고_비로그인은_401이다() throws Exception {
        Register register = applied(saveRecruitment(SelectionMode.MANUAL, 3));

        cancel(developer, register).andExpect(status().isNotFound());
        cancel(null, register).andExpect(status().isUnauthorized());
        assertThat(reload(register).getStatus()).isEqualTo(RegisterStatus.APPLIED);
    }

    @Test
    @DisplayName("#286-S5 취소한 뒤 모집 중이면 다시 지원한다")
    void 취소한_뒤_다시_지원하면_새_참가가_생긴다() throws Exception {
        Recruitment recruitment = saveRecruitment(SelectionMode.FIRST_COME, 3);
        Register register = confirmed(recruitment);
        cancel(tester, register).andExpect(status().isOk());

        send(tester, post("/api/v1/recruitments/" + recruitment.getId() + "/applications"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status").value("confirmed"));
        send(tester, get("/api/v1/recruitments/" + recruitment.getId()))
                .andExpect(jsonPath("$.data.myRegisterStatus").value("confirmed"));
    }
}
