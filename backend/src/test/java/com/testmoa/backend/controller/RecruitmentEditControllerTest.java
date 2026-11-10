package com.testmoa.backend.controller;

import com.testmoa.backend.support.ChatFixtures;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.testmoa.backend.entity.Feedback;
import com.testmoa.backend.entity.Project;
import com.testmoa.backend.entity.Recruitment;
import com.testmoa.backend.entity.RecruitmentType;
import com.testmoa.backend.entity.Register;
import com.testmoa.backend.entity.TestItem;
import com.testmoa.backend.entity.TestItemImage;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.entity.enums.SelectionMode;
import com.testmoa.backend.entity.enums.TypeCode;
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

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 모집 정보 탭의 수정(#175). 요청부터 DB까지 확인한다
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class RecruitmentEditControllerTest {
    private static final String RECRUITMENTS = "/api/v1/developer/recruitments";
    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
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

    // 모집 마감과 제출 마감을 지금부터 며칠 뒤로 둔다. 음수면 지난 날이다
    private Recruitment saveRecruitment(int recruitDays, int submitDays, boolean subscription) {
        Recruitment recruitment = Recruitment.builder().project(project).title("2차 모집").description("책 등록해 보기")
                .accessUrl("https://booklog.example.com").conditions("책을 읽는 분")
                .recruitDeadline(LocalDateTime.now().plusDays(recruitDays)).feedbackDeadline(LocalDateTime.now().plusDays(submitDays))
                .selectionMode(SelectionMode.FIRST_COME).build();
        if (subscription) new ChatFixtures(em).subscribe(developer);
        em.persist(recruitment);
        return recruitment;
    }

    private TestItem saveItem(Recruitment recruitment, String title, int sortOrder) {
        TestItem item = TestItem.builder().recruitment(recruitment).title(title).required(true).sortOrder(sortOrder).build();
        em.persist(item);
        return item;
    }

    private Register saveRegister(Recruitment recruitment) {
        Register register = Register.builder().recruitment(recruitment).user(other).build();
        em.persist(register);
        return register;
    }

    private LocalDate seoulDate(LocalDateTime dateTime) {
        return dateTime.atZone(ZoneId.systemDefault()).withZoneSameInstant(SEOUL).toLocalDate();
    }

    private ResultActions send(User user, MockHttpServletRequestBuilder request, Object body) throws Exception {
        request.header("Authorization", "Bearer " + jwtProvider.createAccessToken(user.getId()))
                .contentType(MediaType.APPLICATION_JSON).content(JSON.writeValueAsString(body));
        em.flush();
        ResultActions result = mvc.perform(request);
        em.flush();
        em.clear();
        return result;
    }

    private ResultActions edit(Recruitment recruitment, Map<String, Object> body) throws Exception {
        return send(developer, patch(RECRUITMENTS + "/" + recruitment.getId()), body);
    }

    private void expectInvalid(Recruitment recruitment, Map<String, Object> body, String field, String message) throws Exception {
        edit(recruitment, body)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_INPUT"))
                .andExpect(jsonPath("$.error.fields['" + field + "']").value(message));
    }

    private Map<String, Object> row(Long id, String title, boolean required) {
        Map<String, Object> row = new HashMap<>();
        row.put("id", id);
        row.put("title", title);
        row.put("description", "");
        row.put("required", required);
        return row;
    }

    private List<TestItem> items(Recruitment recruitment) {
        return em.createQuery("select t from test_items t where t.recruitment.id = :id order by t.sortOrder, t.id", TestItem.class)
                .setParameter("id", recruitment.getId()).getResultList();
    }

    @Test
    @DisplayName("#175-S1 모집 정보 수정")
    void 보낸_값만_바꾸고_카테고리를_고른_대로_맞춘다() throws Exception {
        Recruitment recruitment = saveRecruitment(3, 9, false);
        LocalDate recruitBefore = seoulDate(recruitment.getRecruitDeadline());
        Map<String, Object> body = new HashMap<>();
        body.put("title", " 2차 베타 모집 ");
        body.put("accessUrl", "https://beta.booklog.example.com");
        body.put("softwareTypes", List.of("web", "mobile"));
        body.put("conditions", " ");
        body.put("recruitDeadline", recruitBefore.plusDays(1).toString());
        body.put("submitDeadline", recruitBefore.plusDays(10).toString());

        edit(recruitment, body).andExpect(status().isOk());

        Recruitment saved = em.find(Recruitment.class, recruitment.getId());
        assertThat(saved.getTitle()).isEqualTo("2차 베타 모집");
        assertThat(saved.getDescription()).isEqualTo("책 등록해 보기");
        assertThat(saved.getAccessUrl()).isEqualTo("https://beta.booklog.example.com");
        assertThat(saved.getConditions()).isNull();
        assertThat(seoulDate(saved.getRecruitDeadline())).isEqualTo(recruitBefore.plusDays(1));
        assertThat(seoulDate(saved.getFeedbackDeadline())).isEqualTo(recruitBefore.plusDays(10));
        List<TypeCode> types = em.createQuery("select t from recruitment_types t where t.recruitment.id = :id", RecruitmentType.class)
                .setParameter("id", recruitment.getId()).getResultList().stream().map(item -> item.getType().getCode()).toList();
        assertThat(types).containsExactlyInAnyOrder(TypeCode.WEB, TypeCode.MOBILE);

        /* 다시 고르면 빠진 것만 지우고 남은 것은 둔다 */
        edit(recruitment, Map.of("softwareTypes", List.of("mobile"))).andExpect(status().isOk());
        assertThat(em.createQuery("select t from recruitment_types t where t.recruitment.id = :id", RecruitmentType.class)
                .setParameter("id", recruitment.getId()).getResultList()).extracting(item -> item.getType().getCode())
                .containsExactly(TypeCode.MOBILE);
    }

    @Test
    @DisplayName("#175-S2 선정 방식과 마감일 규칙")
    void 지원이_있으면_선정_방식을_막고_마감일은_미루기만_한다() throws Exception {
        Recruitment free = saveRecruitment(3, 9, false);
        expectInvalid(free, Map.of("selectionMode", "selection"), "selectionMode", "선발형은 구독 모집에서만 쓸 수 있어요");

        Recruitment subscribed = saveRecruitment(3, 9, true);
        saveRegister(subscribed);
        expectInvalid(subscribed, Map.of("selectionMode", "selection"), "selectionMode", "지원자가 있어 선정 방식을 바꿀 수 없어요");
        /* 지금 값과 같으면 지원이 있어도 통과한다 */
        edit(subscribed, Map.of("selectionMode", "firstCome")).andExpect(status().isOk());

        LocalDate recruit = seoulDate(free.getRecruitDeadline());
        LocalDate submit = seoulDate(free.getFeedbackDeadline());
        expectInvalid(free, Map.of("recruitDeadline", recruit.minusDays(1).toString()), "recruitDeadline", "모집 마감일은 미루기만 할 수 있어요");
        expectInvalid(free, Map.of("submitDeadline", submit.minusDays(1).toString()), "submitDeadline", "제출 마감일은 미루기만 할 수 있어요");
        expectInvalid(free, Map.of("recruitDeadline", submit.toString()), "submitDeadline", "제출 마감일은 모집 마감일보다 뒤여야 해요");
        assertThat(seoulDate(em.find(Recruitment.class, free.getId()).getRecruitDeadline())).isEqualTo(recruit);
    }

    @Test
    @DisplayName("#175-S3 테스트 중에는 모집 마감일을 바꿀 수 없다")
    void 모집이_마감되면_모집_마감일만_막는다() throws Exception {
        Recruitment testing = saveRecruitment(-1, 5, false);
        LocalDate recruit = seoulDate(testing.getRecruitDeadline());
        LocalDate submit = seoulDate(testing.getFeedbackDeadline());

        expectInvalid(testing, Map.of("recruitDeadline", recruit.plusDays(1).toString()), "recruitDeadline", "모집이 마감돼 바꿀 수 없어요");
        edit(testing, Map.of("recruitDeadline", recruit.toString(), "submitDeadline", submit.plusDays(3).toString())).andExpect(status().isOk());
        assertThat(seoulDate(em.find(Recruitment.class, testing.getId()).getFeedbackDeadline())).isEqualTo(submit.plusDays(3));
    }

    @Test
    @DisplayName("#175-S4 종료·취소한 모집과 다른 회원의 모집")
    void 종료_취소는_409이고_남의_모집은_404다() throws Exception {
        Recruitment closed = saveRecruitment(-5, -1, false);
        Recruitment cancelled = saveRecruitment(3, 9, false);
        cancelled.cancel(null, LocalDateTime.now());
        for (Recruitment recruitment : List.of(closed, cancelled)) {
            edit(recruitment, Map.of("title", "바꾼 제목"))
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.error.code").value("RECRUITMENT_NOT_EDITABLE"));
            send(developer, put(RECRUITMENTS + "/" + recruitment.getId() + "/test-items"), Map.of("testItems", List.of(row(null, "새 항목", true))))
                    .andExpect(status().isConflict());
        }

        Recruitment mine = saveRecruitment(3, 9, false);
        send(other, patch(RECRUITMENTS + "/" + mine.getId()), Map.of("title", "남의 제목")).andExpect(status().isNotFound());
        assertThat(em.find(Recruitment.class, mine.getId()).getTitle()).isEqualTo("2차 모집");
    }

    @Test
    @DisplayName("#175-S5 테스트 항목 순서·내용·추가·삭제")
    void 보낸_순서대로_항목을_맞춘다() throws Exception {
        Recruitment recruitment = saveRecruitment(3, 9, false);
        TestItem first = saveItem(recruitment, "책 등록", 0);
        TestItem second = saveItem(recruitment, "밑줄 긋기", 1);
        TestItem removed = saveItem(recruitment, "기록 쓰기", 2);
        em.persist(TestItemImage.builder().testItem(removed).url("https://img.example.com/1.png").sortOrder(0).build());

        send(developer, put(RECRUITMENTS + "/" + recruitment.getId() + "/test-items"), Map.of("testItems", List.of(
                row(second.getId(), "밑줄 문장 남기기", false), row(null, "모아 보기", true), row(first.getId(), "책 등록", true))))
                .andExpect(status().isOk());

        List<TestItem> saved = items(recruitment);
        assertThat(saved).extracting(TestItem::getTitle).containsExactly("밑줄 문장 남기기", "모아 보기", "책 등록");
        assertThat(saved).extracting(TestItem::isRequired).containsExactly(false, true, true);
        assertThat(saved).extracting(TestItem::getSortOrder).containsExactly(0, 1, 2);
        assertThat(em.find(TestItem.class, removed.getId())).isNull();
        assertThat(em.createQuery("select count(i) from test_item_images i where i.testItem.id = :id", Long.class)
                .setParameter("id", removed.getId()).getSingleResult()).isZero();
    }

    @Test
    @DisplayName("#175-S6 피드백이 달린 항목과 다른 모집글의 항목")
    void 피드백이_달린_항목은_지울_수_없다() throws Exception {
        Recruitment recruitment = saveRecruitment(3, 9, false);
        TestItem answered = saveItem(recruitment, "책 등록", 0);
        TestItem plain = saveItem(recruitment, "밑줄 긋기", 1);
        em.persist(Feedback.builder().register(saveRegister(recruitment)).testItem(answered).content("검색이 느려요").submittedAt(LocalDateTime.now()).build());
        TestItem othersItem = saveItem(saveRecruitment(3, 9, false), "다른 모집 항목", 0);
        String path = RECRUITMENTS + "/" + recruitment.getId() + "/test-items";

        send(developer, put(path), Map.of("testItems", List.of(row(plain.getId(), "밑줄 긋기", true))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.fields.testItems").value("피드백이 달린 항목은 지울 수 없어요"));
        send(developer, put(path), Map.of("testItems", List.of(row(answered.getId(), "책 등록", true), row(othersItem.getId(), "가져온 항목", true))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.fields.testItems").value("테스트 항목을 확인해 주세요"));
        assertThat(items(recruitment)).extracting(TestItem::getTitle).containsExactly("책 등록", "밑줄 긋기");

        /* 피드백이 달린 항목도 내용과 순서는 바꿀 수 있다 */
        send(developer, put(path), Map.of("testItems", List.of(row(plain.getId(), "밑줄 긋기", true), row(answered.getId(), "책 검색해 등록", true))))
                .andExpect(status().isOk());
        assertThat(items(recruitment)).extracting(TestItem::getTitle).containsExactly("밑줄 긋기", "책 검색해 등록");
    }
}
