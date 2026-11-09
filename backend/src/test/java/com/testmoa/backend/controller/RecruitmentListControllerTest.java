package com.testmoa.backend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.testmoa.backend.entity.Project;
import com.testmoa.backend.entity.Recruitment;
import com.testmoa.backend.entity.RecruitmentType;
import com.testmoa.backend.entity.Type;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.entity.enums.SelectionMode;
import com.testmoa.backend.entity.enums.TypeCode;
import com.testmoa.backend.entity.enums.UserStatus;
import com.testmoa.backend.global.security.Role;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 공개 모집 목록·검색(#112). 요청부터 DB까지 확인한다.
 * 다른 테스트가 남긴 모집글과 섞이지 않게, 테스트마다 고유한 표시(tag)를 프로젝트 이름에 넣고 그 표시로 검색한다
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class RecruitmentListControllerTest {
    private static final String LIST = "/api/v1/recruitments";
    private static final ObjectMapper JSON = new ObjectMapper();

    @Autowired MockMvc mvc;
    @Autowired EntityManager em;

    private User developer;
    private String tag;

    @BeforeEach
    void setUp() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        developer = User.builder().name("김모아").nickname("모아" + suffix).email(suffix + "@example.com")
                .role(Role.USER).status(UserStatus.ACTIVE).build();
        em.persist(developer);
        tag = "tag" + suffix;
    }

    private Recruitment save(String projectName, String title, LocalDateTime recruitDeadline, boolean subscription) {
        Project project = Project.builder().user(developer).title(projectName).description("독서 기록 서비스")
                .imageUrl("https://img.test/" + projectName + ".png").build();
        em.persist(project);
        Recruitment recruitment = Recruitment.builder().project(project).title(title).description("써 봐 주세요")
                .conditions("누구나").accessUrl("https://app.example.com")
                .recruitDeadline(recruitDeadline).feedbackDeadline(recruitDeadline.plusDays(7))
                .selectionMode(SelectionMode.FIRST_COME).subscription(subscription).build();
        em.persist(recruitment);
        return recruitment;
    }

    // 프로젝트 이름에 tag를 넣은 모집. 모집 마감은 days일 뒤(음수면 지남)
    private Recruitment save(String name, int days) {
        return save(tag + " " + name, name + " 베타", LocalDateTime.now().plusDays(days), false);
    }

    private void typeOf(Recruitment recruitment, TypeCode code) {
        List<Type> found = em.createQuery("select t from types t where t.code = :code", Type.class)
                .setParameter("code", code).getResultList();
        Type type = found.isEmpty() ? null : found.get(0);
        if (type == null) {
            type = Type.builder().code(code).build();
            em.persist(type);
        }
        em.persist(RecruitmentType.builder().recruitment(recruitment).type(type).build());
    }

    private JsonNode list(String query) throws Exception {
        em.flush();
        em.clear();
        String body = mvc.perform(get(LIST + "?" + query)).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return JSON.readTree(body).get("data");
    }

    private JsonNode listTagged(String query) throws Exception {
        return list("q=" + tag + (query.isEmpty() ? "" : "&" + query));
    }

    private List<Long> ids(JsonNode data) {
        List<Long> ids = new ArrayList<>();
        data.get("items").forEach(item -> ids.add(item.get("id").asLong()));
        return ids;
    }

    @Test
    @DisplayName("#112-S1 기본 목록")
    void 비로그인도_취소되지_않은_모집을_최신순으로_본다() throws Exception {
        Recruitment older = save("북로그", 3);
        Recruitment cancelled = save("모아플랜", 3);
        cancelled.cancel(null, LocalDateTime.now());
        Recruitment newer = save(tag + " 레시피핏", "레시피핏 1차 베타", LocalDateTime.now().plusDays(5), true);
        typeOf(newer, TypeCode.WEB);

        JsonNode data = listTagged("");

        assertThat(ids(data)).containsExactly(newer.getId(), older.getId());
        assertThat(data.get("total").asLong()).isEqualTo(2);
        assertThat(data.get("page").asInt()).isEqualTo(1);
        assertThat(data.get("pageCount").asInt()).isEqualTo(1);
        JsonNode first = data.get("items").get(0);
        assertThat(first.get("title").asText()).isEqualTo("레시피핏 1차 베타");
        assertThat(first.get("projectName").asText()).isEqualTo(tag + " 레시피핏");
        assertThat(first.get("projectDescription").asText()).isEqualTo("독서 기록 서비스");
        assertThat(first.get("projectImageUrl").asText()).isEqualTo("https://img.test/" + tag + " 레시피핏.png");
        assertThat(first.get("softwareType").asText()).isEqualTo("web");
        assertThat(first.get("subscription").asBoolean()).isTrue();
        assertThat(first.get("status").asText()).isEqualTo("recruiting");
        assertThat(first.hasNonNull("createdAt")).isTrue();
        assertThat(first.hasNonNull("recruitDeadline")).isTrue();
        assertThat(first.hasNonNull("submitDeadline")).isTrue();
    }

    @Test
    @DisplayName("#112-S2 검색어")
    void 프로젝트_이름_소개_모집글_제목에서_찾는다() throws Exception {
        String word = "Zq" + tag;
        Recruitment byName = save("앱 " + word, "첫 베타", LocalDateTime.now().plusDays(3), false);
        Project described = Project.builder().user(developer).title("소개에 있음").description("설명 " + word + " 포함").build();
        em.persist(described);
        Recruitment byDescription = Recruitment.builder().project(described).title("둘째 베타").description("d")
                .conditions("c").accessUrl("https://a.example.com").recruitDeadline(LocalDateTime.now().plusDays(3))
                .feedbackDeadline(LocalDateTime.now().plusDays(9)).selectionMode(SelectionMode.FIRST_COME).build();
        em.persist(byDescription);
        Recruitment byTitle = save("제목에 있음", "모집 " + word, LocalDateTime.now().plusDays(3), false);
        save("관계없음", "다른 모집", LocalDateTime.now().plusDays(3), false);

        JsonNode data = list("q=" + "  " + word.toUpperCase() + "  ");

        assertThat(ids(data)).containsExactlyInAnyOrder(byName.getId(), byDescription.getId(), byTitle.getId());

        Recruitment percent = save("100% " + tag, "할인", LocalDateTime.now().plusDays(3), false);
        save("일반 " + tag, "보통", LocalDateTime.now().plusDays(3), false);
        em.flush();
        em.clear();
        String body = mvc.perform(get(LIST).param("q", "% " + tag)).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode escaped = JSON.readTree(body).get("data");
        assertThat(ids(escaped)).containsExactly(percent.getId());
    }

    @Test
    @DisplayName("#112-S3 유형")
    void 유형으로_거른다() throws Exception {
        Recruitment web = save("웹", 3);
        typeOf(web, TypeCode.WEB);
        Recruitment mobile = save("모바일", 3);
        typeOf(mobile, TypeCode.MOBILE);

        assertThat(ids(listTagged("type=mobile"))).containsExactly(mobile.getId());
    }

    @Test
    @DisplayName("#112-S4 모집 중만")
    void 모집_마감_전인_것만_거른다() throws Exception {
        Recruitment open = save("모집중", 3);
        Recruitment passed = save("마감", -1);

        assertThat(ids(listTagged("open=true"))).containsExactly(open.getId());

        JsonNode all = listTagged("");
        assertThat(ids(all)).containsExactly(passed.getId(), open.getId());
        assertThat(all.get("items").get(0).get("status").asText()).isEqualTo("testing");
    }

    @Test
    @DisplayName("#112-S5 마감 임박순")
    void 마감이_가까운_순서이고_지난_모집은_뒤로_간다() throws Exception {
        Recruitment threeDays = save("사흘", 3);
        Recruitment passed = save("지남", -1);
        Recruitment oneDay = save("하루", 1);

        assertThat(ids(listTagged("sort=deadline"))).containsExactly(oneDay.getId(), threeDays.getId(), passed.getId());
    }

    @Test
    @DisplayName("#112-S6 구독 모집과 개수")
    void 구독_모집과_최신_몇_건만_본다() throws Exception {
        Recruitment subscribed = save(tag + " 구독", "구독 베타", LocalDateTime.now().plusDays(3), true);
        save(tag + " 구독지남", "구독 지난 베타", LocalDateTime.now().minusDays(1), true);
        Recruitment general = save("일반", 3);

        assertThat(ids(listTagged("subscription=true&open=true"))).containsExactly(subscribed.getId());

        JsonNode latest = listTagged("open=true&size=1");
        assertThat(ids(latest)).containsExactly(general.getId());
        assertThat(latest.get("total").asLong()).isEqualTo(2);
        assertThat(latest.get("pageCount").asInt()).isEqualTo(2);
    }

    @Test
    @DisplayName("#112-S7 페이지")
    void 페이지를_넘긴다() throws Exception {
        Recruitment oldest = save("하나", 3);
        save("둘", 3);
        save("셋", 3);

        JsonNode second = listTagged("size=2&page=2");
        assertThat(ids(second)).containsExactly(oldest.getId());
        assertThat(second.get("page").asInt()).isEqualTo(2);
        assertThat(second.get("pageCount").asInt()).isEqualTo(2);
        assertThat(second.get("total").asLong()).isEqualTo(3);

        JsonNode beyond = listTagged("size=2&page=9");
        assertThat(beyond.get("page").asInt()).isEqualTo(2);
        assertThat(ids(beyond)).containsExactly(oldest.getId());

        JsonNode empty = list("q=없는검색어" + tag);
        assertThat(empty.get("items")).isEmpty();
        assertThat(empty.get("total").asLong()).isZero();
        assertThat(empty.get("page").asInt()).isEqualTo(1);
        assertThat(empty.get("pageCount").asInt()).isEqualTo(1);
    }

    @Test
    @DisplayName("#112-S8 잘못된 조건")
    void 잘못된_조건은_400이다() throws Exception {
        for (String query : List.of("sort=reward", "type=desktop", "page=0", "page=abc", "size=0", "size=51",
                "open=maybe", "q=" + "가".repeat(101))) {
            mvc.perform(get(LIST + "?" + query))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error.code").value("INVALID_INPUT"));
        }
    }
}
