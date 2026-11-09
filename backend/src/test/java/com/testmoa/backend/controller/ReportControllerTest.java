package com.testmoa.backend.controller;

import com.jayway.jsonpath.JsonPath;
import com.testmoa.backend.entity.ChatRoom;
import com.testmoa.backend.entity.Feedback;
import com.testmoa.backend.entity.Register;
import com.testmoa.backend.entity.Recruitment;
import com.testmoa.backend.entity.Report;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.entity.enums.FeedbackStatus;
import com.testmoa.backend.entity.enums.ReportTargetType;
import com.testmoa.backend.entity.enums.UserStatus;
import com.testmoa.backend.global.security.JwtProvider;
import com.testmoa.backend.global.security.Role;
import com.testmoa.backend.support.ChatFixtures;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Arrays;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 회원 신고·증거 첨부(#85). 채팅 테스트와 같은 설정이라 같은 실행 환경을 함께 쓴다. 증거 파일은 backend/uploads(git 제외)에 저장된다
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ReportControllerTest {
    @Autowired MockMvc mvc;
    @Autowired EntityManager em;
    @Autowired JwtProvider jwt;

    // 파일 앞부분(시그니처)만 맞추면 종류가 정해진다
    static final byte[] PNG = bytes(new byte[]{(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A}, "png-body");
    static final byte[] PDF = "%PDF-1.4\n% evidence".getBytes(StandardCharsets.US_ASCII);

    ChatFixtures fixtures;
    User developer, tester, stranger;
    Recruitment recruitment;
    Register register;
    ChatRoom room;

    @BeforeEach
    void setUp() {
        fixtures = new ChatFixtures(em);
        String s = UUID.randomUUID().toString().substring(0, 6);
        developer = fixtures.user("신고개발" + s);
        tester = fixtures.user("신고테스터" + s);
        stranger = fixtures.user("신고남" + s);
        recruitment = fixtures.recruitment(developer, "북로그");
        register = fixtures.confirmedRegister(recruitment, tester);
        room = ChatRoom.builder().register(register).build();
        em.persist(room);
        em.flush();
    }

    static byte[] bytes(byte[] head, String rest) {
        byte[] tail = rest.getBytes(StandardCharsets.US_ASCII);
        byte[] all = Arrays.copyOf(head, head.length + tail.length);
        System.arraycopy(tail, 0, all, head.length, tail.length);
        return all;
    }

    static MockMultipartFile file(String name, byte[] data) {
        return new MockMultipartFile("files", name, "application/octet-stream", data);
    }

    ResultActions report(User user, String targetType, String target, String reason, MockMultipartFile... files) throws Exception {
        MockMultipartHttpServletRequestBuilder request = multipart("/api/v1/reports");
        for (MockMultipartFile f : files) request.file(f);
        request.param("targetType", targetType).param("reason", reason);
        if (target != null) request.param("CHAT".equals(targetType) ? "roomKey" : "targetId", target);
        return mvc.perform(request.header("Authorization", "Bearer " + jwt.createAccessToken(user.getId())));
    }

    Report saved(ResultActions result) throws Exception {
        Integer id = JsonPath.read(result.andReturn().getResponse().getContentAsString(), "$.data.id");
        em.flush();
        em.clear();
        return em.find(Report.class, id.longValue());
    }

    @Test
    @DisplayName("#85-S1 회원이 모집 글·회원·채팅방을 사유와 증거 파일로 신고한다")
    void 모집_글_회원_채팅방을_신고한다() throws Exception {
        ResultActions byRecruitment = report(tester, "RECRUITMENT", recruitment.getId().toString(), " 개인정보를 요구해요 ",
                file("screen.png", PNG), file("chat.pdf", PDF))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status").value("PENDING"))
                .andExpect(jsonPath("$.data.reason").value("개인정보를 요구해요"))
                .andExpect(jsonPath("$.data.evidences.length()").value(2))
                .andExpect(jsonPath("$.data.evidences[0].originalName").value("screen.png"))
                .andExpect(jsonPath("$.data.evidences[0].contentType").value("image/png"))
                .andExpect(jsonPath("$.data.evidences[1].contentType").value("application/pdf"))
                .andExpect(jsonPath("$.data.evidences[1].size").value(PDF.length));
        Report recruitmentReport = saved(byRecruitment);
        assertThat(recruitmentReport.getReportedUser().getId()).isEqualTo(developer.getId());
        assertThat(recruitmentReport.getReporter().getId()).isEqualTo(tester.getId());

        Report userReport = saved(report(tester, "USER", developer.getId().toString(), "욕설을 했어요").andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.evidences.length()").value(0)));
        assertThat(userReport.getReportedUser().getId()).isEqualTo(developer.getId());

        Report chatReport = saved(report(developer, "CHAT", room.getRoomKey(), "대화 중 위협했어요").andExpect(status().isCreated()));
        assertThat(chatReport.getTargetType()).isEqualTo(ReportTargetType.CHAT);
        assertThat(chatReport.getTargetId()).isEqualTo(room.getId());
        assertThat(chatReport.getReportedUser().getId()).isEqualTo(tester.getId());
    }

    @Test
    @DisplayName("#85-S2 자기 자신, 자기 모집 글은 신고할 수 없다")
    void 자기_자신은_신고할_수_없다() throws Exception {
        report(developer, "RECRUITMENT", recruitment.getId().toString(), "내 글").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("REPORT_SELF"));
        report(tester, "USER", tester.getId().toString(), "나").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("REPORT_SELF"));
    }

    @Test
    @DisplayName("#85-S3 같은 회원이 검토 대기 중인 같은 대상을 또 신고하면 409")
    void 검토_중인_같은_대상은_다시_신고할_수_없다() throws Exception {
        report(tester, "USER", developer.getId().toString(), "첫 신고").andExpect(status().isCreated());
        report(tester, "USER", developer.getId().toString(), "또 신고").andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("REPORT_DUPLICATED"));
        // 다른 회원은 같은 대상을 신고할 수 있다
        report(stranger, "USER", developer.getId().toString(), "저도 봤어요").andExpect(status().isCreated());
    }

    @Test
    @DisplayName("#85-S4 없는 대상, 참여하지 않은 채팅방은 404")
    void 없는_대상은_404() throws Exception {
        report(tester, "RECRUITMENT", "999999999", "없는 글").andExpect(status().isNotFound());
        report(tester, "USER", "999999999", "없는 회원").andExpect(status().isNotFound());
        report(stranger, "CHAT", room.getRoomKey(), "남의 방").andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("#85-S5 증거 파일 규칙에 맞지 않으면 400이고 신고를 만들지 않는다")
    void 증거_파일_규칙() throws Exception {
        String target = developer.getId().toString();
        // 확장자만 png인 글 파일
        report(tester, "USER", target, "가짜 이미지", file("fake.png", "hello".getBytes(StandardCharsets.US_ASCII)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.fields.files").value("PNG·JPG·WEBP·PDF 파일만 올릴 수 있어요"));
        MockMultipartFile[] six = new MockMultipartFile[6];
        Arrays.setAll(six, i -> file(i + ".png", PNG));
        report(tester, "USER", target, "여섯 장", six).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.fields.files").value("증거 파일은 5장까지 올릴 수 있어요"));
        report(tester, "USER", target, "큰 파일", file("big.png", bytes(PNG, "x".repeat(5 * 1024 * 1024))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.fields.files").value("파일은 한 장 5MB까지 올릴 수 있어요"));
        report(tester, "USER", target, " ").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.fields.reason").value("신고 사유를 적어 주세요"));
        report(tester, "FEEDBACK", "1", "피드백").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.fields.targetType").value("피드백 신고는 피드백 화면에서 해 주세요"));

        // 막힌 요청은 신고를 남기지 않아서 같은 대상을 바로 신고할 수 있다
        report(tester, "USER", target, "이제 제대로").andExpect(status().isCreated());
    }

    @Test
    @DisplayName("#85-S6 증거 파일은 신고한 본인과 운영자만 열 수 있다")
    void 증거_파일은_신고자와_운영자만() throws Exception {
        ResultActions created = report(tester, "USER", developer.getId().toString(), "증거", file("screen.png", PNG))
                .andExpect(status().isCreated());
        String body = created.andReturn().getResponse().getContentAsString();
        Integer reportId = JsonPath.read(body, "$.data.id");
        Integer evidenceId = JsonPath.read(body, "$.data.evidences[0].id");
        String url = "/api/v1/reports/" + reportId + "/evidences/" + evidenceId;

        User admin = em.merge(User.builder().nickname("신고운영" + reportId).email("admin" + reportId + "@test.com")
                .role(Role.ADMIN).status(UserStatus.ACTIVE).build());
        em.flush();

        for (User allowed : new User[]{tester, admin}) {
            mvc.perform(get(url).header("Authorization", "Bearer " + jwt.createAccessToken(allowed.getId())))
                    .andExpect(status().isOk())
                    .andExpect(header().string("Content-Type", "image/png"))
                    .andExpect(header().string("Cache-Control", "private, no-store"))
                    .andExpect(content().bytes(PNG));
        }
        // 신고당한 회원·다른 회원은 있는지도 모른다
        for (User denied : new User[]{developer, stranger}) {
            mvc.perform(get(url).header("Authorization", "Bearer " + jwt.createAccessToken(denied.getId())))
                    .andExpect(status().isNotFound());
        }
        mvc.perform(get(url)).andExpect(status().isUnauthorized());
        // 신고 id와 증거 id가 맞지 않으면 404
        mvc.perform(get("/api/v1/reports/" + (reportId + 1) + "/evidences/" + evidenceId)
                .header("Authorization", "Bearer " + jwt.createAccessToken(admin.getId()))).andExpect(status().isNotFound());
    }

    // ---- 2차: 운영자 판정, 피드백 신고 연결, 내 신고 목록 ----

    User admin() {
        String s = UUID.randomUUID().toString().substring(0, 6);
        User admin = User.builder().name("한운영").nickname("신고운영" + s).email("admin" + s + "@test.com")
                .role(Role.ADMIN).status(UserStatus.ACTIVE).build();
        em.persist(admin);
        return admin;
    }

    ResultActions asUser(User user, MockHttpServletRequestBuilder request) throws Exception {
        return mvc.perform(request.header("Authorization", "Bearer " + jwt.createAccessToken(user.getId())));
    }

    ResultActions review(User admin, long reportId, String result) throws Exception {
        return asUser(admin, post("/api/v1/admin/reports/" + reportId + "/review")
                .contentType(MediaType.APPLICATION_JSON).content("{\"result\":\"" + result + "\"}"));
    }

    long id(ResultActions result) throws Exception {
        return ((Integer) JsonPath.read(result.andReturn().getResponse().getContentAsString(), "$.data.id")).longValue();
    }

    Feedback feedback() {
        Feedback feedback = Feedback.builder().register(register).content("앱이 자꾸 꺼져요").submittedAt(LocalDateTime.now()).build();
        em.persist(feedback);
        em.flush();
        return feedback;
    }

    // 피드백 신고는 개발자가 피드백 신고 API로 한다
    long reportFeedback(Feedback feedback) throws Exception {
        asUser(developer, post("/api/v1/developer/feedbacks/" + feedback.getId() + "/report")
                .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"써 보지 않고 냈어요\"}")).andExpect(status().isOk());
        em.flush();
        return em.createQuery("select r.id from reports r where r.targetType = :type and r.targetId = :id", Long.class)
                .setParameter("type", ReportTargetType.FEEDBACK).setParameter("id", feedback.getId()).getSingleResult();
    }

    // 오래된 순을 확인하려고 신고 일시를 minutes분 앞당긴다
    void ageReport(long reportId, int minutes) {
        em.flush();
        em.createNativeQuery("update reports set created_at = created_at - make_interval(mins => :m) where id = :id")
                .setParameter("m", minutes).setParameter("id", reportId).executeUpdate();
        em.clear();
    }

    @Test
    @DisplayName("#85-S9 운영자가 검토 대기·처리 완료 신고 목록을 대상 종류로 걸러 본다")
    void 운영자_신고_목록() throws Exception {
        User admin = admin();
        long first = id(report(tester, "USER", developer.getId().toString(), "첫 신고"));
        long second = id(report(tester, "RECRUITMENT", recruitment.getId().toString(), "둘째 신고"));
        long third = id(report(stranger, "USER", developer.getId().toString(), "셋째 신고"));
        ageReport(first, 10);
        ageReport(third, 5);
        review(admin, second, "REJECTED").andExpect(status().isOk());

        String all = asUser(admin, get("/api/v1/admin/reports")).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        List<Integer> pendingIds = JsonPath.read(all, "$.data[*].id");
        assertThat(pendingIds).contains((int) first, (int) third).doesNotContain((int) second);
        assertThat(pendingIds).containsSubsequence((int) first, (int) third);

        asUser(admin, get("/api/v1/admin/reports?targetType=USER")).andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.id == " + first + ")].reporter.nickname").value(tester.getNickname()))
                .andExpect(jsonPath("$.data[?(@.id == " + first + ")].reportedUser.id").value(developer.getId().intValue()))
                .andExpect(jsonPath("$.data[?(@.id == " + first + ")].target.nickname").value(developer.getNickname()))
                .andExpect(jsonPath("$.data[?(@.id == " + second + ")]").doesNotExist());

        asUser(admin, get("/api/v1/admin/reports?status=DONE&targetType=RECRUITMENT")).andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id").value((int) second))
                .andExpect(jsonPath("$.data[0].status").value("REJECTED"))
                .andExpect(jsonPath("$.data[0].target.recruitmentTitle").value(recruitment.getTitle()))
                .andExpect(jsonPath("$.data[0].reviewer.nickname").value(admin.getNickname()))
                .andExpect(jsonPath("$.data[0].reviewer.maskedName").value("한*영"))
                .andExpect(jsonPath("$.data[0].reviewedAt").exists());
        asUser(admin, get("/api/v1/admin/reports?status=ALL")).andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("#85-S10 운영자가 신고 상세에서 대상 내용과 증거를 본다")
    void 운영자_신고_상세() throws Exception {
        User admin = admin();
        long chat = id(report(developer, "CHAT", room.getRoomKey(), "위협", file("chat.png", PNG)));
        asUser(admin, get("/api/v1/admin/reports/" + chat)).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.target.roomKey").value(room.getRoomKey()))
                .andExpect(jsonPath("$.data.target.recruitmentTitle").value(recruitment.getTitle()))
                .andExpect(jsonPath("$.data.evidences[0].originalName").value("chat.png"))
                .andExpect(jsonPath("$.data.status").value("PENDING"));

        long feedbackReport = reportFeedback(feedback());
        asUser(admin, get("/api/v1/admin/reports/" + feedbackReport))
                .andExpect(jsonPath("$.data.target.feedbackContent").value("앱이 자꾸 꺼져요"))
                .andExpect(jsonPath("$.data.target.recruitmentTitle").value(recruitment.getTitle()))
                .andExpect(jsonPath("$.data.reportedUser.id").value(tester.getId().intValue()));
        // 목록에는 피드백 원문과 증거를 넣지 않는다
        asUser(admin, get("/api/v1/admin/reports?targetType=FEEDBACK"))
                .andExpect(jsonPath("$.data[0].id").value((int) feedbackReport))
                .andExpect(jsonPath("$.data[0].target.feedbackContent").doesNotExist())
                .andExpect(jsonPath("$.data[0].evidences").doesNotExist());
        asUser(admin, get("/api/v1/admin/reports/999999999")).andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("#85-S11 운영자가 신고를 기각하거나 인정하고, 판정은 한 번만 할 수 있다")
    void 운영자_판정은_한_번만() throws Exception {
        User admin = admin();
        long reportId = id(report(tester, "USER", developer.getId().toString(), "욕설"));
        review(admin, reportId, "PENDING").andExpect(status().isBadRequest());
        review(admin, reportId, "ACCEPTED").andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("ACCEPTED"))
                .andExpect(jsonPath("$.data.reviewer.id").value(admin.getId().intValue()))
                .andExpect(jsonPath("$.data.reviewedAt").exists());
        review(admin, reportId, "REJECTED").andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("REPORT_ALREADY_REVIEWED"));
        review(admin, 999999999, "REJECTED").andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("#85-S12 피드백 신고 API로 신고하면 FEEDBACK 신고가 생기고, 기각하면 REWARDED, 인정하면 EXCLUDED")
    void 피드백_신고_판정() throws Exception {
        User admin = admin();
        Feedback rejected = feedback();
        Feedback accepted = feedback();
        long rejectedReport = reportFeedback(rejected);
        long acceptedReport = reportFeedback(accepted);

        review(admin, rejectedReport, "REJECTED").andExpect(status().isOk());
        review(admin, acceptedReport, "ACCEPTED").andExpect(status().isOk());
        em.flush();
        em.clear();
        assertThat(em.find(Feedback.class, rejected.getId()).getStatus()).isEqualTo(FeedbackStatus.REWARDED);
        assertThat(em.find(Feedback.class, accepted.getId()).getStatus()).isEqualTo(FeedbackStatus.EXCLUDED);
        Report saved = em.find(Report.class, rejectedReport);
        assertThat(saved.getReporter().getId()).isEqualTo(developer.getId());
        assertThat(saved.getReportedUser().getId()).isEqualTo(tester.getId());
        assertThat(saved.getReason()).isEqualTo("써 보지 않고 냈어요");
    }

    @Test
    @DisplayName("#85-S13 판정이 끝난 대상은 같은 회원이 다시 신고할 수 있다")
    void 판정_뒤에는_다시_신고할_수_있다() throws Exception {
        long reportId = id(report(tester, "USER", developer.getId().toString(), "첫 신고"));
        review(admin(), reportId, "REJECTED").andExpect(status().isOk());
        report(tester, "USER", developer.getId().toString(), "다시 신고").andExpect(status().isCreated());
    }

    @Test
    @DisplayName("#85-S14 회원이 내 신고 목록에서 내가 한 신고와 처리 상태를 본다")
    void 내_신고_목록() throws Exception {
        long older = id(report(tester, "USER", developer.getId().toString(), "먼저", file("a.png", PNG)));
        long newer = id(report(tester, "RECRUITMENT", recruitment.getId().toString(), "나중"));
        report(stranger, "USER", developer.getId().toString(), "남의 신고").andExpect(status().isCreated());
        ageReport(older, 1);
        review(admin(), older, "ACCEPTED").andExpect(status().isOk());

        asUser(tester, get("/api/v1/reports/me")).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.data[0].id").value((int) newer))
                .andExpect(jsonPath("$.data[0].status").value("PENDING"))
                .andExpect(jsonPath("$.data[1].id").value((int) older))
                .andExpect(jsonPath("$.data[1].status").value("ACCEPTED"))
                .andExpect(jsonPath("$.data[1].reviewedAt").exists())
                .andExpect(jsonPath("$.data[1].evidences[0].originalName").value("a.png"))
                .andExpect(jsonPath("$.data[1].reportedUser").doesNotExist())
                .andExpect(jsonPath("$.data[1].reviewer").doesNotExist());
    }

    @Test
    @DisplayName("#85-S15 운영자 신고 API는 운영자만 쓸 수 있다")
    void 운영자_API는_운영자만() throws Exception {
        long reportId = id(report(tester, "USER", developer.getId().toString(), "권한"));
        asUser(tester, get("/api/v1/admin/reports")).andExpect(status().isForbidden());
        asUser(tester, get("/api/v1/admin/reports/" + reportId)).andExpect(status().isForbidden());
        review(tester, reportId, "REJECTED").andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/admin/reports")).andExpect(status().isUnauthorized());
    }
}
