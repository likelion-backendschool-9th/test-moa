package com.testmoa.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.testmoa.backend.domain.entity.Plan;
import com.testmoa.backend.domain.entity.Project;
import com.testmoa.backend.domain.entity.Recruitment;
import com.testmoa.backend.domain.entity.RecruitmentImage;
import com.testmoa.backend.domain.entity.RecruitmentType;
import com.testmoa.backend.domain.entity.Register;
import com.testmoa.backend.domain.entity.Subscription;
import com.testmoa.backend.domain.entity.TestItem;
import com.testmoa.backend.domain.entity.TestItemImage;
import com.testmoa.backend.domain.entity.User;
import com.testmoa.backend.global.common.Role;
import com.testmoa.backend.global.common.SelectionMode;
import com.testmoa.backend.global.common.TypeCode;
import com.testmoa.backend.global.common.UserStatus;
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
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 프로젝트 등록·조회·수정과 모집 작성. 요청부터 DB까지 확인한다
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ProjectControllerTest {

    private static final String PROJECTS = "/api/v1/developer/projects";
    private static final String RECRUITMENTS = "/api/v1/developer/recruitments";
    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
    private static final ObjectMapper JSON = new ObjectMapper();

    @Autowired MockMvc mvc;
    @Autowired EntityManager em;
    @Autowired JwtProvider jwtProvider;

    private User me;
    private User other;

    @BeforeEach
    void setUp() {
        me = saveUser();
        other = saveUser();
    }

    private User saveUser() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        User user = User.builder().name("김모아").nickname("모아" + suffix).email(suffix + "@example.com")
                .role(Role.USER).status(UserStatus.ACTIVE).build();
        em.persist(user);
        return user;
    }

    private Project saveProject(User owner, String title) {
        Project project = Project.builder().user(owner).title(title).build();
        em.persist(project);
        return project;
    }

    private Recruitment saveRecruitment(Project project, String title) {
        Recruitment recruitment = Recruitment.builder().project(project).title(title)
                .recruitDeadline(LocalDateTime.now().plusDays(3)).feedbackDeadline(LocalDateTime.now().plusDays(9))
                .selectionMode(SelectionMode.FIRST_COME).build();
        em.persist(recruitment);
        return recruitment;
    }

    private void subscribe(User user) {
        Plan plan = Plan.builder().tier("구독").cashPrice(10000).creditPrice(9000).monthlyRecruitLimit(30)
                .version((int) (System.nanoTime() % 1_000_000)).periodDays(30).build();
        em.persist(plan);
        em.persist(Subscription.builder().user(user).plan(plan)
                .startAt(LocalDateTime.now().minusDays(1)).endAt(LocalDateTime.now().plusDays(1)).build());
    }

    private ResultActions send(User user, MockHttpServletRequestBuilder request, Object body) throws Exception {
        request.header("Authorization", "Bearer " + jwtProvider.createAccessToken(user.getId()));
        if (body != null) request.contentType(MediaType.APPLICATION_JSON).content(JSON.writeValueAsString(body));
        ResultActions result = mvc.perform(request);
        em.flush();
        em.clear();
        return result;
    }

    private Map<String, Object> item(String title, boolean required, String... imageUrls) {
        Map<String, Object> item = new HashMap<>();
        item.put("title", title);
        item.put("required", required);
        item.put("imageUrls", List.of(imageUrls));
        return item;
    }

    private Map<String, Object> recruitment() {
        LocalDate today = LocalDate.now(SEOUL);
        Map<String, Object> body = new HashMap<>();
        body.put("title", "북로그 2차 모집");
        body.put("description", "회원가입부터 첫 기록까지 해 보기");
        body.put("softwareType", "web");
        body.put("selectionMode", "firstCome");
        body.put("accessUrl", "https://booklog.example.com");
        body.put("conditions", "책을 읽는 분");
        body.put("recruitDeadline", today.plusDays(3).toString());
        body.put("submitDeadline", today.plusDays(9).toString());
        body.put("testItems", List.of(item("책 등록하기", true, "https://img.example.com/1.png", "https://img.example.com/2.png"), item("기록 쓰기", false)));
        return body;
    }

    private ResultActions create(Project project, Map<String, Object> body) throws Exception {
        body.put("projectId", project.getId());
        return send(me, post(RECRUITMENTS), body);
    }

    private long recruitmentCount(Project project) {
        return em.createQuery("select count(r) from recruitments r where r.project.id = :id", Long.class)
                .setParameter("id", project.getId()).getSingleResult();
    }

    private void expectInvalid(Project project, Map<String, Object> body, String field, String message) throws Exception {
        create(project, body)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_INPUT"))
                .andExpect(jsonPath("$.error.fields['" + field + "']").value(message));
        assertThat(recruitmentCount(project)).isZero();
    }

    @Test
    @DisplayName("#92-S1 프로젝트 등록")
    void 이름만_적어도_프로젝트를_등록한다() throws Exception {
        send(me, post(PROJECTS), Map.of("name", " 북로그 "))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.id").isNumber())
                .andExpect(jsonPath("$.data.name").value("북로그"))
                .andExpect(jsonPath("$.data.description").value(nullValue()))
                .andExpect(jsonPath("$.data.imageUrl").value(nullValue()))
                .andExpect(jsonPath("$.data.recruitmentCount").value(0));
    }

    @Test
    @DisplayName("#92-S2 내 프로젝트 목록")
    void 내_프로젝트와_모집_수만_온다() throws Exception {
        Project first = saveProject(me, "북로그");
        Project second = saveProject(me, "모아플랜");
        saveProject(other, "다른 회원 프로젝트");
        saveRecruitment(first, "모집 중");
        Recruitment ended = saveRecruitment(first, "지난 모집");
        Recruitment cancelled = saveRecruitment(first, "취소한 모집");
        cancelled.cancel(null, LocalDateTime.now());
        em.flush();
        /* 모집 마감일을 바꾸는 메서드가 없어 DB에서 바꾼다 */
        em.createQuery("update recruitments r set r.recruitDeadline = :past where r.id = :id")
                .setParameter("past", LocalDateTime.now().minusDays(1)).setParameter("id", ended.getId()).executeUpdate();
        em.clear();

        send(me, get(PROJECTS), null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].name", contains("모아플랜", "북로그")))
                .andExpect(jsonPath("$.data[0].id").value(second.getId()))
                .andExpect(jsonPath("$.data[0].recruitmentCount").value(0))
                .andExpect(jsonPath("$.data[1].recruitmentCount").value(2))
                .andExpect(jsonPath("$.data[1].openRecruitmentCount").value(1));
    }

    @Test
    @DisplayName("#92-S2 프로젝트가 없으면 빈 목록")
    void 프로젝트가_없으면_빈_목록이다() throws Exception {
        send(me, get(PROJECTS), null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(0)));
    }

    @Test
    @DisplayName("#92-S3 프로젝트 정보 조회")
    void 프로젝트_정보가_온다() throws Exception {
        Project project = saveProject(me, "북로그");
        saveRecruitment(project, "1차");

        send(me, get(PROJECTS + "/" + project.getId()), null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("북로그"))
                .andExpect(jsonPath("$.data.createdAt").isNotEmpty())
                .andExpect(jsonPath("$.data.recruitmentCount").value(1))
                .andExpect(jsonPath("$.data.openRecruitmentCount").value(1));
    }

    @Test
    @DisplayName("#92-S14 프로젝트 모집 건 목록 조회")
    void 모집_건이_최신순으로_확정_수와_함께_온다() throws Exception {
        Project project = saveProject(me, "북로그");
        Recruitment first = saveRecruitment(project, "1차");
        saveRecruitment(project, "2차");
        Register confirmed = Register.builder().recruitment(first).user(other).build();
        confirmed.confirm(1000, 300, LocalDateTime.now());
        em.persist(confirmed);
        em.persist(Register.builder().recruitment(first).user(me).build());

        send(me, get(PROJECTS + "/" + project.getId() + "/recruitments"), null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].title", contains("2차", "1차")))
                .andExpect(jsonPath("$.data[0].confirmedCount").value(0))
                .andExpect(jsonPath("$.data[1].confirmedCount").value(1))
                .andExpect(jsonPath("$.data[1].status").value("recruiting"))
                .andExpect(jsonPath("$.data[1].selectionMode").value("firstCome"));
    }

    @Test
    @DisplayName("#92-S4 프로젝트 수정")
    void 보낸_값으로_바꾸고_비운_값은_지운다() throws Exception {
        Project project = Project.builder().user(me).title("북로그").description("설명").imageUrl("https://img.example.com/a.png").build();
        em.persist(project);

        Map<String, Object> body = new HashMap<>();
        body.put("name", "북로그 2");
        body.put("description", "새 설명");
        body.put("imageUrl", null);
        send(me, put(PROJECTS + "/" + project.getId()), body)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("북로그 2"))
                .andExpect(jsonPath("$.data.description").value("새 설명"))
                .andExpect(jsonPath("$.data.imageUrl").value(nullValue()));

        assertThat(em.find(Project.class, project.getId()).getTitle()).isEqualTo("북로그 2");
    }

    @Test
    @DisplayName("#92-S5 없거나 다른 회원의 프로젝트는 찾을 수 없음")
    void 없거나_다른_회원의_프로젝트는_404다() throws Exception {
        Project others = saveProject(other, "다른 회원 프로젝트");
        for (Long id : List.of(others.getId(), 999_999_999L)) {
            send(me, get(PROJECTS + "/" + id), null)
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.error.code").value("NOT_FOUND"));
            send(me, put(PROJECTS + "/" + id), Map.of("name", "바꾼 이름")).andExpect(status().isNotFound());
            send(me, get(PROJECTS + "/" + id + "/recruitments"), null).andExpect(status().isNotFound());
            Map<String, Object> body = recruitment();
            body.put("projectId", id);
            send(me, post(RECRUITMENTS), body).andExpect(status().isNotFound());
        }
        assertThat(em.find(Project.class, others.getId()).getTitle()).isEqualTo("다른 회원 프로젝트");
        assertThat(recruitmentCount(others)).isZero();
    }

    @Test
    @DisplayName("#92-S5 로그인하지 않으면 401")
    void 로그인하지_않으면_401이다() throws Exception {
        mvc.perform(get(PROJECTS)).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("#92-S6 모집 작성")
    void 모집글_유형_항목_이미지를_함께_저장한다() throws Exception {
        Project project = saveProject(me, "북로그");

        String body = create(project, recruitment())
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.id").isNumber())
                .andReturn().getResponse().getContentAsString();
        Long id = JSON.readTree(body).at("/data/id").asLong();

        Recruitment saved = em.find(Recruitment.class, id);
        assertThat(saved.getSelectionMode()).isEqualTo(SelectionMode.FIRST_COME);
        assertThat(saved.getConditions()).isEqualTo("책을 읽는 분");

        RecruitmentType type = em.createQuery("select t from recruitment_types t where t.recruitment.id = :id", RecruitmentType.class)
                .setParameter("id", id).getSingleResult();
        assertThat(type.getType().getCode()).isEqualTo(TypeCode.WEB);

        List<TestItem> items = em.createQuery("select t from test_items t where t.recruitment.id = :id order by t.id", TestItem.class)
                .setParameter("id", id).getResultList();
        assertThat(items).extracting(TestItem::getTitle).containsExactly("책 등록하기", "기록 쓰기");
        assertThat(items).extracting(TestItem::isRequired).containsExactly(true, false);

        List<TestItemImage> images = em.createQuery("select i from test_item_images i where i.testItem.id = :id order by i.sortOrder", TestItemImage.class)
                .setParameter("id", items.getFirst().getId()).getResultList();
        assertThat(images).extracting(TestItemImage::getUrl).containsExactly("https://img.example.com/1.png", "https://img.example.com/2.png");
        assertThat(images).extracting(TestItemImage::getSortOrder).containsExactly(0, 1);
    }

    @Test
    @DisplayName("#92-S8 일정과 접속 링크 검사")
    void 일정과_접속_링크가_틀리면_저장하지_않는다() throws Exception {
        Project project = saveProject(me, "북로그");
        LocalDate today = LocalDate.now(SEOUL);

        Map<String, Object> past = recruitment();
        past.put("recruitDeadline", today.minusDays(1).toString());
        expectInvalid(project, past, "recruitDeadline", "모집 마감일은 오늘 이후로 골라 주세요");

        Map<String, Object> same = recruitment();
        same.put("submitDeadline", same.get("recruitDeadline"));
        expectInvalid(project, same, "submitDeadline", "제출 마감일은 모집 마감일보다 뒤여야 해요");

        Map<String, Object> ftp = recruitment();
        ftp.put("accessUrl", "ftp://booklog.example.com");
        expectInvalid(project, ftp, "accessUrl", "http:// 또는 https://로 시작하는 주소를 적어 주세요");
    }

    @Test
    @DisplayName("#92-S9 오늘 마감은 허용")
    void 오늘을_모집_마감일로_고를_수_있다() throws Exception {
        Project project = saveProject(me, "북로그");
        LocalDate today = LocalDate.now(SEOUL);
        Map<String, Object> body = recruitment();
        body.put("recruitDeadline", today.toString());
        body.put("submitDeadline", today.plusDays(1).toString());

        String response = create(project, body).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();

        Recruitment saved = em.find(Recruitment.class, JSON.readTree(response).at("/data/id").asLong());
        /* 저장값은 서버 시간대의 시각이고, 한국 시간 그날 23:59:59와 같은 순간이다 */
        assertThat(saved.getRecruitDeadline().atZone(ZoneId.systemDefault()).toInstant())
                .isEqualTo(today.atTime(23, 59, 59).atZone(SEOUL).toInstant());
        assertThat(saved.getFeedbackDeadline().atZone(ZoneId.systemDefault()).toInstant())
                .isEqualTo(today.plusDays(1).atTime(23, 59, 59).atZone(SEOUL).toInstant());
    }

    @Test
    @DisplayName("#92-S10 글자 수와 개수")
    void 한도를_넘거나_필수_값이_없으면_저장하지_않는다() throws Exception {
        Project project = saveProject(me, "북로그");

        send(me, post(PROJECTS), Map.of("name", " "))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.fields.name").value("프로젝트 이름을 적어 주세요"));
        send(me, post(PROJECTS), Map.of("name", "가".repeat(51)))
                .andExpect(jsonPath("$.error.fields.name").value("이름은 50자까지 적을 수 있어요"));
        send(me, post(PROJECTS), Map.of("name", "북로그", "description", "가".repeat(2001)))
                .andExpect(jsonPath("$.error.fields.description").value("상세 설명은 2000자까지 적을 수 있어요"));

        Map<String, Object> title = recruitment();
        title.put("title", "가".repeat(51));
        expectInvalid(project, title, "title", "모집글 제목은 50자까지 적을 수 있어요");

        Map<String, Object> description = recruitment();
        description.put("description", "가".repeat(201));
        expectInvalid(project, description, "description", "모집 설명은 200자까지 적을 수 있어요");

        Map<String, Object> conditions = recruitment();
        conditions.put("conditions", "가".repeat(501));
        expectInvalid(project, conditions, "conditions", "모집 조건은 500자까지 적을 수 있어요");

        Map<String, Object> none = recruitment();
        none.put("testItems", List.of());
        expectInvalid(project, none, "testItems", "테스트 항목을 1개 이상 적어 주세요");

        List<Map<String, Object>> eleven = new ArrayList<>();
        for (int index = 0; index < 11; index++) eleven.add(item("항목 " + index, true));
        Map<String, Object> tooMany = recruitment();
        tooMany.put("testItems", eleven);
        expectInvalid(project, tooMany, "testItems", "테스트 항목은 10개까지 적을 수 있어요");

        Map<String, Object> images = recruitment();
        images.put("testItems", List.of(item("항목", true, "1", "2", "3", "4", "5", "6")));
        expectInvalid(project, images, "testItems[0].imageUrls", "이미지는 5장까지 올릴 수 있어요");

        Map<String, Object> blankItem = recruitment();
        blankItem.put("testItems", List.of(item(" ", true)));
        expectInvalid(project, blankItem, "testItems[0].title", "항목 이름을 적어 주세요");
    }

    @Test
    @DisplayName("#92-S11 유형과 선정 방식")
    void 유형과_선정_방식을_검사하고_선발형은_구독_회원만_쓴다() throws Exception {
        Project project = saveProject(me, "북로그");

        Map<String, Object> game = recruitment();
        game.put("softwareType", "game");
        expectInvalid(project, game, "softwareType", "지금은 웹서비스만 모집할 수 있어요");

        Map<String, Object> unknown = recruitment();
        unknown.put("selectionMode", "lottery");
        expectInvalid(project, unknown, "selectionMode", "선정 방식을 골라 주세요");

        Map<String, Object> selection = recruitment();
        selection.put("selectionMode", "selection");
        expectInvalid(project, selection, "selectionMode", "선발형은 구독 모집에서만 쓸 수 있어요");

        subscribe(me);
        String response = create(project, selection).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        Recruitment saved = em.find(Recruitment.class, JSON.readTree(response).at("/data/id").asLong());
        assertThat(saved.getSelectionMode()).isEqualTo(SelectionMode.MANUAL);
    }

    @Test
    @DisplayName("#92-S13 유형은 처음 쓸 때 만들고 다시 쓴다")
    void 유형은_늘어나지_않는다() throws Exception {
        Project project = saveProject(me, "북로그");
        create(project, recruitment()).andExpect(status().isCreated());
        create(project, recruitment()).andExpect(status().isCreated());

        Long count = em.createQuery("select count(t) from types t where t.code = :code", Long.class)
                .setParameter("code", TypeCode.WEB).getSingleResult();
        assertThat(count).isEqualTo(1);
    }

    @Test
    @DisplayName("#92-S15 모집글 이미지")
    void 모집글_이미지를_보낸_순서대로_10장까지_저장한다() throws Exception {
        Project project = saveProject(me, "북로그");

        Map<String, Object> withImages = recruitment();
        withImages.put("imageUrls", List.of("https://img.example.com/main.png", "https://img.example.com/flow.png"));
        String body = create(project, withImages).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        Long id = JSON.readTree(body).at("/data/id").asLong();
        List<RecruitmentImage> images = em.createQuery("select i from recruitment_images i where i.recruitment.id = :id order by i.sortOrder", RecruitmentImage.class)
                .setParameter("id", id).getResultList();
        assertThat(images).extracting(RecruitmentImage::getUrl).containsExactly("https://img.example.com/main.png", "https://img.example.com/flow.png");
        assertThat(images).extracting(RecruitmentImage::getSortOrder).containsExactly(0, 1);

        String noImages = create(project, recruitment()).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        Long count = em.createQuery("select count(i) from recruitment_images i where i.recruitment.id = :id", Long.class)
                .setParameter("id", JSON.readTree(noImages).at("/data/id").asLong()).getSingleResult();
        assertThat(count).isZero();

        Project other = saveProject(me, "모아플랜");
        List<String> eleven = new ArrayList<>();
        for (int index = 0; index < 11; index++) eleven.add("https://img.example.com/" + index + ".png");
        Map<String, Object> tooMany = recruitment();
        tooMany.put("imageUrls", eleven);
        expectInvalid(other, tooMany, "imageUrls", "모집글 이미지는 10장까지 올릴 수 있어요");

        Map<String, Object> blank = recruitment();
        blank.put("imageUrls", List.of(" "));
        expectInvalid(other, blank, "imageUrls[0]", "이미지 주소를 확인해 주세요");
    }
}
