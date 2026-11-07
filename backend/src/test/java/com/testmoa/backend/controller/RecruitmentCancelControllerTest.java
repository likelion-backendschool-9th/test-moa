package com.testmoa.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.testmoa.backend.entity.Feedback;
import com.testmoa.backend.entity.Project;
import com.testmoa.backend.entity.Recruitment;
import com.testmoa.backend.entity.Register;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.entity.enums.RecruitmentStatus;
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
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 모집 취소(#116). 요청부터 DB까지 확인한다
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class RecruitmentCancelControllerTest {
    private static final ObjectMapper JSON = new ObjectMapper();

    @Autowired MockMvc mvc;
    @Autowired EntityManager em;
    @Autowired JwtProvider jwtProvider;

    private User developer;
    private User other;
    private Project project;

    @BeforeEach
    void setUp() {
        developer = saveUser();
        other = saveUser();
        project = Project.builder().user(developer).title("북로그").build();
        em.persist(project);
    }

    private User saveUser() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        User user = User.builder().name("김모아").nickname("모아" + suffix).email(suffix + "@example.com")
                .role(Role.USER).status(UserStatus.ACTIVE).build();
        em.persist(user);
        return user;
    }

    // 모집 마감은 recruitDays일 뒤, 제출 마감은 submitDays일 뒤(음수면 지남)
    private Recruitment saveRecruitment(SelectionMode mode, int recruitDays, int submitDays) {
        Recruitment recruitment = Recruitment.builder().project(project).title("북로그 베타").description("써 봐 주세요")
                .conditions("누구나").accessUrl("https://booklog.example.com")
                .recruitDeadline(LocalDateTime.now().plusDays(recruitDays))
                .feedbackDeadline(LocalDateTime.now().plusDays(submitDays))
                .selectionMode(mode).build();
        em.persist(recruitment);
        return recruitment;
    }

    private Recruitment recruiting(SelectionMode mode) {
        return saveRecruitment(mode, 3, 9);
    }

    private Recruitment testing() {
        return saveRecruitment(SelectionMode.MANUAL, -1, 5);
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

    private Register rejected(Recruitment recruitment) {
        Register register = applied(recruitment);
        register.reject();
        return register;
    }

    private void submitFeedback(Register register) {
        em.persist(Feedback.builder().register(register).content("검색이 느려요").submittedAt(LocalDateTime.now()).build());
    }

    // user가 null이면 토큰 없이, body가 null이면 본문 없이 보낸다
    private ResultActions send(User user, MockHttpServletRequestBuilder request, Object body) throws Exception {
        if (user != null) request.header("Authorization", "Bearer " + jwtProvider.createAccessToken(user.getId()));
        if (body != null) request.contentType(MediaType.APPLICATION_JSON).content(JSON.writeValueAsString(body));
        em.flush();
        em.clear();
        return mvc.perform(request);
    }

    private ResultActions cancel(User user, Recruitment recruitment, Object body) throws Exception {
        return send(user, post("/api/v1/developer/recruitments/" + recruitment.getId() + "/cancel"), body);
    }

    private RegisterStatus statusOf(Register register) {
        return em.find(Register.class, register.getId()).getStatus();
    }

    private Recruitment reload(Recruitment recruitment) {
        return em.find(Recruitment.class, recruitment.getId());
    }

    @Test
    @DisplayName("#116-S1 모집 중 사유 없이 취소")
    void 확정_테스터가_없으면_사유_없이_바로_취소한다() throws Exception {
        Recruitment recruitment = recruiting(SelectionMode.MANUAL);
        Register waiting = applied(recruitment);
        Register refused = rejected(recruitment);

        cancel(developer, recruitment, null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("cancelled"))
                .andExpect(jsonPath("$.data.cancelReason").doesNotExist())
                .andExpect(jsonPath("$.data.cancelledAt").exists())
                .andExpect(jsonPath("$.data.cancelledRegisterCount").value(1))
                .andExpect(jsonPath("$.data.keptRegisterCount").value(0));

        assertThat(reload(recruitment).getStatus()).isEqualTo(RecruitmentStatus.CANCELLED);
        assertThat(statusOf(waiting)).isEqualTo(RegisterStatus.CANCELLED);
        assertThat(statusOf(refused)).isEqualTo(RegisterStatus.REJECTED);

        /* 모집 중에는 사유를 보내도 저장하지 않는다 */
        Recruitment another = recruiting(SelectionMode.MANUAL);
        cancel(developer, another, Map.of("reason", "그냥")).andExpect(status().isOk());
        assertThat(reload(another).getCancelReason()).isNull();
    }

    @Test
    @DisplayName("#116-S2 확정 테스터가 있는 선발형 모집")
    void 확정_테스터가_있는_선발형_모집은_취소할_수_없다() throws Exception {
        Recruitment recruitment = recruiting(SelectionMode.MANUAL);
        Register picked = confirmed(recruitment);
        Register waiting = applied(recruitment);

        cancel(developer, recruitment, null)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("RECRUITMENT_NOT_CANCELLABLE"))
                .andExpect(jsonPath("$.error.message").value("확정된 테스터가 있어 취소할 수 없어요"));

        assertThat(reload(recruitment).getStatus()).isEqualTo(RecruitmentStatus.RECRUITING);
        assertThat(statusOf(picked)).isEqualTo(RegisterStatus.CONFIRMED);
        assertThat(statusOf(waiting)).isEqualTo(RegisterStatus.APPLIED);
    }

    @Test
    @DisplayName("#116-S3 선착순 모집은 확정 테스터가 있어도 취소")
    void 선착순_모집은_확정_테스터가_있어도_모집_중이면_취소한다() throws Exception {
        Recruitment recruitment = recruiting(SelectionMode.FIRST_COME);
        Register first = confirmed(recruitment);
        Register second = confirmed(recruitment);

        cancel(developer, recruitment, null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.cancelledRegisterCount").value(2));

        assertThat(statusOf(first)).isEqualTo(RegisterStatus.CANCELLED);
        assertThat(statusOf(second)).isEqualTo(RegisterStatus.CANCELLED);
    }

    @Test
    @DisplayName("#116-S4 테스트 중 사유를 적고 취소")
    void 테스트_중에는_사유가_있어야_취소하고_피드백을_낸_테스터는_남는다() throws Exception {
        Recruitment recruitment = testing();
        Register done = confirmed(recruitment);
        submitFeedback(done);
        Register notYet = confirmed(recruitment);
        Register waiting = applied(recruitment);

        cancel(developer, recruitment, null)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_INPUT"))
                .andExpect(jsonPath("$.error.fields.reason").value("취소 사유를 적어 주세요"));
        cancel(developer, recruitment, Map.of("reason", "   ")).andExpect(status().isBadRequest());
        assertThat(reload(recruitment).getStatus()).isEqualTo(RecruitmentStatus.RECRUITING);

        cancel(developer, recruitment, Map.of("reason", " 서버 장애로 진행할 수 없어요 "))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.cancelReason").value("서버 장애로 진행할 수 없어요"))
                .andExpect(jsonPath("$.data.cancelledRegisterCount").value(2))
                .andExpect(jsonPath("$.data.keptRegisterCount").value(1));

        assertThat(statusOf(done)).isEqualTo(RegisterStatus.CONFIRMED);
        assertThat(statusOf(notYet)).isEqualTo(RegisterStatus.CANCELLED);
        assertThat(statusOf(waiting)).isEqualTo(RegisterStatus.CANCELLED);
    }

    @Test
    @DisplayName("#116-S5 종료·취소된 모집")
    void 종료되거나_취소된_모집은_취소할_수_없다() throws Exception {
        Recruitment closed = saveRecruitment(SelectionMode.MANUAL, -9, -2);
        cancel(developer, closed, Map.of("reason", "사유"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("RECRUITMENT_NOT_CANCELLABLE"))
                .andExpect(jsonPath("$.error.message").value("지금은 모집을 취소할 수 없어요"));

        Recruitment recruitment = recruiting(SelectionMode.MANUAL);
        cancel(developer, recruitment, null).andExpect(status().isOk());
        LocalDateTime firstCancelledAt = reload(recruitment).getCancelledAt();
        cancel(developer, recruitment, null)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("RECRUITMENT_NOT_CANCELLABLE"));
        assertThat(reload(recruitment).getCancelledAt()).isEqualTo(firstCancelledAt);
    }

    @Test
    @DisplayName("#116-S6 남의 모집, 비로그인, 긴 사유")
    void 남의_모집과_비로그인과_긴_사유는_막는다() throws Exception {
        Recruitment recruitment = testing();

        cancel(other, recruitment, Map.of("reason", "사유"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("NOT_FOUND"));
        send(developer, post("/api/v1/developer/recruitments/999999999/cancel"), null)
                .andExpect(status().isNotFound());
        cancel(null, recruitment, Map.of("reason", "사유")).andExpect(status().isUnauthorized());
        cancel(developer, recruitment, Map.of("reason", "가".repeat(301)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.fields.reason").value("취소 사유는 300자까지 쓸 수 있어요"));

        assertThat(reload(recruitment).getStatus()).isEqualTo(RecruitmentStatus.RECRUITING);
    }

    @Test
    @DisplayName("#116-S7 모집 건 목록에서 취소 사유와 시각을 다시 본다")
    void 모집_건_목록에_취소_사유와_시각이_있다() throws Exception {
        Recruitment recruitment = testing();
        cancel(developer, recruitment, Map.of("reason", "서버 장애")).andExpect(status().isOk());

        send(developer, get("/api/v1/developer/projects/" + project.getId() + "/recruitments"), null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].status").value("cancelled"))
                .andExpect(jsonPath("$.data[0].cancelReason").value("서버 장애"))
                .andExpect(jsonPath("$.data[0].cancelledAt").exists());
    }
}
