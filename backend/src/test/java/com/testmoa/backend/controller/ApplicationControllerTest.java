package com.testmoa.backend.controller;

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
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 테스트 지원(#114). 요청부터 DB까지 확인한다
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ApplicationControllerTest {
    @Autowired MockMvc mvc;
    @Autowired EntityManager em;
    @Autowired JwtProvider jwtProvider;

    private User developer;
    private User tester;
    private Project project;

    @BeforeEach
    void setUp() {
        developer = saveUser();
        tester = saveUser();
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

    // 모집 마감은 recruitDays일 뒤(음수면 지남)
    private Recruitment saveRecruitment(SelectionMode mode, int recruitDays) {
        Recruitment recruitment = Recruitment.builder().project(project).title("북로그 베타").description("써 봐 주세요")
                .conditions("누구나").accessUrl("https://booklog.example.com")
                .recruitDeadline(LocalDateTime.now().plusDays(recruitDays))
                .feedbackDeadline(LocalDateTime.now().plusDays(recruitDays + 7))
                .selectionMode(mode).build();
        em.persist(recruitment);
        return recruitment;
    }

    // user가 null이면 토큰 없이 부른다
    private ResultActions apply(User user, Long recruitmentId) throws Exception {
        var request = post("/api/v1/recruitments/" + recruitmentId + "/applications");
        if (user != null) request.header("Authorization", "Bearer " + jwtProvider.createAccessToken(user.getId()));
        em.flush();
        em.clear();
        return mvc.perform(request);
    }

    private List<Register> registersOf(User user, Recruitment recruitment) {
        return em.createQuery("select r from registers r where r.user.id = :userId and r.recruitment.id = :recruitmentId order by r.id",
                        Register.class)
                .setParameter("userId", user.getId()).setParameter("recruitmentId", recruitment.getId()).getResultList();
    }

    @Test
    @DisplayName("#114-S1 선발형 모집 지원")
    void 선발형_모집은_선정_대기로_저장된다() throws Exception {
        Recruitment recruitment = saveRecruitment(SelectionMode.MANUAL, 3);

        apply(tester, recruitment.getId())
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.registerId").exists())
                .andExpect(jsonPath("$.data.recruitmentId").value(recruitment.getId()))
                .andExpect(jsonPath("$.data.status").value("applied"))
                .andExpect(jsonPath("$.data.appliedAt").exists())
                .andExpect(jsonPath("$.data.confirmedAt").doesNotExist())
                .andExpect(jsonPath("$.data.baseReward").doesNotExist());

        List<Register> saved = registersOf(tester, recruitment);
        assertThat(saved).hasSize(1);
        assertThat(saved.get(0).getStatus()).isEqualTo(RegisterStatus.APPLIED);
        assertThat(saved.get(0).getBaseRewardSnapshot()).isNull();
    }

    @Test
    @DisplayName("#114-S2 선착순 모집 지원")
    void 선착순_모집은_바로_확정되고_기본_보상이_고정된다() throws Exception {
        Recruitment recruitment = saveRecruitment(SelectionMode.FIRST_COME, 3);

        apply(tester, recruitment.getId())
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.registerId").exists())
                .andExpect(jsonPath("$.data.status").value("confirmed"))
                .andExpect(jsonPath("$.data.confirmedAt").exists())
                .andExpect(jsonPath("$.data.baseReward").value(1000));

        Register saved = registersOf(tester, recruitment).get(0);
        assertThat(saved.getStatus()).isEqualTo(RegisterStatus.CONFIRMED);
        assertThat(saved.getBaseRewardSnapshot()).isEqualTo(1000);
        assertThat(saved.getExtraRewardSnapshot()).isZero();
        assertThat(saved.getConfirmedAt()).isEqualTo(saved.getAppliedAt());
    }

    @Test
    @DisplayName("#114-S3 다시 지원")
    void 이미_지원했거나_거절됐으면_다시_지원할_수_없고_참여_취소면_다시_지원한다() throws Exception {
        Recruitment recruitment = saveRecruitment(SelectionMode.MANUAL, 3);
        apply(tester, recruitment.getId()).andExpect(status().isCreated());

        apply(tester, recruitment.getId())
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("ALREADY_APPLIED"))
                .andExpect(jsonPath("$.error.message").value("이미 지원한 테스트예요"));
        assertThat(registersOf(tester, recruitment)).hasSize(1);

        /* 거절된 지원도 다시 지원을 막는다 */
        registersOf(tester, recruitment).get(0).reject();
        apply(tester, recruitment.getId()).andExpect(status().isConflict());

        /* 참여 취소만 남았으면 다시 지원할 수 있다 */
        User other = saveUser();
        Register cancelled = Register.builder().recruitment(em.find(Recruitment.class, recruitment.getId())).user(other).build();
        em.persist(cancelled);
        cancelled.cancel();
        apply(other, recruitment.getId()).andExpect(status().isCreated());
        assertThat(registersOf(other, recruitment)).extracting(Register::getStatus)
                .containsExactly(RegisterStatus.CANCELLED, RegisterStatus.APPLIED);
    }

    @Test
    @DisplayName("#114-S4 마감·취소·없는 모집")
    void 마감되거나_취소되거나_없는_모집에는_지원할_수_없다() throws Exception {
        Recruitment closed = saveRecruitment(SelectionMode.FIRST_COME, -1);
        apply(tester, closed.getId())
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("RECRUITMENT_CLOSED"))
                .andExpect(jsonPath("$.error.message").value("모집이 마감됐어요"));

        Recruitment cancelled = saveRecruitment(SelectionMode.MANUAL, 3);
        cancelled.cancel(null, LocalDateTime.now());
        apply(tester, cancelled.getId())
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("NOT_FOUND"));

        apply(tester, 999_999_999L).andExpect(status().isNotFound());

        /* 저장 상태가 RECRUITING이 아니면(지금은 쓰지 않는 CLOSED) 마감일이 남아도 마감이다 */
        Recruitment storedClosed = saveRecruitment(SelectionMode.FIRST_COME, 3);
        em.flush();
        em.createNativeQuery("update recruitments set status = 'CLOSED' where id = :id")
                .setParameter("id", storedClosed.getId()).executeUpdate();
        apply(tester, storedClosed.getId())
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("RECRUITMENT_CLOSED"));
        assertThat(registersOf(tester, storedClosed)).isEmpty();

        assertThat(registersOf(tester, closed)).isEmpty();
        assertThat(registersOf(tester, cancelled)).isEmpty();
    }

    @Test
    @DisplayName("#114-S5 자기 모집")
    void 자기_모집에는_지원할_수_없다() throws Exception {
        Recruitment recruitment = saveRecruitment(SelectionMode.FIRST_COME, 3);

        apply(developer, recruitment.getId())
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("OWN_RECRUITMENT"))
                .andExpect(jsonPath("$.error.message").value("내 모집에는 지원할 수 없어요"));
        assertThat(registersOf(developer, recruitment)).isEmpty();
    }

    @Test
    @DisplayName("#114-S6 비로그인")
    void 비로그인은_지원할_수_없다() throws Exception {
        Recruitment recruitment = saveRecruitment(SelectionMode.MANUAL, 3);

        apply(null, recruitment.getId()).andExpect(status().isUnauthorized());
        assertThat(em.createQuery("select count(r) from registers r where r.recruitment.id = :id", Long.class)
                .setParameter("id", recruitment.getId()).getSingleResult()).isZero();
    }
}
