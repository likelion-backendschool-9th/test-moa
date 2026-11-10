package com.testmoa.backend.controller.developer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.testmoa.backend.entity.Feedback;
import com.testmoa.backend.entity.FeedbackImage;
import com.testmoa.backend.entity.Project;
import com.testmoa.backend.entity.Recruitment;
import com.testmoa.backend.entity.Register;
import com.testmoa.backend.entity.TestItem;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.entity.enums.FeedbackStatus;
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
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 피드백 탭의 목록, 유용해요, 신고(#175). 요청부터 DB까지 확인한다
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class FeedbackControllerTest {
    private static final ObjectMapper JSON = new ObjectMapper();

    @Autowired MockMvc mvc;
    @Autowired EntityManager em;
    @Autowired JwtProvider jwtProvider;
    @Autowired FileStorage fileStorage;

    private User developer;
    private User other;
    private Recruitment recruitment;
    private Register register;

    @BeforeEach
    void setUp() {
        developer = saveUser("개발자");
        other = saveUser("남");
        Project project = Project.builder().user(developer).title("북로그").build();
        em.persist(project);
        recruitment = Recruitment.builder().project(project).title("1차 모집")
                .recruitDeadline(LocalDateTime.now().minusDays(1)).feedbackDeadline(LocalDateTime.now().plusDays(5))
                .selectionMode(SelectionMode.FIRST_COME).build();
        em.persist(recruitment);
        register = Register.builder().recruitment(recruitment).user(saveUser("테스터")).build();
        register.confirm(1000, 0, LocalDateTime.now());
        em.persist(register);
    }

    private User saveUser(String nickname) {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        User user = User.builder().name("김모아").nickname(nickname + suffix).email(suffix + "@example.com")
                .role(Role.USER).status(UserStatus.ACTIVE).build();
        em.persist(user);
        return user;
    }

    private Feedback saveFeedback(TestItem testItem, String content, LocalDateTime submittedAt) {
        Feedback feedback = Feedback.builder().register(register).testItem(testItem).content(content).submittedAt(submittedAt).build();
        em.persist(feedback);
        return feedback;
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

    private ResultActions report(User user, Feedback feedback, String reason) throws Exception {
        return send(user, post("/api/v1/developer/feedbacks/" + feedback.getId() + "/report"), Map.of("reason", reason));
    }

    private TestItem saveFeedbackList() {
        TestItem item = TestItem.builder().recruitment(recruitment).title("책 등록").required(true).build();
        em.persist(item);
        Feedback older = saveFeedback(item, "검색이 느려요", LocalDateTime.now().minusHours(5));
        em.persist(FeedbackImage.builder().feedback(older).url(testerImageUrl("11111111-1111-1111-1111-111111111111.png")).build());
        em.persist(FeedbackImage.builder().feedback(older).url(testerImageUrl("22222222-2222-2222-2222-222222222222.png")).build());
        Feedback newer = saveFeedback(null, "전체적으로 좋아요", LocalDateTime.now().minusHours(1));
        newer.updateRecommended(true);
        return item;
    }

    private String testerImageUrl(String name) {
        return "/api/v1/tester/participations/" + register.getId() + "/feedbacks/images/" + name;
    }

    private String developerImageUrl(Long feedbackId, String name) {
        return "/api/v1/developer/feedbacks/" + feedbackId + "/images/" + name;
    }

    @Test
    @DisplayName("#119-S12")
    void 개발자_목록의_주소로_피드백_이미지를_다시_본다() throws Exception {
        byte[] png = new byte[]{(byte) 0x89, 'P', 'N', 'G', 13, 10, 26, 10};
        var stored = fileStorage.save(FeedbackImage.FOLDER + "/" + register.getId(),
                new MockMultipartFile("file", "a.png", "image/png", png), FileStorage.Kind.PNG);
        try {
            String name = stored.path().substring(stored.path().lastIndexOf('/') + 1);
            Feedback feedback = saveFeedback(null, "화면을 확인했어요", LocalDateTime.now());
            em.persist(FeedbackImage.builder().feedback(feedback).url(testerImageUrl(name)).build());
            String expected = developerImageUrl(feedback.getId(), name);
            String response = send(developer, get("/api/v1/developer/recruitments/" + recruitment.getId() + "/feedbacks"), null)
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data[0].imageUrls", contains(expected)))
                    .andReturn().getResponse().getContentAsString();
            String url = JSON.readTree(response).at("/data/0/imageUrls/0").asText();
            send(developer, get(url), null).andExpect(status().isOk())
                    .andExpect(content().contentType("image/png"))
                    .andExpect(header().string("Cache-Control", "no-store"))
                    .andExpect(content().bytes(png));
        } finally {
            fileStorage.delete(stored.path());
        }
    }

    @Test
    @DisplayName("#175-S10 피드백 목록")
    void 최근_제출_순으로_닉네임_항목_스크린샷을_준다() throws Exception {
        TestItem item = saveFeedbackList();
        Long olderId = em.createQuery("select f.id from feedbacks f where f.register.id = :id and f.testItem is not null", Long.class)
                .setParameter("id", register.getId()).getSingleResult();
        String path = "/api/v1/developer/recruitments/" + recruitment.getId() + "/feedbacks";

        send(developer, get(path), null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].content", contains("전체적으로 좋아요", "검색이 느려요")))
                .andExpect(jsonPath("$.data[0].testItemId").value(nullValue()))
                .andExpect(jsonPath("$.data[0].recommended").value(true))
                .andExpect(jsonPath("$.data[1].testItemId").value(item.getId()))
                .andExpect(jsonPath("$.data[1].imageUrls", contains(developerImageUrl(olderId, "11111111-1111-1111-1111-111111111111.png"),
                        developerImageUrl(olderId, "22222222-2222-2222-2222-222222222222.png"))))
                .andExpect(jsonPath("$.data[1].status").value("submitted"))
                .andExpect(jsonPath("$.data[1].nickname").value(register.getUser().getNickname()));

        send(other, get(path), null).andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("#195-S1 피드백마다 참가 id를 준다")
    void 피드백마다_참가_id를_준다() throws Exception {
        saveFeedbackList();
        Register anotherRegister = Register.builder().recruitment(recruitment).user(saveUser("다른 테스터")).build();
        anotherRegister.confirm(1000, 0, LocalDateTime.now());
        em.persist(anotherRegister);
        Feedback anotherFeedback = Feedback.builder().register(anotherRegister).content("화면이 깔끔해요")
                .submittedAt(LocalDateTime.now()).build();
        em.persist(anotherFeedback);
        String path = "/api/v1/developer/recruitments/" + recruitment.getId() + "/feedbacks";

        String response = send(developer, get(path), null)
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
        var feedbacks = JSON.readTree(response).get("data");
        assertThat(feedbacks.size()).isEqualTo(3);
        Map<String, Long> registerIdsByContent = new HashMap<>();
        for (var feedback : feedbacks) {
            registerIdsByContent.put(feedback.get("content").asText(), feedback.get("registerId").asLong());
        }
        assertThat(registerIdsByContent).containsExactlyInAnyOrderEntriesOf(Map.of(
                "검색이 느려요", register.getId(),
                "전체적으로 좋아요", register.getId(),
                "화면이 깔끔해요", anotherRegister.getId()));
    }

    @Test
    @DisplayName("#175-S11 유용해요 표시")
    void 유용해요를_켜고_끈다() throws Exception {
        Feedback feedback = saveFeedback(null, "좋아요", LocalDateTime.now());
        String path = "/api/v1/developer/feedbacks/" + feedback.getId() + "/recommendation";

        send(developer, put(path), Map.of("recommended", true)).andExpect(status().isOk());
        assertThat(em.find(Feedback.class, feedback.getId()).isRecommended()).isTrue();
        send(developer, put(path), Map.of("recommended", false)).andExpect(status().isOk());
        assertThat(em.find(Feedback.class, feedback.getId()).isRecommended()).isFalse();

        send(other, put(path), Map.of("recommended", true)).andExpect(status().isNotFound());
        assertThat(em.find(Feedback.class, feedback.getId()).isRecommended()).isFalse();
    }

    @Test
    @DisplayName("#175-S12 피드백 신고")
    void 제출_후_72시간_안에_사유를_적어_신고한다() throws Exception {
        Feedback feedback = saveFeedback(null, "잘 모르겠어요", LocalDateTime.now().minusHours(71));
        report(developer, feedback, " ").andExpect(status().isBadRequest());
        report(other, feedback, "써 보지 않았어요").andExpect(status().isNotFound());

        report(developer, feedback, " 써 보지 않고 제출했어요 ").andExpect(status().isOk());
        Feedback saved = em.find(Feedback.class, feedback.getId());
        assertThat(saved.getStatus()).isEqualTo(FeedbackStatus.REPORTED);
        assertThat(saved.getReportReason()).isEqualTo("써 보지 않고 제출했어요");

        /* 이미 신고했거나 72시간이 지난 피드백은 신고할 수 없다 */
        report(developer, feedback, "다시 신고").andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("FEEDBACK_NOT_REPORTABLE"));
        Feedback late = saveFeedback(null, "늦은 피드백", LocalDateTime.now().minusHours(73));
        report(developer, late, "써 보지 않았어요").andExpect(status().isConflict());
        assertThat(em.find(Feedback.class, late.getId()).getStatus()).isEqualTo(FeedbackStatus.SUBMITTED);
    }
}
