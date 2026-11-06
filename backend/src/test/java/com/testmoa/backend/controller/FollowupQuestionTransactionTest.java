package com.testmoa.backend.controller;

import com.testmoa.backend.domain.entity.Feedback;
import com.testmoa.backend.domain.entity.Plan;
import com.testmoa.backend.domain.entity.Project;
import com.testmoa.backend.domain.entity.Recruitment;
import com.testmoa.backend.domain.entity.Register;
import com.testmoa.backend.domain.entity.Subscription;
import com.testmoa.backend.domain.entity.TestItem;
import com.testmoa.backend.domain.entity.User;
import com.testmoa.backend.global.client.AnalysisClient;
import com.testmoa.backend.global.client.AnalysisClient.FollowupRequest;
import com.testmoa.backend.global.common.Role;
import com.testmoa.backend.global.common.SelectionMode;
import com.testmoa.backend.global.common.UserStatus;
import com.testmoa.backend.global.security.JwtProvider;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * AI 후속 질문 추천의 트랜잭션 경계. 테스트 전체를 트랜잭션으로 감싸지 않음.
 * 감싸면 저장한 엔티티가 영속성 컨텍스트에 이미 올라 있어 fetch가 빠져도 통과하고,
 * 분석 서버를 부르는 동안 DB 트랜잭션이 남아도 모름. 그래서 데이터는 먼저 커밋하고 요청은 트랜잭션 없이 보냄
 */
@SpringBootTest
@AutoConfigureMockMvc
class FollowupQuestionTransactionTest {
    @Autowired MockMvc mvc;
    @Autowired EntityManager em;
    @Autowired EntityManagerFactory emf;
    @Autowired TransactionTemplate tx;
    @Autowired JwtProvider jwtProvider;
    @MockitoBean AnalysisClient analysisClient;

    // 커밋한 행. 테스트가 끝나면 거꾸로 지움
    private final List<Object> saved = new ArrayList<>();

    private <T> T save(T entity) {
        em.persist(entity);
        saved.add(entity);
        return entity;
    }

    @AfterEach
    void cleanUp() {
        tx.executeWithoutResult(status -> {
            for (int i = saved.size() - 1; i >= 0; i--) em.remove(em.contains(saved.get(i)) ? saved.get(i) : em.merge(saved.get(i)));
        });
    }

    private User saveUser() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        return save(User.builder().name("김모아").nickname("모아" + suffix).email(suffix + "@example.com")
                .role(Role.USER).status(UserStatus.ACTIVE).build());
    }

    @Test
    @DisplayName("#109-S14 조회는 짧은 읽기 트랜잭션에서 끝나고, 분석 서버를 부를 때는 트랜잭션과 영속성 컨텍스트가 없다")
    void 분석_서버를_부를_때_트랜잭션이_없다() throws Exception {
        // 데이터를 별도 트랜잭션으로 커밋함. 요청은 이 영속성 컨텍스트를 이어받지 못함
        Long[] ids = tx.execute(status -> {
            LocalDateTime now = LocalDateTime.now();
            User developer = saveUser();
            List<Plan> plans = em.createQuery("select p from plans p where p.tier = '구독' and p.version = 1", Plan.class)
                    .getResultList();
            Plan plan = plans.isEmpty() ? save(Plan.builder().tier("구독").cashPrice(10000).creditPrice(9000)
                    .monthlyRecruitLimit(30).version(1).periodDays(30).build()) : plans.get(0);
            save(Subscription.builder().user(developer).plan(plan).startAt(now.minusDays(1)).endAt(now.plusDays(29)).build());
            Project project = save(Project.builder().user(developer).title("북로그").description("독서 기록 앱").build());
            Recruitment recruitment = save(Recruitment.builder().project(project).title("1차 베타 테스트")
                    .description("기록 화면을 봐 주세요").recruitDeadline(now.plusDays(7)).feedbackDeadline(now.plusDays(14))
                    .selectionMode(SelectionMode.FIRST_COME).build());
            Register register = save(Register.builder().recruitment(recruitment).user(saveUser()).build());
            TestItem testItem = save(TestItem.builder().recruitment(recruitment).title("사진 올리기").required(true).build());
            Feedback feedback = save(Feedback.builder().register(register).testItem(testItem)
                    .content("사진을 여러 장 올리면 순서가 바뀌어요").submittedAt(now).build());
            return new Long[]{developer.getId(), feedback.getId()};
        });

        AtomicBoolean called = new AtomicBoolean();
        AtomicBoolean transactionActive = new AtomicBoolean(true);
        AtomicBoolean persistenceContextBound = new AtomicBoolean(true);
        AtomicBoolean[] noEntityLeak = {new AtomicBoolean()};
        given(analysisClient.suggestFollowupQuestions(any())).willAnswer(invocation -> {
            called.set(true);
            transactionActive.set(TransactionSynchronizationManager.isActualTransactionActive());
            persistenceContextBound.set(TransactionSynchronizationManager.hasResource(emf));
            FollowupRequest request = invocation.getArgument(0);
            noEntityLeak[0].set(request.context().projectTitle().equals("북로그")
                    && request.feedback().testItemTitle().equals("사진 올리기"));
            return List.of("어떤 순서로 올리셨나요?", "몇 장을 올리셨나요?", "바뀐 순서는 어땠나요?");
        });

        mvc.perform(post("/api/v1/developer/feedbacks/{feedbackId}/followup-questions", ids[1])
                        .header("Authorization", "Bearer " + jwtProvider.createAccessToken(ids[0])))
                .andExpect(status().isOk());

        assertThat(called).isTrue();
        assertThat(transactionActive).isFalse();
        assertThat(persistenceContextBound).isFalse();
        // fetch가 빠졌다면 요청을 만드는 단계에서 지연 로딩 오류가 나 200이 되지 못함
        assertThat(noEntityLeak[0]).isTrue();
    }
}
