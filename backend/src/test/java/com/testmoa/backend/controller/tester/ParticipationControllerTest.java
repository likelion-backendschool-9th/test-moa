package com.testmoa.backend.controller.tester;

import com.testmoa.backend.support.ResponseTimes;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.testmoa.backend.entity.Feedback;
import com.testmoa.backend.entity.FeedbackImage;
import com.testmoa.backend.entity.Project;
import com.testmoa.backend.entity.Recruitment;
import com.testmoa.backend.entity.Register;
import com.testmoa.backend.entity.Sanction;
import com.testmoa.backend.entity.TestItem;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.entity.enums.Restriction;
import com.testmoa.backend.entity.enums.SanctionType;
import com.testmoa.backend.entity.enums.SelectionMode;
import com.testmoa.backend.entity.enums.UserStatus;
import com.testmoa.backend.global.file.FileStorage;
import com.testmoa.backend.global.security.JwtProvider;
import com.testmoa.backend.global.security.Role;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
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

    private static final byte[] PNG = new byte[]{(byte) 0x89, 'P', 'N', 'G', 13, 10, 26, 10};

    @Autowired MockMvc mvc;
    @Autowired EntityManager em;
    @Autowired JwtProvider jwtProvider;
    @Autowired FileStorage fileStorage;
    @Value("${upload.dir}") String uploadDir;

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
        LocalDateTime submittedAt = ResponseTimes.parse(data.get("submittedAt").asText());
        assertThat(ResponseTimes.parse(data.get("payoutAt").asText())).isEqualTo(submittedAt.plusHours(72));

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

    @Test
    @DisplayName("#119-S1 업로드")
    void 확정된_테스터가_PNG를_올리면_참가_폴더에_저장한다() throws Exception {
        Register register = confirmed(recruitment, tester);
        byte[] bytes = Arrays.copyOf(PNG, 1024 * 1024);
        try {
            JsonNode data = data(upload(tester, register.getId(), file("shot.png", bytes)).andExpect(status().isOk()));
            String url = data.get("url").asText();
            assertThat(url).matches("/api/v1/tester/participations/" + register.getId()
                    + "/feedbacks/images/[0-9a-f-]{36}[.]png");
            String name = url.substring(url.lastIndexOf('/') + 1);
            assertThat(fileStorage.load(FeedbackImage.FOLDER + "/" + register.getId() + "/" + name)).isPresent();
        } finally {
            deleteFeedbackFiles(register.getId());
        }
    }

    @Test
    @DisplayName("#119-S2 받지 않는 파일")
    void 이미지가_아니거나_한_요청에_두_장이면_저장하지_않는다() throws Exception {
        Register register = confirmed(recruitment, tester);
        try {
            upload(tester, register.getId(), file("a.png", "hello".getBytes(StandardCharsets.UTF_8)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error.fields.file").value("PNG, JPG, WEBP 이미지만 올릴 수 있어요"));
            upload(tester, register.getId(), file("a.pdf", "%PDF-1.7".getBytes(StandardCharsets.US_ASCII)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error.fields.file").value("PNG, JPG, WEBP 이미지만 올릴 수 있어요"));
            upload(tester, register.getId(), file("a.png", PNG), file("b.png", PNG))
                    .andExpect(status().isBadRequest());
            assertThat(feedbackFileCount(register.getId())).isZero();
        } finally {
            deleteFeedbackFiles(register.getId());
        }
    }

    @Test
    @DisplayName("#119-S4 올릴 수 없는 참가")
    void 확정_전이거나_마감이_지났거나_이미_냈거나_제재_중이면_저장하지_않는다() throws Exception {
        Register waiting = applied(recruitment, tester);
        Recruitment closed = saveRecruitment(-9, -1);
        saveItem(closed, "항목", true);
        Register late = confirmed(closed, saveUser());
        Register done = confirmed(recruitment, saveUser());
        feedback(done, required);
        User blocked = saveUser();
        Register restricted = confirmed(recruitment, blocked);
        em.persist(Sanction.builder().user(blocked).sanctionedBy(developer).type(SanctionType.SUSPENSION)
                .restrictions(EnumSet.of(Restriction.FEEDBACK)).reason("피드백 제한")
                .startedAt(LocalDateTime.now().minusHours(1)).endsAt(LocalDateTime.now().plusDays(1)).build());
        List<Long> ids = List.of(waiting.getId(), late.getId(), done.getId(), restricted.getId());
        try {
            upload(tester, waiting.getId(), file("a.png", PNG))
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.error.code").value("PARTICIPATION_NOT_CONFIRMED"));
            upload(late.getUser(), late.getId(), file("a.png", PNG))
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.error.code").value("FEEDBACK_DEADLINE_PASSED"));
            upload(done.getUser(), done.getId(), file("a.png", PNG))
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.error.code").value("FEEDBACK_ALREADY_SUBMITTED"));
            upload(blocked, restricted.getId(), file("a.png", PNG))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.error.code").value("RESTRICTED"));
            for (Long id : ids) assertThat(feedbackFileCount(id)).isZero();
        } finally {
            for (Long id : ids) deleteFeedbackFiles(id);
        }
    }

    @Test
    @DisplayName("#119-S5 남의 참가와 비로그인")
    void 다른_회원의_참가와_없는_참가는_404이고_비로그인은_401이며_저장하지_않는다() throws Exception {
        Register register = confirmed(recruitment, tester);
        User other = saveUser();
        long missing = 999_999_999L;
        try {
            upload(other, register.getId(), file("a.png", PNG))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.error.code").value("NOT_FOUND"));
            upload(tester, missing, file("a.png", PNG)).andExpect(status().isNotFound());
            upload(null, register.getId(), file("a.png", PNG)).andExpect(status().isUnauthorized());
            assertThat(feedbackFileCount(register.getId())).isZero();
            assertThat(feedbackFileCount(missing)).isZero();
        } finally {
            deleteFeedbackFiles(register.getId());
            deleteFeedbackFiles(missing);
        }
    }

    @Test
    @DisplayName("#119-S6 항목과 기타 의견에 이미지 연결")
    void 항목과_기타_의견에_올린_이미지를_순서대로_연결한다() throws Exception {
        Register register = confirmed(recruitment, tester);
        try {
            String first = uploadedUrl(tester, register);
            String second = uploadedUrl(tester, register);
            String third = uploadedUrl(tester, register);
            Map<String, Object> requiredItem = item(required, "밑줄이 보여요");
            requiredItem.put("imageUrls", List.of(first, second));
            Map<String, Object> request = body("기타도 있어요", requiredItem, item(optional, "  "));
            request.put("etcImageUrls", List.of(third));

            JsonNode data = data(submit(tester, register, request).andExpect(status().isCreated()));

            assertThat(data.get("feedbacks")).hasSize(2);
            assertThat(urls(data.at("/feedbacks/0/imageUrls"))).containsExactly(first, second);
            assertThat(data.at("/feedbacks/0/testItemId").asLong()).isEqualTo(required.getId());
            assertThat(urls(data.at("/feedbacks/1/imageUrls"))).containsExactly(third);
            assertThat(data.at("/feedbacks/1/testItemId").isNull()).isTrue();

            List<FeedbackImage> rows = em.createQuery(
                            "select i from feedback_images i join fetch i.feedback f where f.register.id = :id order by i.id",
                            FeedbackImage.class)
                    .setParameter("id", register.getId()).getResultList();
            assertThat(rows).extracting(FeedbackImage::getUrl).containsExactly(first, second, third);
            assertThat(rows.get(0).getFeedback().getId()).isEqualTo(rows.get(1).getFeedback().getId());
            assertThat(rows.get(0).getFeedback().getTestItem().getId()).isEqualTo(required.getId());
            assertThat(rows.get(2).getFeedback().getId()).isNotEqualTo(rows.get(0).getFeedback().getId());
            assertThat(rows.get(2).getFeedback().getTestItem()).isNull();
        } finally {
            deleteFeedbackFiles(register.getId());
        }
    }

    @Test
    @DisplayName("#119-S7 이미지 없는 제출")
    void 이미지_주소_없이_제출하면_피드백마다_빈_배열이다() throws Exception {
        Register register = confirmed(recruitment, tester);

        JsonNode data = data(submit(tester, register, body(" 앱이 가벼워요 ", item(required, "좋아요"), item(optional, "  ")))
                .andExpect(status().isCreated()));

        assertThat(data.get("feedbacks")).hasSize(2);
        assertThat(data.get("feedbacks")).allSatisfy(feedback -> assertThat(urls(feedback.get("imageUrls"))).isEmpty());
    }

    @Test
    @DisplayName("#119-S8 장수 초과")
    void 한_칸에_이미지를_여섯_장_넣으면_저장하지_않는다() throws Exception {
        Register register = confirmed(recruitment, tester);
        List<String> six = new ArrayList<>();
        for (int index = 0; index < 6; index++) six.add(ownImageUrl(register.getId()));
        Map<String, Object> tooMany = item(required, "좋아요");
        tooMany.put("imageUrls", six);

        submit(tester, register, body(null, tooMany))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.fields['testItems." + required.getId() + "']").value("이미지는 5장까지 올릴 수 있어요"));

        Map<String, Object> request = body("기타", item(required, "좋아요"));
        request.put("etcImageUrls", six);
        submit(tester, register, request)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.fields.etc").value("이미지는 5장까지 올릴 수 있어요"));
        assertThat(feedbackCount(register)).isZero();
        assertThat(imageCount(register)).isZero();
    }

    @Test
    @DisplayName("#119-S9 내용 없는 칸의 이미지")
    void 내용을_비운_선택_항목에_이미지를_넣으면_저장하지_않는다() throws Exception {
        Register register = confirmed(recruitment, tester);
        Map<String, Object> optionalItem = item(optional, "  ");
        optionalItem.put("imageUrls", List.of(ownImageUrl(register.getId())));

        submit(tester, register, body(null, item(required, "좋아요"), optionalItem))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.fields['testItems." + optional.getId() + "']").value("내용을 적어야 이미지를 넣을 수 있어요"));
        assertThat(feedbackCount(register)).isZero();
    }

    @Test
    @DisplayName("#119-S10 쓸 수 없는 주소")
    void 이번_참가의_주소가_아니면_저장하지_않는다() throws Exception {
        Register register = confirmed(recruitment, tester);
        Register other = confirmed(recruitment, saveUser());
        String field = "testItems." + required.getId();
        List<String> badUrls = List.of(
                "https://evil.example/a.png",
                "/api/v1/recruitments/images/" + UUID.randomUUID() + ".png",
                "/api/v1/tester/participations/" + other.getId() + "/feedbacks/images/" + UUID.randomUUID() + ".png");
        for (String url : badUrls) {
            Map<String, Object> requiredItem = item(required, "좋아요");
            requiredItem.put("imageUrls", List.of(url));
            submit(tester, register, body(null, requiredItem))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error.fields['" + field + "']").value("이미지를 다시 올려 주세요"));
        }
        assertThat(feedbackCount(register)).isZero();
        assertThat(imageCount(register)).isZero();
    }

    @Test
    @DisplayName("#119-S11")
    void 제출한_이미지를_상세에서_순서대로_다시_본다() throws Exception {
        Register register = confirmed(recruitment, tester);
        try {
            String first = uploadedUrl(tester, register);
            String second = uploadedUrl(tester, register);
            Map<String, Object> entry = item(required, "화면을 확인했어요");
            entry.put("imageUrls", List.of(first, second));
            submit(tester, register, body(null, entry)).andExpect(status().isCreated());

            JsonNode detail = data(detail(tester, register).andExpect(status().isOk()));
            assertThat(urls(detail.at("/feedbacks/0/imageUrls"))).containsExactly(first, second);
            send(tester, get(first), null).andExpect(status().isOk())
                    .andExpect(content().contentType("image/png"))
                    .andExpect(header().string("Cache-Control", "no-store"))
                    .andExpect(content().bytes(PNG));
        } finally {
            deleteFeedbackFiles(register.getId());
        }
    }

    @Test
    @DisplayName("#119-S13")
    void 다른_회원과_잘못된_파일의_조회와_공개_주소_접근을_막는다() throws Exception {
        Register register = confirmed(recruitment, tester);
        User other = saveUser();
        Register otherRegister = confirmed(recruitment, other);
        try {
            String url = uploadedUrl(tester, register);
            String otherUrl = uploadedUrl(other, otherRegister);
            // 자기 참가에 올린 파일은 제출 전에도 읽는다.
            send(tester, get(url), null).andExpect(status().isOk());
            Feedback feedback = feedback(register, required);
            String name = url.substring(url.lastIndexOf('/') + 1);
            String developerBase = "/api/v1/developer/feedbacks/" + feedback.getId() + "/images/";
            String testerBase = BASE + register.getId() + "/feedbacks/images/";
            send(other, get(url), null).andExpect(status().isNotFound());
            send(other, get(developerBase + name), null).andExpect(status().isNotFound());
            send(null, get(url), null).andExpect(status().isUnauthorized());
            send(null, get(developerBase + name), null).andExpect(status().isUnauthorized());
            for (String invalid : List.of(UUID.randomUUID() + ".png", "a..png",
                    otherUrl.substring(otherUrl.lastIndexOf('/') + 1))) {
                send(tester, get(testerBase + invalid), null).andExpect(status().isNotFound());
                send(developer, get(developerBase + invalid), null).andExpect(status().isNotFound());
            }
            send(tester, get(BASE + 999_999_999L + "/feedbacks/images/" + name), null)
                    .andExpect(status().isNotFound());
            send(developer, get("/api/v1/developer/feedbacks/999999999/images/" + name), null)
                    .andExpect(status().isNotFound());
            send(null, get("/api/v1/recruitments/images/" + name), null).andExpect(status().isNotFound());
        } finally {
            deleteFeedbackFiles(register.getId());
            deleteFeedbackFiles(otherRegister.getId());
        }
    }

    private String uploadedUrl(User user, Register register) throws Exception {
        JsonNode data = data(upload(user, register.getId(), file("a.png", PNG)).andExpect(status().isOk()));
        return data.get("url").asText();
    }

    private static String ownImageUrl(long registerId) {
        return "/api/v1/tester/participations/" + registerId + "/feedbacks/images/" + UUID.randomUUID() + ".png";
    }

    private static List<String> urls(JsonNode node) {
        assertThat(node.isArray()).isTrue();
        List<String> values = new ArrayList<>();
        node.forEach(item -> values.add(item.asText()));
        return values;
    }

    private long imageCount(Register register) {
        return em.createQuery("select count(i) from feedback_images i where i.feedback.register.id = :id", Long.class)
                .setParameter("id", register.getId()).getSingleResult();
    }

    private MockMultipartFile file(String name, byte[] bytes) {
        return new MockMultipartFile("file", name, "application/octet-stream", bytes);
    }

    private ResultActions upload(User user, long registerId, MockMultipartFile... files) throws Exception {
        var request = multipart(BASE + registerId + "/feedbacks/images");
        for (MockMultipartFile part : files) request.file(part);
        if (user != null) request.header("Authorization", "Bearer " + jwtProvider.createAccessToken(user.getId()));
        em.flush();
        em.clear();
        return mvc.perform(request);
    }

    private Path feedbackDir(long registerId) {
        return Path.of(uploadDir).toAbsolutePath().normalize().resolve(FeedbackImage.FOLDER).resolve(Long.toString(registerId));
    }

    private long feedbackFileCount(long registerId) throws IOException {
        Path dir = feedbackDir(registerId);
        if (!Files.isDirectory(dir)) return 0;
        try (var stream = Files.list(dir)) {
            return stream.count();
        }
    }

    private void deleteFeedbackFiles(long registerId) {
        Path dir = feedbackDir(registerId);
        if (!Files.isDirectory(dir)) return;
        try (var stream = Files.list(dir)) {
            stream.forEach(path -> {
                try {
                    Files.deleteIfExists(path);
                } catch (IOException e) {
                    throw new UncheckedIOException(e);
                }
            });
            Files.deleteIfExists(dir);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
