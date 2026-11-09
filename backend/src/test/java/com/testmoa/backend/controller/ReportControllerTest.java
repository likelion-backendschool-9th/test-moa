package com.testmoa.backend.controller;

import com.jayway.jsonpath.JsonPath;
import com.testmoa.backend.entity.ChatRoom;
import com.testmoa.backend.entity.Recruitment;
import com.testmoa.backend.entity.Report;
import com.testmoa.backend.entity.User;
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
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
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
    ChatRoom room;

    @BeforeEach
    void setUp() {
        fixtures = new ChatFixtures(em);
        String s = UUID.randomUUID().toString().substring(0, 6);
        developer = fixtures.user("신고개발" + s);
        tester = fixtures.user("신고테스터" + s);
        stranger = fixtures.user("신고남" + s);
        recruitment = fixtures.recruitment(developer, "북로그");
        room = ChatRoom.builder().register(fixtures.confirmedRegister(recruitment, tester)).build();
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
}
