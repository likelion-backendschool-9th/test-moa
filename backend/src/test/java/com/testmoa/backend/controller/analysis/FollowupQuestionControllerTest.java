package com.testmoa.backend.controller.analysis;

import com.testmoa.backend.entity.Feedback;
import com.testmoa.backend.entity.Plan;
import com.testmoa.backend.entity.Project;
import com.testmoa.backend.entity.Recruitment;
import com.testmoa.backend.entity.Register;
import com.testmoa.backend.entity.Subscription;
import com.testmoa.backend.entity.TestItem;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.global.client.AnalysisClient;
import com.testmoa.backend.global.client.AnalysisClient.FollowupRequest;
import com.testmoa.backend.global.security.Role;
import com.testmoa.backend.entity.enums.SelectionMode;
import com.testmoa.backend.entity.enums.UserStatus;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.global.security.JwtProvider;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * AI 후속 질문 추천 API. 분석 서버 호출(AnalysisClient)은 가짜로 바꾸고, 보낼 요청에 담긴 값을 확인함.
 * 하루 한도는 서버 메모리라 테스트끼리 남지만 테스트마다 새 회원을 씀
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class FollowupQuestionControllerTest {
    private static final List<String> QUESTIONS = List.of("어떤 순서로 올리셨나요?", "몇 장을 올리셨나요?", "바뀐 순서는 어땠나요?");

    @Autowired MockMvc mvc;
    @Autowired EntityManager em;
    @Autowired JwtProvider jwtProvider;
    @MockitoBean AnalysisClient analysisClient;

    private User saveUser() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        User user = User.builder().name("김모아").nickname("모아" + suffix).email(suffix + "@example.com")
                .role(Role.USER).status(UserStatus.ACTIVE).build();
        em.persist(user);
        return user;
    }

    // 플랜은 (tier, version)이 겹치면 저장되지 않아(uk_plans_tier_version) 테스트마다 한 번만 만들고 함께 씀
    private Plan plan;

    private Plan plan() {
        if (plan == null) {
            // DB에 같은 (tier, version) 플랜이 이미 있으면 새로 저장하지 않고 그것을 씀
            List<Plan> existing = em.createQuery("select p from plans p where p.tier = '구독' and p.version = 1", Plan.class)
                    .getResultList();
            if (!existing.isEmpty()) return plan = existing.get(0);
            plan = Plan.builder().tier("구독").cashPrice(10000).creditPrice(9000).monthlyRecruitLimit(30)
                    .version(1).periodDays(30).build();
            em.persist(plan);
        }
        return plan;
    }

    private User saveSubscriber() {
        User user = saveUser();
        LocalDateTime now = LocalDateTime.now();
        em.persist(Subscription.builder().user(user).plan(plan()).startAt(now.minusDays(1)).endAt(now.plusDays(29)).build());
        return user;
    }

    // developer의 프로젝트에 새 테스터가 남긴 리뷰. testItemTitle이 null이면 기타 의견
    private Feedback saveFeedback(User developer, String projectDescription, String testItemTitle) {
        LocalDateTime now = LocalDateTime.now();
        Project project = Project.builder().user(developer).title("북로그").description(projectDescription).build();
        em.persist(project);
        Recruitment recruitment = Recruitment.builder().project(project).title("1차 베타 테스트").description("기록 화면을 봐 주세요")
                .recruitDeadline(now.plusDays(7)).feedbackDeadline(now.plusDays(14)).selectionMode(SelectionMode.FIRST_COME).build();
        em.persist(recruitment);
        Register register = Register.builder().recruitment(recruitment).user(saveUser()).build();
        em.persist(register);
        TestItem testItem = null;
        if (testItemTitle != null) {
            testItem = TestItem.builder().recruitment(recruitment).title(testItemTitle).required(true).build();
            em.persist(testItem);
        }
        Feedback feedback = Feedback.builder().register(register).testItem(testItem)
                .content("사진을 여러 장 올리면 순서가 바뀌어요").submittedAt(now).build();
        em.persist(feedback);
        return feedback;
    }

    private Feedback saveFeedback(User developer) {
        return saveFeedback(developer, "독서 기록 앱", "사진 올리기");
    }

    private ResultActions recommend(User user, Long feedbackId) throws Exception {
        return mvc.perform(post("/api/v1/developer/feedbacks/{feedbackId}/followup-questions", feedbackId)
                .header("Authorization", "Bearer " + jwtProvider.createAccessToken(user.getId())));
    }

    private FollowupRequest sentRequest() {
        ArgumentCaptor<FollowupRequest> captor = ArgumentCaptor.forClass(FollowupRequest.class);
        verify(analysisClient).suggestFollowupQuestions(captor.capture());
        return captor.getValue();
    }

    @Test
    @DisplayName("#109-S1 구독한 프로젝트 주인이 리뷰로 요청하면 프로젝트·모집글·리뷰 정보를 보내고 질문을 받는다")
    void 질문을_받는다() throws Exception {
        User developer = saveSubscriber();
        Feedback feedback = saveFeedback(developer);
        given(analysisClient.suggestFollowupQuestions(any())).willReturn(QUESTIONS);

        recommend(developer, feedback.getId())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.questions", contains(QUESTIONS.toArray())));

        FollowupRequest sent = sentRequest();
        assertThat(sent.context().projectTitle()).isEqualTo("북로그");
        assertThat(sent.context().projectDescription()).isEqualTo("독서 기록 앱");
        assertThat(sent.context().recruitmentTitle()).isEqualTo("1차 베타 테스트");
        assertThat(sent.context().recruitmentDescription()).isEqualTo("기록 화면을 봐 주세요");
        assertThat(sent.context().version()).isEqualTo(1);
        assertThat(sent.feedback().feedbackId()).isEqualTo(feedback.getId());
        assertThat(sent.feedback().userId()).isEqualTo(feedback.getRegister().getUser().getId());
        assertThat(sent.feedback().content()).isEqualTo("사진을 여러 장 올리면 순서가 바뀌어요");
        assertThat(sent.feedback().testItemTitle()).isEqualTo("사진 올리기");
    }

    @Test
    @DisplayName("#109-S2 기타 의견(테스트 항목 없음)은 testItemTitle을 null로 보낸다")
    void 기타_의견() throws Exception {
        User developer = saveSubscriber();
        Feedback feedback = saveFeedback(developer, "독서 기록 앱", null);
        given(analysisClient.suggestFollowupQuestions(any())).willReturn(QUESTIONS);

        recommend(developer, feedback.getId()).andExpect(status().isOk());

        assertThat(sentRequest().feedback().testItemTitle()).isNull();
    }

    @Test
    @DisplayName("#109-S3 분석 서버의 글자 수를 넘는 설명은 잘라 보낸다")
    void 긴_설명() throws Exception {
        User developer = saveSubscriber();
        Feedback feedback = saveFeedback(developer, "가".repeat(5001), "사진 올리기");
        given(analysisClient.suggestFollowupQuestions(any())).willReturn(QUESTIONS);

        recommend(developer, feedback.getId()).andExpect(status().isOk());

        assertThat(sentRequest().context().projectDescription()).isEqualTo("가".repeat(5000));
    }

    @Test
    @DisplayName("#109-S4 구독하지 않은 프로젝트 주인은 403 SUBSCRIPTION_REQUIRED이고 분석 서버를 부르지 않는다")
    void 구독하지_않음() throws Exception {
        User developer = saveUser();
        Feedback feedback = saveFeedback(developer);

        recommend(developer, feedback.getId())
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("SUBSCRIPTION_REQUIRED"));
        verifyNoInteractions(analysisClient);
    }

    @Test
    @DisplayName("#109-S5 다른 회원 프로젝트의 리뷰와 없는 리뷰는 404 NOT_FOUND이고 분석 서버를 부르지 않는다")
    void 내_리뷰가_아님() throws Exception {
        User developer = saveSubscriber();
        // 리뷰가 달린 프로젝트의 주인은 구독 여부와 관계없음
        Feedback others = saveFeedback(saveUser());

        recommend(developer, others.getId())
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("NOT_FOUND"));
        recommend(developer, others.getId() + 1000)
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("NOT_FOUND"));
        verifyNoInteractions(analysisClient);
    }

    @Test
    @DisplayName("#109-S7 같은 날 네 번째 요청은 429 FOLLOWUP_LIMIT_EXCEEDED이고 분석 서버를 부르지 않는다")
    void 하루_3번() throws Exception {
        User developer = saveSubscriber();
        Feedback feedback = saveFeedback(developer);
        given(analysisClient.suggestFollowupQuestions(any())).willReturn(QUESTIONS);

        for (int i = 0; i < 3; i++) recommend(developer, feedback.getId()).andExpect(status().isOk());
        recommend(developer, feedback.getId())
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.error.code").value("FOLLOWUP_LIMIT_EXCEEDED"));
        verify(analysisClient, times(3)).suggestFollowupQuestions(any());
    }

    @Test
    @DisplayName("#109-S9 분석 서버 오류(503 AI_UNAVAILABLE)로 질문을 받지 못한 요청은 횟수에 들어가지 않는다")
    void 실패는_세지_않는다() throws Exception {
        User developer = saveSubscriber();
        Feedback feedback = saveFeedback(developer);
        given(analysisClient.suggestFollowupQuestions(any()))
                .willThrow(new BusinessException(ErrorCode.AI_UNAVAILABLE))
                .willReturn(QUESTIONS);

        recommend(developer, feedback.getId())
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.error.code").value("AI_UNAVAILABLE"));
        for (int i = 0; i < 3; i++) recommend(developer, feedback.getId()).andExpect(status().isOk());
        recommend(developer, feedback.getId()).andExpect(status().isTooManyRequests());
    }
}
