package com.testmoa.backend.controller.tester;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.testmoa.backend.entity.Feedback;
import com.testmoa.backend.entity.Project;
import com.testmoa.backend.entity.Recruitment;
import com.testmoa.backend.entity.Register;
import com.testmoa.backend.entity.TestItem;
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
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 내 참여 상세와 항목별 피드백 제출(#118). 요청부터 DB까지 확인한다
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ParticipationControllerTest {
    private static final String BASE = "/api/v1/tester/participations/";
    private static final ObjectMapper JSON = new ObjectMapper();

    @Autowired MockMvc mvc;
    @Autowired EntityManager em;
    @Autowired JwtProvider jwtProvider;

    private User developer;
    private User tester;
    private Recruitment recruitment;
    private TestItem required;
    private TestItem optional;

    @BeforeEach
    void setUp() {
        developer = saveUser();
        tester = saveUser();
        recruitment = saveRecruitment(3, 9);
        required = saveItem(recruitment, "밑줄 저장", true);
        optional = saveItem(recruitment, "문장 모아 보기", false);
    }

    private User saveUser() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        User user = User.builder().name("김모아").nickname("모아" + suffix).email(suffix + "@example.com")
                .role(Role.USER).status(UserStatus.ACTIVE).build();
        em.persist(user);
        return user;
    }

    // 모집 마감은 recruitDays일 뒤, 제출 마감은 submitDays일 뒤(음수면 지남)
    private Recruitment saveRecruitment(int recruitDays, int submitDays) {
        Project project = Project.builder().user(developer).title("북로그").imageUrl("https://img.test/booklog.png").build();
        em.persist(project);
        Recruitment saved = Recruitment.builder().project(project).title("북로그 1차 테스트").description("밑줄 저장을 써 봐 주세요")
                .conditions("누구나").accessUrl("https://beta.booklog.example.com")
                .recruitDeadline(LocalDateTime.now().plusDays(recruitDays)).feedbackDeadline(LocalDateTime.now().plusDays(submitDays))
                .selectionMode(SelectionMode.MANUAL).build();
        em.persist(saved);
        return saved;
    }

    private TestItem saveItem(Recruitment target, String title, boolean isRequired) {
        TestItem item = TestItem.builder().recruitment(target).title(title).description(title + "을 해 보세요").required(isRequired).build();
        em.persist(item);
        return item;
    }

    private Register applied(Recruitment target, User user) {
        Register register = Register.builder().recruitment(target).user(user).build();
        em.persist(register);
        return register;
    }

    private Register confirmed(Recruitment target, User user) {
        Register register = applied(target, user);
        register.confirm(1000, 0, LocalDateTime.now());
        return register;
    }

    private Feedback feedback(Register register, TestItem item) {
        Feedback saved = Feedback.builder().register(register).testItem(item).content("좋아요").submittedAt(LocalDateTime.now()).build();
        em.persist(saved);
        return saved;
    }

    // user가 null이면 토큰 없이, body가 null이면 본문 없이 보낸다
    private ResultActions send(User user, MockHttpServletRequestBuilder request, Object body) throws Exception {
        if (user != null) request.header("Authorization", "Bearer " + jwtProvider.createAccessToken(user.getId()));
        if (body != null) request.contentType(MediaType.APPLICATION_JSON).content(JSON.writeValueAsString(body));
        em.flush();
        em.clear();
        return mvc.perform(request);
    }

    private ResultActions detail(User user, Register register) throws Exception {
        return send(user, get(BASE + register.getId()), null);
    }

    private ResultActions submit(User user, Register register, Object body) throws Exception {
        return send(user, post(BASE + register.getId() + "/feedbacks"), body);
    }

    private JsonNode data(ResultActions result) throws Exception {
        return JSON.readTree(result.andReturn().getResponse().getContentAsString()).get("data");
    }

    private static Map<String, Object> item(TestItem item, String content) {
        Map<String, Object> map = new HashMap<>();
        map.put("testItemId", item.getId());
        map.put("content", content);
        return map;
    }

    private static Map<String, Object> body(String etc, Map<String, Object>... items) {
        Map<String, Object> map = new HashMap<>();
        map.put("items", List.of(items));
        map.put("etc", etc);
        return map;
    }

    private long feedbackCount(Register register) {
        return em.createQuery("select count(f) from feedbacks f where f.register.id = :id", Long.class)
                .setParameter("id", register.getId()).getSingleResult();
    }

    @Test
    @DisplayName("#118-S1 제출 전 상세")
    void 확정된_테스터가_제출_전_상세를_본다() throws Exception {
        Register register = confirmed(recruitment, tester);
        /* 나중에 저장한 선택 항목을 앞에 배치한다 */
        required.edit(required.getTitle(), required.getDescription(), true, 1);
        optional.edit(optional.getTitle(), optional.getDescription(), false, 0);
        em.flush();

        JsonNode data = data(detail(tester, register).andExpect(status().isOk()));

        assertThat(data.get("id").asLong()).isEqualTo(register.getId());
        assertThat(data.get("status").asText()).isEqualTo("beforeSubmit");
        assertThat(data.get("reward").asInt()).isEqualTo(1000);
        assertThat(data.get("earnedCredits").asInt()).isZero();
        assertThat(data.get("accessUrl").asText()).isEqualTo("https://beta.booklog.example.com");
        assertThat(data.at("/recruitment/title").asText()).isEqualTo("북로그 1차 테스트");
        assertThat(data.at("/recruitment/projectName").asText()).isEqualTo("북로그");
        assertThat(data.at("/recruitment/status").asText()).isEqualTo("recruiting");
        assertThat(data.at("/recruitment/selectionMode").asText()).isEqualTo("selection");
        assertThat(data.at("/recruitment/submitDeadline").isNull()).isFalse();
        assertThat(data.get("testItems")).hasSize(2);
        assertThat(data.at("/testItems/0/title").asText()).isEqualTo("문장 모아 보기");
        assertThat(data.at("/testItems/0/required").asBoolean()).isFalse();
        assertThat(data.at("/testItems/1/title").asText()).isEqualTo("밑줄 저장");
        assertThat(data.at("/testItems/1/required").asBoolean()).isTrue();
        assertThat(data.get("feedbacks")).isEmpty();
        assertThat(data.get("submittedAt").isNull()).isTrue();
    }

    @Test
    @DisplayName("#118-S2 항목별 피드백 제출")
    void 항목별_피드백과_기타_의견을_한_번에_제출한다() throws Exception {
        Register register = confirmed(recruitment, tester);

        JsonNode data = data(submit(tester, register, body(" 앱이 가벼워요 ", item(required, " 밑줄이 잘 저장돼요 "), item(optional, "  ")))
                .andExpect(status().isCreated()));

        assertThat(data.get("status").asText()).isEqualTo("payoutPending");
        assertThat(data.get("feedbacks")).hasSize(2);
        assertThat(data.at("/feedbacks/0/testItemId").asLong()).isEqualTo(required.getId());
        assertThat(data.at("/feedbacks/0/content").asText()).isEqualTo("밑줄이 잘 저장돼요");
        assertThat(data.at("/feedbacks/1/testItemId").isNull()).isTrue();
        assertThat(data.at("/feedbacks/1/content").asText()).isEqualTo("앱이 가벼워요");
        LocalDateTime submittedAt = LocalDateTime.parse(data.get("submittedAt").asText());
        assertThat(LocalDateTime.parse(data.get("payoutAt").asText())).isEqualTo(submittedAt.plusHours(72));

        /* 모든 행의 제출 시각이 같고, 비운 선택 항목은 저장하지 않는다 */
        List<Feedback> saved = em.createQuery("select f from feedbacks f where f.register.id = :id", Feedback.class)
                .setParameter("id", register.getId()).getResultList();
        assertThat(saved).hasSize(2).extracting(Feedback::getSubmittedAt).containsOnly(saved.get(0).getSubmittedAt());

        /* 다시 열면 제출한 피드백이 보인다 */
        JsonNode again = data(detail(tester, register).andExpect(status().isOk()));
        assertThat(again.get("status").asText()).isEqualTo("payoutPending");
        assertThat(again.get("feedbacks")).hasSize(2);
    }

    @Test
    @DisplayName("#118-S3 입력 검사")
    void 필수_항목이_비었거나_아무것도_적지_않으면_저장하지_않는다() throws Exception {
        Register register = confirmed(recruitment, tester);
        String requiredField = "testItems." + required.getId();

        submit(tester, register, body("기타만", item(optional, "선택만")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.fields['" + requiredField + "']").value("피드백을 적어 주세요"));
        submit(tester, register, body(null, item(required, "   ")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.fields['" + requiredField + "']").value("피드백을 적어 주세요"));
        submit(tester, register, body(null, item(required, "가".repeat(501)))).andExpect(status().isBadRequest());
        submit(tester, register, body("가".repeat(501), item(required, "좋아요"))).andExpect(status().isBadRequest());

        /* 다른 모집의 항목이나 같은 항목을 두 번 보내면 400 */
        TestItem otherItem = saveItem(saveRecruitment(3, 9), "다른 항목", false);
        submit(tester, register, body(null, item(required, "좋아요"), item(otherItem, "남의 항목"))).andExpect(status().isBadRequest());
        submit(tester, register, body(null, item(required, "좋아요"), item(required, "또"))).andExpect(status().isBadRequest());

        assertThat(feedbackCount(register)).isZero();

        /* 모든 항목이 선택이면 아무것도 적지 않았을 때 첫 칸에 알린다 */
        Recruitment allOptional = saveRecruitment(3, 9);
        TestItem first = saveItem(allOptional, "첫 항목", false);
        saveItem(allOptional, "둘째 항목", false);
        Register other = confirmed(allOptional, tester);
        submit(tester, other, body("  ", item(first, "")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.fields['testItems." + first.getId() + "']").value("피드백을 적어 주세요"));
        assertThat(feedbackCount(other)).isZero();
    }

    @Test
    @DisplayName("#118-S4 제출할 수 없는 참가")
    void 확정이_아니거나_마감이_지났거나_이미_냈으면_거절한다() throws Exception {
        Register waiting = applied(recruitment, tester);
        submit(tester, waiting, body(null, item(required, "좋아요")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("PARTICIPATION_NOT_CONFIRMED"));

        Recruitment closed = saveRecruitment(-9, -1);
        TestItem closedItem = saveItem(closed, "항목", true);
        Register late = confirmed(closed, saveUser());
        submit(late.getUser(), late, body(null, item(closedItem, "늦었어요")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("FEEDBACK_DEADLINE_PASSED"));

        Register done = confirmed(recruitment, saveUser());
        submit(done.getUser(), done, body(null, item(required, "처음"))).andExpect(status().isCreated());
        submit(done.getUser(), done, body(null, item(required, "두 번째")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("FEEDBACK_ALREADY_SUBMITTED"));
        assertThat(feedbackCount(done)).isEqualTo(1);
        assertThat(feedbackCount(waiting)).isZero();
        assertThat(feedbackCount(late)).isZero();
    }

    @Test
    @DisplayName("#118-S5 남의 참가와 비로그인")
    void 다른_회원의_참가는_404이고_비로그인은_401이다() throws Exception {
        Register register = confirmed(recruitment, tester);
        User other = saveUser();

        detail(other, register).andExpect(status().isNotFound()).andExpect(jsonPath("$.error.code").value("NOT_FOUND"));
        submit(other, register, body(null, item(required, "남의 참가"))).andExpect(status().isNotFound());
        send(tester, get(BASE + 999_999_999L), null).andExpect(status().isNotFound());
        detail(null, register).andExpect(status().isUnauthorized());
        submit(null, register, body(null, item(required, "비로그인"))).andExpect(status().isUnauthorized());
        assertThat(feedbackCount(register)).isZero();
    }

    @Test
    @DisplayName("#118-S6 상태별 상세")
    void 참가와_피드백_상태로_진행_상황을_계산한다() throws Exception {
        Map<String, Register> cases = new HashMap<>();
        cases.put("selectionPending", applied(recruitment, saveUser()));
        Register rejected = applied(recruitment, saveUser());
        rejected.reject();
        cases.put("notSelected", rejected);
        Recruitment testing = saveRecruitment(-1, 6);
        saveItem(testing, "항목", true);
        cases.put("notSelected(모집 마감 뒤 대기)", applied(testing, saveUser()));
        Recruitment closed = saveRecruitment(-9, -1);
        cases.put("incomplete", confirmed(closed, saveUser()));
        Register reported = confirmed(recruitment, saveUser());
        feedback(reported, required).report("광고 글이에요");
        feedback(reported, optional);
        cases.put("underReview", reported);
        Register paid = confirmed(recruitment, saveUser());
        feedback(paid, required).reward();
        cases.put("paid", paid);
        Register excluded = confirmed(recruitment, saveUser());
        Feedback excludedFeedback = feedback(excluded, required);
        excludedFeedback.report("광고 글이에요");
        excludedFeedback.exclude();
        cases.put("excluded", excluded);
        Register cancelled = applied(recruitment, saveUser());
        cancelled.cancel();
        cases.put("cancelled", cancelled);

        List<String> mismatches = new ArrayList<>();
        for (Map.Entry<String, Register> entry : cases.entrySet()) {
            Register register = entry.getValue();
            JsonNode data = data(detail(register.getUser(), register).andExpect(status().isOk()));
            String expected = entry.getKey().replaceAll("\\(.*\\)", "");
            if (!data.get("status").asText().equals(expected)) mismatches.add(entry.getKey() + " → " + data.get("status").asText());
            /* 접속 링크는 확정된 참가에만 준다 */
            boolean isConfirmed = !List.of("selectionPending", "notSelected", "cancelled").contains(expected);
            if (data.get("accessUrl").isNull() == isConfirmed) mismatches.add(entry.getKey() + " accessUrl");
            if (expected.equals("paid") && data.get("earnedCredits").asInt() != 1000) mismatches.add("paid earnedCredits");
            if (!expected.equals("paid") && data.get("earnedCredits").asInt() != 0) mismatches.add(entry.getKey() + " earnedCredits");
        }
        assertThat(mismatches).isEmpty();
    }
}
