package com.testmoa.backend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.testmoa.backend.entity.Plan;
import com.testmoa.backend.entity.Project;
import com.testmoa.backend.entity.Recruitment;
import com.testmoa.backend.entity.RecruitmentImage;
import com.testmoa.backend.entity.RecruitmentType;
import com.testmoa.backend.entity.Register;
import com.testmoa.backend.entity.Subscription;
import com.testmoa.backend.entity.TestItem;
import com.testmoa.backend.entity.TestItemImage;
import com.testmoa.backend.entity.Type;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.global.security.Role;
import com.testmoa.backend.entity.enums.SelectionMode;
import com.testmoa.backend.entity.enums.TypeCode;
import com.testmoa.backend.entity.enums.UserStatus;
import com.testmoa.backend.global.security.JwtProvider;
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

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 공개 모집글 상세(#113). 요청부터 DB까지 확인한다
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class RecruitmentControllerTest {
    private static final String DETAIL = "/api/v1/recruitments/";
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

    private Recruitment saveRecruitment(LocalDateTime recruitDeadline, LocalDateTime feedbackDeadline) {
        Project project = Project.builder().user(developer).title("북로그").description("독서 기록 서비스")
                .imageUrl("https://img.test/booklog.png").build();
        em.persist(project);
        Recruitment recruitment = Recruitment.builder().project(project).title("북로그 2차 베타").description("책 검색을 써 봐 주세요")
                .conditions("한 달에 책을 한 권 이상 읽는 분").accessUrl("https://booklog.example.com")
                .recruitDeadline(recruitDeadline).feedbackDeadline(feedbackDeadline)
                .selectionMode(SelectionMode.MANUAL).subscription(true).build();
        em.persist(recruitment);
        return recruitment;
    }

    private Recruitment saveOpenRecruitment() {
        return saveRecruitment(LocalDateTime.now().plusDays(3), LocalDateTime.now().plusDays(9));
    }

    private void subscribe(User user) {
        Plan plan = Plan.builder().tier("구독").cashPrice(10000).creditPrice(9000)
                .version((int) (System.nanoTime() % 1_000_000)).periodDays(30).build();
        em.persist(plan);
        em.persist(Subscription.builder().user(user).plan(plan)
                .startAt(LocalDateTime.now().minusDays(1)).endAt(LocalDateTime.now().plusDays(1)).build());
    }

    // user가 null이면 토큰 없이 부른다
    private ResultActions send(User user, MockHttpServletRequestBuilder request) throws Exception {
        if (user != null) request.header("Authorization", "Bearer " + jwtProvider.createAccessToken(user.getId()));
        em.flush();
        em.clear();
        return mvc.perform(request);
    }

    private JsonNode detail(User user, Recruitment recruitment) throws Exception {
        String body = send(user, get(DETAIL + recruitment.getId())).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return JSON.readTree(body).get("data");
    }

    @Test
    @DisplayName("#113-S1 비로그인 상세")
    void 비로그인도_모집글_상세를_본다() throws Exception {
        Recruitment recruitment = saveOpenRecruitment();
        Type web = Type.builder().code(TypeCode.WEB).build();
        em.persist(web);
        em.persist(RecruitmentType.builder().recruitment(recruitment).type(web).build());
        /* 저장 순서와 다르게 넣어도 sortOrder 순서로 온다 */
        em.persist(RecruitmentImage.builder().recruitment(recruitment).url("https://img.test/r2.png").sortOrder(1).build());
        em.persist(RecruitmentImage.builder().recruitment(recruitment).url("https://img.test/r1.png").sortOrder(0).build());

        JsonNode data = detail(null, recruitment);

        assertThat(data.get("title").asText()).isEqualTo("북로그 2차 베타");
        assertThat(data.get("description").asText()).isEqualTo("책 검색을 써 봐 주세요");
        assertThat(data.get("conditions").asText()).isEqualTo("한 달에 책을 한 권 이상 읽는 분");
        assertThat(data.get("status").asText()).isEqualTo("recruiting");
        assertThat(data.get("selectionMode").asText()).isEqualTo("selection");
        assertThat(data.get("softwareType").asText()).isEqualTo("web");
        assertThat(data.get("subscription").asBoolean()).isTrue();
        assertThat(data.hasNonNull("recruitDeadline")).isTrue();
        assertThat(data.hasNonNull("submitDeadline")).isTrue();
        assertThat(data.at("/project/name").asText()).isEqualTo("북로그");
        assertThat(data.at("/project/description").asText()).isEqualTo("독서 기록 서비스");
        assertThat(data.at("/project/imageUrl").asText()).isEqualTo("https://img.test/booklog.png");
        assertThat(JSON.convertValue(data.get("imageUrls"), List.class)).containsExactly("https://img.test/r1.png", "https://img.test/r2.png");
        /* 접속 링크는 확정된 테스터에게만 안내한다 */
        assertThat(data.has("accessUrl")).isFalse();
        assertThat(data.get("myRegisterStatus").isNull()).isTrue();
    }

    @Test
    @DisplayName("#113-S2 테스트 항목")
    void 테스트_항목이_저장_순서대로_이미지와_함께_온다() throws Exception {
        Recruitment recruitment = saveOpenRecruitment();
        TestItem first = TestItem.builder().recruitment(recruitment).title("책 검색하기").description("제목으로 찾아 주세요").required(true).build();
        TestItem second = TestItem.builder().recruitment(recruitment).title("밑줄 저장").required(false).build();
        em.persist(first);
        em.persist(second);
        em.persist(TestItemImage.builder().testItem(first).url("https://img.test/t2.png").sortOrder(1).build());
        em.persist(TestItemImage.builder().testItem(first).url("https://img.test/t1.png").sortOrder(0).build());

        JsonNode items = detail(null, recruitment).get("testItems");

        assertThat(items).hasSize(2);
        assertThat(items.get(0).get("title").asText()).isEqualTo("책 검색하기");
        assertThat(items.get(0).get("description").asText()).isEqualTo("제목으로 찾아 주세요");
        assertThat(items.get(0).get("required").asBoolean()).isTrue();
        assertThat(JSON.convertValue(items.get(0).get("imageUrls"), List.class)).containsExactly("https://img.test/t1.png", "https://img.test/t2.png");
        assertThat(items.get(1).get("title").asText()).isEqualTo("밑줄 저장");
        assertThat(items.get(1).get("required").asBoolean()).isFalse();
        assertThat(items.get(1).get("imageUrls")).isEmpty();
    }

    @Test
    @DisplayName("#113-S3 마감된 모집도 볼 수 있다")
    void 마감된_모집은_테스트_중이나_종료로_보인다() throws Exception {
        Recruitment testing = saveRecruitment(LocalDateTime.now().minusDays(1), LocalDateTime.now().plusDays(5));
        Recruitment closed = saveRecruitment(LocalDateTime.now().minusDays(9), LocalDateTime.now().minusDays(1));

        assertThat(detail(null, testing).get("status").asText()).isEqualTo("testing");
        assertThat(detail(null, closed).get("status").asText()).isEqualTo("closed");
    }

    @Test
    @DisplayName("#113-S4 없거나 취소된 모집")
    void 없거나_취소된_모집은_404다() throws Exception {
        Recruitment cancelled = saveOpenRecruitment();
        cancelled.cancel(null, LocalDateTime.now());

        send(null, get(DETAIL + cancelled.getId())).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("NOT_FOUND"));
        send(null, get(DETAIL + 999_999_999L)).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("NOT_FOUND"));
    }

    @Test
    @DisplayName("#113-S5 로그인한 회원의 지원 여부")
    void 로그인하면_내_가장_최근_참가_상태가_온다() throws Exception {
        Recruitment recruitment = saveOpenRecruitment();
        em.persist(Register.builder().recruitment(recruitment).user(tester).build());

        assertThat(detail(tester, recruitment).get("myRegisterStatus").asText()).isEqualTo("applied");
        assertThat(detail(saveUser(), recruitment).get("myRegisterStatus").isNull()).isTrue();

        /* 취소한 참가 뒤에 다시 지원했으면 최근 참가를 본다 */
        User again = saveUser();
        Register cancelled = Register.builder().recruitment(recruitment).user(again).build();
        cancelled.cancel();
        em.persist(cancelled);
        em.persist(Register.builder().recruitment(recruitment).user(again).build());
        assertThat(detail(again, recruitment).get("myRegisterStatus").asText()).isEqualTo("applied");

        /* 잘못된 토큰은 비로그인으로 넘기지 않고 401이다 */
        send(null, get(DETAIL + recruitment.getId()).header("Authorization", "Bearer not-a-token"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("#113-S6 구독 모집 여부 저장")
    void 모집_작성_때의_구독_여부가_저장된다() throws Exception {
        subscribe(developer);
        User free = saveUser();

        assertThat(detail(null, create(developer)).get("subscription").asBoolean()).isTrue();
        assertThat(detail(null, create(free)).get("subscription").asBoolean()).isFalse();
    }

    // 모집 작성 API로 프로젝트에 모집글을 만든다
    private Recruitment create(User owner) throws Exception {
        Project project = Project.builder().user(owner).title("북로그").build();
        em.persist(project);
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Seoul"));
        Map<String, Object> body = Map.of(
                "projectId", project.getId(), "title", "북로그 1차", "description", "써 봐 주세요", "softwareType", "web",
                "selectionMode", "firstCome", "accessUrl", "https://booklog.example.com",
                "recruitDeadline", today.plusDays(3).toString(), "submitDeadline", today.plusDays(9).toString(),
                "testItems", List.of(Map.of("title", "책 검색하기", "required", true)));
        String response = send(owner, post("/api/v1/developer/recruitments")
                .contentType(MediaType.APPLICATION_JSON).content(JSON.writeValueAsString(body)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return em.find(Recruitment.class, JSON.readTree(response).at("/data/id").asLong());
    }
}
