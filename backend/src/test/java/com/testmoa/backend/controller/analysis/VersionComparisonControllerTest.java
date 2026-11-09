package com.testmoa.backend.controller.analysis;

import com.testmoa.backend.entity.ClusterGroup;
import com.testmoa.backend.entity.Feedback;
import com.testmoa.backend.entity.FeedbackCluster;
import com.testmoa.backend.entity.Plan;
import com.testmoa.backend.entity.Project;
import com.testmoa.backend.entity.Recruitment;
import com.testmoa.backend.entity.Register;
import com.testmoa.backend.entity.Subscription;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.entity.VersionComparison;
import com.testmoa.backend.entity.enums.AnalysisStatus;
import com.testmoa.backend.entity.enums.ClusterCategory;
import com.testmoa.backend.entity.enums.SelectionMode;
import com.testmoa.backend.entity.enums.UserStatus;
import com.testmoa.backend.global.client.AnalysisClient;
import com.testmoa.backend.global.client.AnalysisClient.ComparisonRequest;
import com.testmoa.backend.global.client.AnalysisClient.ComparisonResponse;
import com.testmoa.backend.global.client.AnalysisClient.GroupItem;
import com.testmoa.backend.global.client.AnalysisClient.GroupMatch;
import com.testmoa.backend.global.security.JwtProvider;
import com.testmoa.backend.global.security.Role;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;
import static org.hamcrest.Matchers.contains;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * AI 버전 비교 API. 분석 서버 호출(AnalysisClient)은 가짜로 바꾸고, 보낼 요청과 저장된 그룹 코드를 확인함.
 * 주 한도는 서버 메모리라 테스트끼리 남지만 테스트마다 새 회원을 씀
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class VersionComparisonControllerTest {
    private static final String SUMMARY = "로그인 종료 문제는 이어지고, 결제 화면 문제가 새로 보고됐어요";

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

    // 플랜은 (tier, version)이 겹치면 저장되지 않아(uk_plans_tier_version) DB에 있으면 그것을 씀
    private Plan plan() {
        List<Plan> existing = em.createQuery("select p from plans p where p.tier = '구독' and p.version = 1", Plan.class)
                .getResultList();
        if (!existing.isEmpty()) return existing.get(0);
        Plan plan = Plan.builder().tier("구독").cashPrice(10000).creditPrice(9000)
                .version(1).periodDays(30).build();
        em.persist(plan);
        return plan;
    }

    private User saveSubscriber() {
        User user = saveUser();
        LocalDateTime now = LocalDateTime.now();
        em.persist(Subscription.builder().user(user).plan(plan()).startAt(now.minusDays(1)).endAt(now.plusDays(29)).build());
        return user;
    }

    private Project saveProject(User developer) {
        Project project = Project.builder().user(developer).title("북로그").description("독서 기록 앱").build();
        em.persist(project);
        return project;
    }

    // 분석을 마친 모집글(버전). 버전을 올리는 규칙이 아직 없어 테스트에서만 바꾼다
    private Recruitment saveAnalyzedVersion(Project project, int version) {
        LocalDateTime now = LocalDateTime.now();
        Recruitment recruitment = Recruitment.builder().project(project).title(version + "차 베타 테스트").description("기록 화면을 봐 주세요")
                .recruitDeadline(now.plusDays(7)).feedbackDeadline(now.plusDays(14)).selectionMode(SelectionMode.FIRST_COME).build();
        ReflectionTestUtils.setField(recruitment, "version", version);
        recruitment.completeAnalysis(null, null, now.minusHours(1));
        em.persist(recruitment);
        return recruitment;
    }

    private ClusterGroup saveGroup(Recruitment recruitment, String code, String name, ClusterCategory category, Integer rank) {
        ClusterGroup group = ClusterGroup.builder().recruitment(recruitment).groupCode(code).name(name)
                .category(category).improvementRank(rank).build();
        em.persist(group);
        return group;
    }

    // 그룹의 대표 리뷰. 새 테스터가 남긴 리뷰를 그룹에 넣는다
    private void saveRepresentative(ClusterGroup group, String content) {
        Register register = Register.builder().recruitment(group.getRecruitment()).user(saveUser()).build();
        em.persist(register);
        Feedback feedback = Feedback.builder().register(register).content(content).submittedAt(LocalDateTime.now()).build();
        em.persist(feedback);
        em.persist(FeedbackCluster.builder().clusterGroup(group).feedback(feedback).representative(true).build());
    }

    /**
     * 1버전 g11("1"), g12("2")와 2버전 g21("3"), g22("4", 칭찬), g23("5"). 2버전 코드는 #107이 새로 발급한 값이다
     */
    private record Versions(Recruitment previous, Recruitment current,
                            ClusterGroup g11, ClusterGroup g12, ClusterGroup g21, ClusterGroup g22, ClusterGroup g23) {}

    private Versions saveVersions(User developer) {
        Project project = saveProject(developer);
        Recruitment previous = saveAnalyzedVersion(project, 1);
        Recruitment current = saveAnalyzedVersion(project, 2);
        ClusterGroup g11 = saveGroup(previous, "1", "로그인 시 앱 종료", ClusterCategory.BUG, 1);
        saveRepresentative(g11, "로그인하면 앱이 꺼져요");
        ClusterGroup g12 = saveGroup(previous, "2", "글자가 잘림", ClusterCategory.BUG, 3);
        ClusterGroup g21 = saveGroup(current, "3", "로그인 후 종료", ClusterCategory.BUG, 1);
        ClusterGroup g22 = saveGroup(current, "4", "기록이 편해요", ClusterCategory.PRAISE, null);
        ClusterGroup g23 = saveGroup(current, "5", "결제 버튼 안 눌림", ClusterCategory.BUG, 2);
        return new Versions(previous, current, g11, g12, g21, g22, g23);
    }

    private ResultActions compare(User user, Long recruitmentId) throws Exception {
        return mvc.perform(post("/api/v1/developer/recruitments/{recruitmentId}/version-comparison", recruitmentId)
                .header("Authorization", "Bearer " + jwtProvider.createAccessToken(user.getId())));
    }

    private ResultActions find(User user, Long recruitmentId) throws Exception {
        return mvc.perform(get("/api/v1/developer/recruitments/{recruitmentId}/version-comparison", recruitmentId)
                .header("Authorization", "Bearer " + jwtProvider.createAccessToken(user.getId())));
    }

    private String codeOf(ClusterGroup group) {
        return em.find(ClusterGroup.class, group.getId()).getGroupCode();
    }

    @Test
    @DisplayName("#108-S1 짝지은 그룹은 이전 코드를 이어받고 새 그룹은 새 코드를 받는다. 요약을 저장하고 화면 값을 돌려준다(#108-S10, #168-S2)")
    void 코드를_이어받고_새_코드를_발급한다() throws Exception {
        User developer = saveSubscriber();
        Versions v = saveVersions(developer);
        given(analysisClient.compare(any())).willReturn(new ComparisonResponse(
                List.of(new GroupMatch(v.g21().getId(), v.g11().getId())), List.of(v.g23().getId()), SUMMARY));

        compare(developer, v.current().getId())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.summary").value(SUMMARY))
                .andExpect(jsonPath("$.data.currentVersion").value(2))
                .andExpect(jsonPath("$.data.previousVersion").value(1))
                .andExpect(jsonPath("$.data.currentTitle").value("2차 베타 테스트"))
                .andExpect(jsonPath("$.data.previousTitle").value("1차 베타 테스트"))
                .andExpect(jsonPath("$.data.stale").value(false))
                .andExpect(jsonPath("$.data.groups[*].groupId").value(contains(
                        v.g21().getId().intValue(), v.g22().getId().intValue(), v.g23().getId().intValue())))
                .andExpect(jsonPath("$.data.groups[*].previouslyReported").value(contains(true, false, false)))
                .andExpect(jsonPath("$.data.notReportedGroups[*].groupId").value(contains(v.g12().getId().intValue())));

        // 분석 서버에는 두 버전의 그룹과 대표 리뷰가 가고, 칭찬 그룹은 심각도가 없다
        ArgumentCaptor<ComparisonRequest> captor = ArgumentCaptor.forClass(ComparisonRequest.class);
        verify(analysisClient).compare(captor.capture());
        ComparisonRequest sent = captor.getValue();
        assertThat(sent.previous().version()).isEqualTo(1);
        assertThat(sent.current().version()).isEqualTo(2);
        assertThat(sent.previous().groups()).extracting(GroupItem::groupId, GroupItem::sample)
                .contains(tuple(v.g11().getId(), "로그인하면 앱이 꺼져요"));
        assertThat(sent.current().groups()).filteredOn(item -> item.groupId().equals(v.g22().getId()))
                .singleElement().satisfies(item -> {
                    assertThat(item.category()).isEqualTo("PRAISE");
                    assertThat(item.improvementRank()).isNull();
                });

        em.flush();
        em.clear();
        assertThat(codeOf(v.g21())).isEqualTo("1");
        assertThat(codeOf(v.g22())).isEqualTo("4");
        assertThat(codeOf(v.g23())).isEqualTo("6"); // 프로젝트 최대 코드 5 + 1
        VersionComparison saved = em.createQuery(
                        "select vc from version_comparisons vc where vc.recruitment.id = :id", VersionComparison.class)
                .setParameter("id", v.current().getId()).getSingleResult();
        assertThat(saved.getSummary()).isEqualTo(SUMMARY);
        assertThat(saved.getPreviousRecruitment().getId()).isEqualTo(v.previous().getId());

        find(developer, v.current().getId())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.summary").value(SUMMARY))
                .andExpect(jsonPath("$.data.notReportedGroups[*].groupId").value(contains(v.g12().getId().intValue())));
    }

    @Test
    @DisplayName("#108-S3 다른 버전의 그룹, 없는 ID, 이미 짝지은 그룹은 버리고 나머지만 저장한다")
    void 잘못된_그룹_ID는_무시한다() throws Exception {
        User developer = saveSubscriber();
        Versions v = saveVersions(developer);
        given(analysisClient.compare(any())).willReturn(new ComparisonResponse(
                List.of(
                        new GroupMatch(v.g11().getId(), v.g12().getId()), // 현재 자리에 직전 버전 그룹
                        new GroupMatch(999_999L, v.g12().getId()),        // 없는 그룹
                        new GroupMatch(v.g21().getId(), v.g11().getId()), // 맞는 짝
                        new GroupMatch(v.g22().getId(), v.g11().getId())  // 이미 짝지은 이전 그룹
                ),
                List.of(v.g21().getId(), v.g12().getId()), // 이미 짝지은 그룹, 직전 버전 그룹
                SUMMARY));

        compare(developer, v.current().getId()).andExpect(status().isOk());

        em.flush();
        em.clear();
        assertThat(codeOf(v.g21())).isEqualTo("1");
        assertThat(codeOf(v.g22())).isEqualTo("4");
        assertThat(codeOf(v.g11())).isEqualTo("1");
        assertThat(codeOf(v.g12())).isEqualTo("2");
    }

    @Test
    @DisplayName("#108-S4 구독하지 않은 프로젝트 주인은 실행도 조회도 SUBSCRIPTION_REQUIRED이고 분석 서버를 부르지 않는다")
    void 구독자가_아니면_거절한다() throws Exception {
        User developer = saveUser();
        Versions v = saveVersions(developer);

        compare(developer, v.current().getId())
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("SUBSCRIPTION_REQUIRED"));
        find(developer, v.current().getId())
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("SUBSCRIPTION_REQUIRED"));
        verifyNoInteractions(analysisClient);
    }

    @Test
    @DisplayName("#108-S5 다른 회원 프로젝트의 모집글은 NOT_FOUND이고 분석 서버를 부르지 않는다")
    void 내_모집글이_아니면_404() throws Exception {
        Versions others = saveVersions(saveSubscriber());

        compare(saveSubscriber(), others.current().getId())
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("NOT_FOUND"));
        verifyNoInteractions(analysisClient);
    }

    @Test
    @DisplayName("#108-S7 다시 분석하는 중이면 ANALYSIS_IN_PROGRESS이고, 다시 분석에 실패했어도(FAILED) 지난 결과로 비교한다")
    void 분석_중이면_막고_실패해도_지난_결과로_비교한다() throws Exception {
        User developer = saveSubscriber();
        Versions v = saveVersions(developer);
        ReflectionTestUtils.setField(v.current(), "analysisStatus", AnalysisStatus.PENDING);

        compare(developer, v.current().getId())
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("ANALYSIS_IN_PROGRESS"));
        verifyNoInteractions(analysisClient);

        // 다시 분석하다 실패해도 analyzed_at과 지난 그룹은 그대로다
        ReflectionTestUtils.setField(v.current(), "analysisStatus", AnalysisStatus.FAILED);
        given(analysisClient.compare(any())).willReturn(new ComparisonResponse(List.of(), List.of(), SUMMARY));

        compare(developer, v.current().getId())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.summary").value(SUMMARY));
    }

    @Test
    @DisplayName("#108-S6 직전 버전이 없으면 NO_PREVIOUS_VERSION이고 분석 서버를 부르지 않는다")
    void 직전_버전이_없으면_거절한다() throws Exception {
        User developer = saveSubscriber();
        Recruitment only = saveAnalyzedVersion(saveProject(developer), 1);

        compare(developer, only.getId())
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("NO_PREVIOUS_VERSION"));
        verifyNoInteractions(analysisClient);
    }

    @Test
    @DisplayName("#168-S1 비교 전 조회는 직전 버전 없음 → 분석 전 → 비교 전 순으로 알린다")
    void 비교_전_조회는_상태를_나눈다() throws Exception {
        User developer = saveSubscriber();
        Project project = saveProject(developer);
        Recruitment first = saveAnalyzedVersion(project, 1);
        find(developer, first.getId())
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("NO_PREVIOUS_VERSION"));

        Recruitment second = saveAnalyzedVersion(project, 2);
        ReflectionTestUtils.setField(second, "analyzedAt", null);
        find(developer, second.getId())
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("ANALYSIS_NOT_DONE"));

        ReflectionTestUtils.setField(second, "analyzedAt", LocalDateTime.now());
        find(developer, second.getId())
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("COMPARISON_NOT_FOUND"));
    }

    // #108-S1처럼 비교를 마친 상태: g21이 g11의 코드 "1"을 이어받았다. 프로젝트 최대 코드는 5다
    private Versions saveCompared(User developer) {
        Versions v = saveVersions(developer);
        v.g21().updateGroupCode("1");
        em.persist(VersionComparison.builder().recruitment(v.current()).previousRecruitment(v.previous()).summary(SUMMARY).build());
        return v;
    }

    private ResultActions relink(User user, Long recruitmentId, String body) throws Exception {
        return mvc.perform(put("/api/v1/developer/recruitments/{recruitmentId}/version-comparison/links", recruitmentId)
                .header("Authorization", "Bearer " + jwtProvider.createAccessToken(user.getId()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
    }

    private static String link(ClusterGroup group, ClusterGroup previous) {
        return "{\"groupId\":" + group.getId() + ",\"previousGroupId\":" + (previous == null ? "null" : previous.getId()) + "}";
    }

    private static String links(String... items) {
        return "{\"links\":[" + String.join(",", items) + "]}";
    }

    @Test
    @DisplayName("#168-S5 짝을 바꾸면 직전 그룹의 코드를 이어받고, 짝을 풀면 새 코드를 받는다. 요약은 그대로다")
    void 짝을_바꾸고_푼다() throws Exception {
        User developer = saveSubscriber();
        Versions v = saveCompared(developer);

        relink(developer, v.current().getId(), links(link(v.g23(), v.g11()), link(v.g21(), null)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.summary").value(SUMMARY))
                .andExpect(jsonPath("$.data.groups[*].groupId").value(contains(
                        v.g21().getId().intValue(), v.g22().getId().intValue(), v.g23().getId().intValue())))
                .andExpect(jsonPath("$.data.groups[*].previouslyReported").value(contains(false, false, true)));

        em.flush();
        em.clear();
        assertThat(codeOf(v.g23())).isEqualTo("1");
        assertThat(codeOf(v.g21())).isEqualTo("6");
        assertThat(codeOf(v.g22())).isEqualTo("4");
        verifyNoInteractions(analysisClient);
    }

    @Test
    @DisplayName("#168-S6 보내지 않은 그룹이 이어받은 코드를 쓰고 있으면 그 그룹도 새 코드를 받는다")
    void 겹친_코드는_새_코드를_받는다() throws Exception {
        User developer = saveSubscriber();
        Versions v = saveCompared(developer);

        relink(developer, v.current().getId(), links(link(v.g23(), v.g11()))).andExpect(status().isOk());

        em.flush();
        em.clear();
        assertThat(codeOf(v.g23())).isEqualTo("1");
        assertThat(codeOf(v.g21())).isEqualTo("6");
    }

    @Test
    @DisplayName("#168-S7 다른 버전의 그룹이나 같은 직전 그룹을 두 번 넣으면 INVALID_INPUT이고 코드는 그대로다")
    void 잘못된_짝은_거절한다() throws Exception {
        User developer = saveSubscriber();
        Versions v = saveCompared(developer);

        relink(developer, v.current().getId(), links(link(v.g11(), v.g12())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_INPUT"));
        relink(developer, v.current().getId(), links(link(v.g23(), v.g21())))
                .andExpect(status().isBadRequest());
        relink(developer, v.current().getId(), links(link(v.g22(), v.g11()), link(v.g23(), v.g11())))
                .andExpect(status().isBadRequest());

        em.flush();
        em.clear();
        assertThat(codeOf(v.g21())).isEqualTo("1");
        assertThat(codeOf(v.g22())).isEqualTo("4");
        assertThat(codeOf(v.g23())).isEqualTo("5");
    }

    @Test
    @DisplayName("#168-S8 비교 전이면 COMPARISON_NOT_FOUND, 분석 중이면 ANALYSIS_IN_PROGRESS다")
    void 비교_전이나_분석_중이면_거절한다() throws Exception {
        User developer = saveSubscriber();
        Versions notCompared = saveVersions(developer);
        relink(developer, notCompared.current().getId(), links(link(notCompared.g23(), notCompared.g11())))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("COMPARISON_NOT_FOUND"));

        Versions v = saveCompared(developer);
        ReflectionTestUtils.setField(v.previous(), "analysisStatus", AnalysisStatus.PENDING);
        relink(developer, v.current().getId(), links(link(v.g23(), v.g11())))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("ANALYSIS_IN_PROGRESS"));
    }
}
