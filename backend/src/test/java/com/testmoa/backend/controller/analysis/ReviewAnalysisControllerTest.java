package com.testmoa.backend.controller.analysis;

import com.testmoa.backend.entity.ClusterGroup;
import com.testmoa.backend.entity.Feedback;
import com.testmoa.backend.entity.FeedbackCluster;
import com.testmoa.backend.entity.Plan;
import com.testmoa.backend.entity.Project;
import com.testmoa.backend.entity.Recruitment;
import com.testmoa.backend.entity.Register;
import com.testmoa.backend.entity.Subscription;
import com.testmoa.backend.entity.TestItem;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.entity.enums.AnalysisStatus;
import com.testmoa.backend.entity.enums.ClusterCategory;
import com.testmoa.backend.entity.enums.SelectionMode;
import com.testmoa.backend.entity.enums.UserStatus;
import com.testmoa.backend.global.client.AnalysisClient;
import com.testmoa.backend.global.client.AnalysisClient.AnalysisGroup;
import com.testmoa.backend.global.client.AnalysisClient.AnalysisRequest;
import com.testmoa.backend.global.client.AnalysisClient.AnalysisResponse;
import com.testmoa.backend.global.client.AnalysisClient.FeedbackItem;
import com.testmoa.backend.global.client.GitHubIssueClient;
import com.testmoa.backend.global.client.GitHubIssueClient.IssueRef;
import com.testmoa.backend.service.ProjectRepositoryLinkProvider;
import com.testmoa.backend.service.ProjectRepositoryLinkProvider.RepositoryLink;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.global.security.JwtProvider;
import com.testmoa.backend.global.security.Role;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.core.task.SyncTaskExecutor;
import org.springframework.core.task.TaskExecutor;
import org.springframework.test.context.bean.override.convention.TestBean;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.nullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.times;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * AI 리뷰 묶기 API. 분석 서버 호출(AnalysisClient)은 가짜로 바꾸고, 분석 스레드는 호출한 스레드에서 바로 돌려
 * 요청 하나 안에서 분석·저장까지 끝난 결과를 확인함. 주 한도는 서버 메모리라 테스트마다 새 회원을 씀
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ReviewAnalysisControllerTest {
    private static final String PRAISE = "기록 화면이 편하다는 의견이 있어요";

    @Autowired MockMvc mvc;
    @Autowired EntityManager em;
    @Autowired JwtProvider jwtProvider;
    @MockitoBean AnalysisClient analysisClient;
    @MockitoBean GitHubIssueClient gitHubIssueClient;
    @MockitoBean ProjectRepositoryLinkProvider repositoryLinkProvider;

    // 분석을 비동기로 넘기지 않고 요청 스레드에서 바로 실행함
    @TestBean(name = "analysisTaskExecutor") TaskExecutor analysisTaskExecutor;

    static TaskExecutor analysisTaskExecutor() {
        return new SyncTaskExecutor();
    }

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
        Plan plan = Plan.builder().tier("구독").cashPrice(10000).creditPrice(9000).monthlyRecruitLimit(30)
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

    private Recruitment saveRecruitment(Project project) {
        LocalDateTime now = LocalDateTime.now();
        Recruitment recruitment = Recruitment.builder().project(project).title("1차 베타 테스트").description("로그인과 기록 화면을 봐 주세요")
                .recruitDeadline(now.plusDays(7)).feedbackDeadline(now.plusDays(14)).selectionMode(SelectionMode.FIRST_COME).build();
        em.persist(recruitment);
        return recruitment;
    }

    private Feedback saveFeedback(Register register, TestItem testItem, String content, LocalDateTime submittedAt) {
        Feedback feedback = Feedback.builder().register(register).testItem(testItem).content(content).submittedAt(submittedAt).build();
        em.persist(feedback);
        return feedback;
    }

    /**
     * 테스터 a·b·c의 리뷰 네 개. a는 f1·f3 두 개를 썼고, f1·f2는 테스트 항목 "로그인", f3·f4는 기타 의견이다
     */
    private record Reviews(Project project, Recruitment recruitment, User a, Feedback f1, Feedback f2, Feedback f3, Feedback f4) {}

    private Reviews saveReviews(User developer) {
        Project project = Project.builder().user(developer).title("북로그").description("독서 기록 앱").build();
        em.persist(project);
        Recruitment recruitment = saveRecruitment(project);
        TestItem login = TestItem.builder().recruitment(recruitment).title("로그인").required(true).build();
        em.persist(login);
        User a = saveUser();
        Register ra = Register.builder().recruitment(recruitment).user(a).build();
        Register rb = Register.builder().recruitment(recruitment).user(saveUser()).build();
        Register rc = Register.builder().recruitment(recruitment).user(saveUser()).build();
        em.persist(ra);
        em.persist(rb);
        em.persist(rc);
        LocalDateTime now = LocalDateTime.now();
        Feedback f1 = saveFeedback(ra, login, "로그인하면 앱이 꺼져요", now.minusHours(3));
        Feedback f2 = saveFeedback(rb, login, "로그인 버튼이 안 눌려요", now.minusHours(2));
        Feedback f3 = saveFeedback(ra, null, "결제 화면이 느려요", now.minusHours(1));
        Feedback f4 = saveFeedback(rc, null, "기록 화면이 편해요", now.minusMinutes(30));
        return new Reviews(project, recruitment, a, f1, f2, f3, f4);
    }

    // 이미 저장된 분석 그룹과 그 매핑
    private ClusterGroup saveGroup(Recruitment recruitment, String code, String gitIssueUrl, Feedback member) {
        ClusterGroup group = ClusterGroup.builder().recruitment(recruitment).groupCode(code).name("지난 그룹 " + code)
                .category(ClusterCategory.BUG).improvementRank(2).build();
        ReflectionTestUtils.setField(group, "gitIssueUrl", gitIssueUrl); // GitHub 등록은 아직 없는 기능이라 테스트에서만 넣는다
        em.persist(group);
        em.persist(FeedbackCluster.builder().clusterGroup(group).feedback(member).representative(true).build());
        return group;
    }

    private static AnalysisGroup group(String name, ClusterCategory category, Integer rank, Feedback representative, List<Long> ids) {
        return new AnalysisGroup(name, category.name(), rank, representative.getId(), ids, name + " 이슈", "## 재현\n" + name);
    }

    private ResultActions start(User user, Long recruitmentId) throws Exception {
        return mvc.perform(post("/api/v1/developer/recruitments/{recruitmentId}/analysis", recruitmentId)
                .header("Authorization", "Bearer " + jwtProvider.createAccessToken(user.getId())));
    }

    private List<ClusterGroup> groupsOf(Recruitment recruitment) {
        return em.createQuery("select g from cluster_groups g where g.recruitment.id = :id order by g.id", ClusterGroup.class)
                .setParameter("id", recruitment.getId()).getResultList();
    }

    private List<FeedbackCluster> mappingsOf(Recruitment recruitment) {
        return em.createQuery("select fc from feedback_clusters fc where fc.clusterGroup.recruitment.id = :id", FeedbackCluster.class)
                .setParameter("id", recruitment.getId()).getResultList();
    }

    @Test
    @DisplayName("#107-S1 #107-S2 #107-S11 #107-S13 그룹·매핑·대표 리뷰를 저장하고 새 코드를 발급하며, 심각도·테스터 수 순으로 개수를 계산해 돌려준다. 신고·보상 제외 리뷰는 넣지 않는다")
    void 분석_결과를_저장한다() throws Exception {
        User developer = saveSubscriber();
        Reviews r = saveReviews(developer);
        // 신고된 리뷰와 보상에서 제외된 리뷰는 분석 서버에 보내지 않고 미분석 수에도 세지 않는다
        saveFeedback(r.f1().getRegister(), null, "신고된 리뷰", LocalDateTime.now().minusMinutes(20)).report();
        Feedback excluded = saveFeedback(r.f2().getRegister(), null, "보상 제외된 리뷰", LocalDateTime.now().minusMinutes(10));
        excluded.report();
        excluded.exclude();
        // 같은 프로젝트의 다른 모집글에 코드 "5"가 있다
        ClusterGroup other = ClusterGroup.builder().recruitment(saveRecruitment(r.project())).groupCode("5").name("다른 버전 그룹")
                .category(ClusterCategory.BUG).improvementRank(1).build();
        em.persist(other);
        given(analysisClient.analyze(any())).willReturn(new AnalysisResponse(List.of(
                group("로그인 시 앱 종료", ClusterCategory.BUG, 2, r.f1(), List.of(r.f1().getId(), r.f2().getId(), r.f3().getId())),
                group("로그인 버튼", ClusterCategory.UX, 1, r.f2(), List.of(r.f2().getId(), r.f4().getId())),
                // 칭찬은 심각도·이슈 초안을 버리고, 보내지 않은 리뷰 ID는 매핑하지 않는다
                group("기록 화면 칭찬", ClusterCategory.PRAISE, 3, r.f4(), List.of(r.f4().getId(), 999_999L))
        ), PRAISE));

        start(developer, r.recruitment().getId())
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.data.analysisStatus").value("DONE"))
                .andExpect(jsonPath("$.data.analysisRequestedAt").isNotEmpty())
                .andExpect(jsonPath("$.data.praiseSummary").value(PRAISE))
                .andExpect(jsonPath("$.data.unanalyzedFeedbackCount").value(0))
                .andExpect(jsonPath("$.data.lastAnalyzedFeedbackAt").isNotEmpty())
                // 심각도 1, 2, 없음 순서
                .andExpect(jsonPath("$.data.groups[*].name").value(contains("로그인 버튼", "로그인 시 앱 종료", "기록 화면 칭찬")))
                .andExpect(jsonPath("$.data.groups[*].feedbackCount").value(contains(2, 3, 1)))
                // a가 쓴 f1·f3는 한 명으로 센다
                .andExpect(jsonPath("$.data.groups[*].testerCount").value(contains(2, 2, 1)))
                .andExpect(jsonPath("$.data.groups[*].representativeFeedback")
                        .value(contains("로그인 버튼이 안 눌려요", "로그인하면 앱이 꺼져요", "기록 화면이 편해요")))
                .andExpect(jsonPath("$.data.groups[2].improvementRank").value(nullValue()))
                .andExpect(jsonPath("$.data.groups[2].gitIssueTitle").value(nullValue()));

        ArgumentCaptor<AnalysisRequest> captor = ArgumentCaptor.forClass(AnalysisRequest.class);
        verify(analysisClient).analyze(captor.capture());
        AnalysisRequest sent = captor.getValue();
        assertThat(sent.context().projectTitle()).isEqualTo("북로그");
        assertThat(sent.context().version()).isEqualTo(1);
        assertThat(sent.feedbacks()).extracting(FeedbackItem::feedbackId, FeedbackItem::userId, FeedbackItem::testItemTitle)
                .containsExactlyInAnyOrder(
                        tuple(r.f1().getId(), r.a().getId(), "로그인"),
                        tuple(r.f2().getId(), r.f2().getRegister().getUser().getId(), "로그인"),
                        tuple(r.f3().getId(), r.a().getId(), null),
                        tuple(r.f4().getId(), r.f4().getRegister().getUser().getId(), null));

        em.flush();
        em.clear();
        List<ClusterGroup> saved = groupsOf(r.recruitment());
        assertThat(saved).extracting(ClusterGroup::getGroupCode).containsExactly("6", "7", "8");
        assertThat(saved.get(2).getImprovementRank()).isNull();
        assertThat(saved.get(2).getGitIssueTitle()).isNull();
        List<FeedbackCluster> mappings = mappingsOf(r.recruitment());
        assertThat(mappings).hasSize(6);
        // f2는 두 그룹에 들어 있다
        assertThat(mappings).filteredOn(mapping -> mapping.getFeedback().getId().equals(r.f2().getId())).hasSize(2);
        assertThat(mappings).filteredOn(FeedbackCluster::isRepresentative)
                .extracting(mapping -> mapping.getFeedback().getId())
                .containsExactlyInAnyOrder(r.f1().getId(), r.f2().getId(), r.f4().getId());
        Recruitment analyzed = em.find(Recruitment.class, r.recruitment().getId());
        assertThat(analyzed.getAnalysisStatus()).isEqualTo(AnalysisStatus.DONE);
        assertThat(analyzed.getAnalyzedAt()).isNotNull();
        assertThat(analyzed.getPraiseSummary()).isEqualTo(PRAISE);
    }

    @Test
    @DisplayName("#107-S3 다시 분석하면 GitHub에 등록한 그룹은 매핑과 함께 남고, 나머지 그룹과 매핑은 지워진다")
    void 다시_분석해도_등록한_그룹은_남는다() throws Exception {
        User developer = saveSubscriber();
        Reviews r = saveReviews(developer);
        ClusterGroup registered = saveGroup(r.recruitment(), "1", "https://github.com/likelion/booklog/issues/1", r.f1());
        ClusterGroup unregistered = saveGroup(r.recruitment(), "2", null, r.f2());
        given(analysisClient.analyze(any())).willReturn(new AnalysisResponse(List.of(
                group("결제 화면 느림", ClusterCategory.BUG, 3, r.f3(), List.of(r.f3().getId()))), null));

        start(developer, r.recruitment().getId()).andExpect(status().isAccepted());

        em.flush();
        em.clear();
        // 지우기 전 최대 코드 2 다음인 3을 받는다
        List<ClusterGroup> groups = groupsOf(r.recruitment());
        assertThat(groups).extracting(ClusterGroup::getGroupCode).containsExactly("1", "3");
        assertThat(groups.get(0).getId()).isEqualTo(registered.getId());
        assertThat(em.find(ClusterGroup.class, unregistered.getId())).isNull();
        assertThat(mappingsOf(r.recruitment())).extracting(mapping -> mapping.getFeedback().getId())
                .containsExactlyInAnyOrder(r.f1().getId(), r.f3().getId());
    }

    @Test
    @DisplayName("#107-S19 다시 분석해도 GitHub에 등록 중인 그룹(5분 이내)은 남고, 오래된 등록 중 표시는 지워진다")
    void 등록_중인_그룹은_다시_분석해도_남는다() throws Exception {
        User developer = saveSubscriber();
        Reviews r = saveReviews(developer);
        ClusterGroup registering = saveGroup(r.recruitment(), "1", null, r.f1());
        ReflectionTestUtils.setField(registering, "gitIssueRegisteringAt", LocalDateTime.now().minusMinutes(1));
        ClusterGroup stale = saveGroup(r.recruitment(), "2", null, r.f2());
        ReflectionTestUtils.setField(stale, "gitIssueRegisteringAt", LocalDateTime.now().minusMinutes(10));
        given(analysisClient.analyze(any())).willReturn(new AnalysisResponse(List.of(
                group("결제 화면 느림", ClusterCategory.BUG, 3, r.f3(), List.of(r.f3().getId()))), null));

        start(developer, r.recruitment().getId()).andExpect(status().isAccepted());

        em.flush();
        em.clear();
        assertThat(groupsOf(r.recruitment())).extracting(ClusterGroup::getId).contains(registering.getId()).doesNotContain(stale.getId());
        assertThat(mappingsOf(r.recruitment())).extracting(mapping -> mapping.getFeedback().getId())
                .contains(r.f1().getId()).doesNotContain(r.f2().getId());
    }

    @Test
    @DisplayName("#107-S4 분석 서버가 실패하면 FAILED이고 지난 분석 결과는 그대로다")
    void 실패하면_FAILED() throws Exception {
        User developer = saveSubscriber();
        Reviews r = saveReviews(developer);
        ClusterGroup previous = saveGroup(r.recruitment(), "1", null, r.f1());
        r.recruitment().completeAnalysis("지난 칭찬 요약", LocalDateTime.now().minusDays(1));
        given(analysisClient.analyze(any())).willThrow(new BusinessException(ErrorCode.AI_UNAVAILABLE));

        start(developer, r.recruitment().getId())
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.data.analysisStatus").value("FAILED"));

        em.flush();
        em.clear();
        Recruitment failed = em.find(Recruitment.class, r.recruitment().getId());
        assertThat(failed.getAnalysisStatus()).isEqualTo(AnalysisStatus.FAILED);
        assertThat(failed.getPraiseSummary()).isEqualTo("지난 칭찬 요약");
        assertThat(groupsOf(r.recruitment())).extracting(ClusterGroup::getId).containsExactly(previous.getId());
        assertThat(mappingsOf(r.recruitment())).hasSize(1);
    }

    @Test
    @DisplayName("#107-S6 구독하지 않은 프로젝트 주인은 SUBSCRIPTION_REQUIRED이고 분석 서버를 부르지 않는다")
    void 구독자가_아니면_거절한다() throws Exception {
        User developer = saveUser();
        Reviews r = saveReviews(developer);

        start(developer, r.recruitment().getId())
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("SUBSCRIPTION_REQUIRED"));
        verifyNoInteractions(analysisClient);
    }

    @Test
    @DisplayName("#107-S8 분석이 진행 중이면 ANALYSIS_IN_PROGRESS이고 분석 서버를 부르지 않는다")
    void 진행_중이면_다시_실행하지_않는다() throws Exception {
        User developer = saveSubscriber();
        Reviews r = saveReviews(developer);
        ReflectionTestUtils.setField(r.recruitment(), "analysisStatus", AnalysisStatus.PENDING);

        start(developer, r.recruitment().getId())
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("ANALYSIS_IN_PROGRESS"));
        verifyNoInteractions(analysisClient);
    }

    // 이슈 초안이 있는 그룹(BUG, 심각도 2). 대표 리뷰는 f1이다
    private ClusterGroup saveIssueGroup(Reviews r) {
        ClusterGroup group = saveGroup(r.recruitment(), "1", null, r.f1());
        group.editIssueDraft("로그인 시 앱 종료", "## 재현\n구글 로그인을 누른다");
        return group;
    }

    private ResultActions register(User user, Reviews r, ClusterGroup group) throws Exception {
        return mvc.perform(post("/api/v1/developer/recruitments/{id}/analysis/groups/{groupId}/github-issue",
                r.recruitment().getId(), group.getId()).header("Authorization", "Bearer " + jwtProvider.createAccessToken(user.getId())));
    }

    private ResultActions editDraft(User user, Reviews r, ClusterGroup group, String json) throws Exception {
        return mvc.perform(patch("/api/v1/developer/recruitments/{id}/analysis/groups/{groupId}", r.recruitment().getId(), group.getId())
                .header("Authorization", "Bearer " + jwtProvider.createAccessToken(user.getId()))
                .contentType(org.springframework.http.MediaType.APPLICATION_JSON).content(json));
    }

    private void linkRepository(Reviews r) {
        given(repositoryLinkProvider.find(r.project().getId())).willReturn(Optional.of(new RepositoryLink("octo", "booklog", "t0ken")));
    }

    @Test
    @DisplayName("#107-S14 이슈를 등록하면 URL·번호를 저장하고, 본문에는 근거와 리뷰 인용만 있고 테스터 정보는 없다")
    void 이슈를_등록한다() throws Exception {
        User developer = saveSubscriber();
        Reviews r = saveReviews(developer);
        ClusterGroup group = saveIssueGroup(r);
        linkRepository(r);
        given(gitHubIssueClient.create(any(), anyString(), anyString(), anyList()))
                .willReturn(new IssueRef("https://github.com/octo/booklog/issues/7", 7));

        register(developer, r, group)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.groups[0].gitIssueUrl").value("https://github.com/octo/booklog/issues/7"))
                .andExpect(jsonPath("$.data.groups[0].gitIssueNumber").value(7));

        ArgumentCaptor<String> body = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<List<String>> labels = ArgumentCaptor.forClass(List.class);
        verify(gitHubIssueClient).create(any(), org.mockito.ArgumentMatchers.eq("로그인 시 앱 종료"), body.capture(), labels.capture());
        assertThat(body.getValue()).contains("## 재현", "리뷰 1개 · 테스터 1명 · 테스트 버전 v1", "> 로그인하면 앱이 꺼져요", "test-moa 분석 결과에서 생성됨")
                .doesNotContain(r.a().getNickname(), r.a().getEmail());
        assertThat(labels.getValue()).containsExactlyInAnyOrder("test-moa", "bug", "severity:major");

        // 등록한 그룹은 다시 등록할 수 없고 GitHub를 다시 부르지 않는다
        register(developer, r, group).andExpect(status().isConflict()).andExpect(jsonPath("$.error.code").value("ISSUE_ALREADY_REGISTERED"));
        verify(gitHubIssueClient, times(1)).create(any(), anyString(), anyString(), anyList());
    }

    @Test
    @DisplayName("#107-S15 등록이 이미 진행 중이면(두 번 누름) 거절하고 GitHub를 부르지 않는다")
    void 등록_중이면_거절한다() throws Exception {
        User developer = saveSubscriber();
        Reviews r = saveReviews(developer);
        ClusterGroup group = saveIssueGroup(r);
        linkRepository(r);
        ReflectionTestUtils.setField(group, "gitIssueRegisteringAt", LocalDateTime.now());

        register(developer, r, group).andExpect(status().isConflict()).andExpect(jsonPath("$.error.code").value("ISSUE_ALREADY_REGISTERED"));
        verifyNoInteractions(gitHubIssueClient);
    }

    @Test
    @DisplayName("#107-S16 레포가 연결되지 않았으면 GITHUB_REPO_NOT_LINKED이고, 구독하지 않았으면 SUBSCRIPTION_REQUIRED다")
    void 레포가_없거나_구독이_없으면_거절한다() throws Exception {
        User developer = saveSubscriber();
        Reviews r = saveReviews(developer);
        ClusterGroup group = saveIssueGroup(r);

        register(developer, r, group).andExpect(status().isConflict()).andExpect(jsonPath("$.error.code").value("GITHUB_REPO_NOT_LINKED"));

        User free = saveUser();
        Reviews others = saveReviews(free);
        register(free, others, saveIssueGroup(others)).andExpect(status().isForbidden());
        verifyNoInteractions(gitHubIssueClient);
    }

    @Test
    @DisplayName("#107-S17 GitHub 호출이 실패하면 미등록으로 남아 다시 누를 수 있다")
    void 실패하면_다시_등록할_수_있다() throws Exception {
        User developer = saveSubscriber();
        Reviews r = saveReviews(developer);
        ClusterGroup group = saveIssueGroup(r);
        linkRepository(r);
        given(gitHubIssueClient.create(any(), anyString(), anyString(), anyList()))
                .willThrow(new BusinessException(ErrorCode.GITHUB_UNAVAILABLE))
                .willReturn(new IssueRef("https://github.com/octo/booklog/issues/8", 8));

        register(developer, r, group).andExpect(status().isServiceUnavailable()).andExpect(jsonPath("$.error.code").value("GITHUB_UNAVAILABLE"));
        register(developer, r, group).andExpect(status().isOk()).andExpect(jsonPath("$.data.groups[0].gitIssueNumber").value(8));
    }

    @Test
    @DisplayName("#107-S18 이슈 초안은 일부만 고칠 수 있고, 등록한 그룹·칭찬 그룹·빈 제목은 거절한다")
    void 이슈_초안을_고친다() throws Exception {
        User developer = saveSubscriber();
        Reviews r = saveReviews(developer);
        ClusterGroup group = saveIssueGroup(r);

        editDraft(developer, r, group, "{\"gitIssueTitle\":\"새 제목\"}").andExpect(status().isOk())
                .andExpect(jsonPath("$.data.groups[0].gitIssueTitle").value("새 제목"))
                .andExpect(jsonPath("$.data.groups[0].gitIssueContent").value("## 재현\n구글 로그인을 누른다"));
        editDraft(developer, r, group, "{\"gitIssueTitle\":\" \"}").andExpect(status().isBadRequest());

        ClusterGroup praise = ClusterGroup.builder().recruitment(r.recruitment()).groupCode("9").name("칭찬").category(ClusterCategory.PRAISE).build();
        em.persist(praise);
        editDraft(developer, r, praise, "{\"gitIssueTitle\":\"제목\"}").andExpect(status().isBadRequest());

        ReflectionTestUtils.setField(group, "gitIssueUrl", "https://github.com/octo/booklog/issues/1");
        editDraft(developer, r, group, "{\"gitIssueContent\":\"내용\"}").andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("ISSUE_ALREADY_REGISTERED"));
    }

    @Test
    @DisplayName("#107-S20 근거·인용을 붙인 본문이 GitHub 한도(65,536자)를 넘으면 INVALID_INPUT이고 GitHub를 부르지 않는다. 이슈 내용은 60,000자까지 고칠 수 있다")
    void 본문이_너무_길면_거절한다() throws Exception {
        User developer = saveSubscriber();
        Reviews r = saveReviews(developer);
        ClusterGroup group = saveIssueGroup(r);
        linkRepository(r);
        group.editIssueDraft("로그인 시 앱 종료", "가".repeat(65_536));

        register(developer, r, group).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_INPUT"));
        verifyNoInteractions(gitHubIssueClient);
        // 거절은 차지하기 전이라 등록 중 표시가 남지 않는다
        em.refresh(group);
        assertThat(group.getGitIssueRegisteringAt()).isNull();

        editDraft(developer, r, group, "{\"gitIssueContent\":\"" + "가".repeat(60_001) + "\"}").andExpect(status().isBadRequest());
        editDraft(developer, r, group, "{\"gitIssueContent\":\"" + "가".repeat(60_000) + "\"}").andExpect(status().isOk());
    }

    @Test
    @DisplayName("#107-S21 등록 중(5분 이내)인 그룹은 이슈 초안을 고칠 수 없고 이름은 고칠 수 있다. 오래된 등록 중 표시는 막지 않는다")
    void 등록_중에는_초안을_고칠_수_없다() throws Exception {
        User developer = saveSubscriber();
        Reviews r = saveReviews(developer);
        ClusterGroup group = saveIssueGroup(r);
        ReflectionTestUtils.setField(group, "gitIssueRegisteringAt", LocalDateTime.now());

        editDraft(developer, r, group, "{\"gitIssueTitle\":\"새 제목\"}").andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("ISSUE_ALREADY_REGISTERED"));
        editDraft(developer, r, group, "{\"name\":\"새 이름\"}").andExpect(status().isOk())
                .andExpect(jsonPath("$.data.groups[0].name").value("새 이름"));

        ReflectionTestUtils.setField(group, "gitIssueRegisteringAt", LocalDateTime.now().minusMinutes(6));
        editDraft(developer, r, group, "{\"gitIssueTitle\":\"새 제목\"}").andExpect(status().isOk())
                .andExpect(jsonPath("$.data.groups[0].gitIssueTitle").value("새 제목"));
    }
}
