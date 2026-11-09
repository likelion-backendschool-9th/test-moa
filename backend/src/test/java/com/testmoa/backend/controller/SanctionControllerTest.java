package com.testmoa.backend.controller;

import com.jayway.jsonpath.JsonPath;
import com.testmoa.backend.entity.Report;
import com.testmoa.backend.entity.Sanction;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.entity.enums.Restriction;
import com.testmoa.backend.entity.enums.ReportTargetType;
import com.testmoa.backend.entity.enums.SanctionType;
import com.testmoa.backend.entity.enums.UserStatus;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.global.security.JwtProvider;
import com.testmoa.backend.global.security.Role;
import com.testmoa.backend.service.SanctionChecker;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 운영자 제재·해제(#86). 신고 테스트와 같은 설정이라 실행 환경을 함께 쓴다
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class SanctionControllerTest {
    @Autowired MockMvc mvc;
    @Autowired EntityManager em;
    @Autowired JwtProvider jwt;
    @Autowired SanctionChecker sanctionChecker;

    String suffix;
    User admin, member, other;

    @BeforeEach
    void setUp() {
        suffix = UUID.randomUUID().toString().substring(0, 6);
        admin = save("운영" + suffix, "한운영", Role.ADMIN);
        member = save("제재회원" + suffix, "서준호", Role.USER);
        other = save("다른회원" + suffix, "김민준", Role.USER);
        em.flush();
    }

    User save(String nickname, String name, Role role) {
        User user = User.builder().name(name).nickname(nickname).email("member" + nickname + "@example.com")
                .role(role).status(UserStatus.ACTIVE).build();
        em.persist(user);
        return user;
    }

    ResultActions as(User user, MockHttpServletRequestBuilder request) throws Exception {
        return mvc.perform(request.header("Authorization", "Bearer " + jwt.createAccessToken(user.getId())));
    }

    ResultActions sanction(User target, String json) throws Exception {
        return as(admin, post("/api/v1/admin/users/" + target.getId() + "/sanctions")
                .contentType(MediaType.APPLICATION_JSON).content(json));
    }

    ResultActions release(long sanctionId, String reason) throws Exception {
        return as(admin, post("/api/v1/admin/sanctions/" + sanctionId + "/release")
                .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"" + reason + "\"}"));
    }

    static long id(ResultActions result) throws Exception {
        return ((Integer) JsonPath.read(result.andReturn().getResponse().getContentAsString(), "$.data.id")).longValue();
    }

    @Test
    @DisplayName("#86-S1 운영자가 경고·기간 정지·영구 정지를 사유와 함께 준다")
    void 경고_기간정지_영구정지() throws Exception {
        LocalDateTime before = LocalDateTime.now();
        sanction(member, """
                {"type":"SUSPENSION","days":7,"restrictions":["CHAT","APPLY"],"reason":"테스트 중 욕설"}""")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.type").value("SUSPENSION"))
                .andExpect(jsonPath("$.data.restrictions[0]").value("APPLY"))
                .andExpect(jsonPath("$.data.restrictions[1]").value("CHAT"))
                .andExpect(jsonPath("$.data.active").value(true))
                .andExpect(jsonPath("$.data.sanctionedBy.id").value(admin.getId().intValue()));
        Sanction suspension = em.createQuery("select s from sanctions s where s.user.id = :id and s.type = :type", Sanction.class)
                .setParameter("id", member.getId()).setParameter("type", SanctionType.SUSPENSION).getSingleResult();
        assertThat(suspension.getEndsAt()).isCloseTo(before.plusDays(7), org.assertj.core.api.Assertions.within(1, ChronoUnit.MINUTES));

        sanction(member, """
                {"type":"WARNING","reason":"첫 경고"}""").andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.restrictions.length()").value(0))
                .andExpect(jsonPath("$.data.endsAt").doesNotExist())
                .andExpect(jsonPath("$.data.active").value(false));
        sanction(other, """
                {"type":"PERMANENT","restrictions":["LOGIN"],"reason":"반복 허위 피드백"}""").andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.endsAt").doesNotExist())
                .andExpect(jsonPath("$.data.active").value(true));

        sanction(member, """
                {"type":"SUSPENSION","restrictions":["CHAT"],"reason":"기간 없음"}""").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.fields.days").value("정지 기간은 1~3,650일로 적어 주세요"));
        sanction(member, """
                {"type":"SUSPENSION","days":3,"reason":"기능 없음"}""").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.fields.restrictions").value("막을 기능을 하나 이상 골라 주세요"));
        sanction(member, """
                {"type":"WARNING","restrictions":["CHAT"],"reason":"경고에 기능"}""").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.fields.restrictions").value("경고는 기능을 막지 않아요"));
        sanction(member, """
                {"type":"WARNING","reason":" "}""").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.fields.reason").value("제재 사유를 적어 주세요"));
    }

    @Test
    @DisplayName("#86-S2 기간 정지는 끝나면 따로 처리하지 않아도 풀린다")
    void 기간이_끝나면_풀린다() throws Exception {
        LocalDateTime now = LocalDateTime.now();
        Sanction ended = Sanction.builder().user(member).sanctionedBy(admin).type(SanctionType.SUSPENSION)
                .restrictions(Set.of(Restriction.CHAT)).reason("지난 정지").startedAt(now.minusDays(8)).endsAt(now.minusDays(1)).build();
        em.persist(ended);
        em.flush();

        assertThatNoException().isThrownBy(() -> sanctionChecker.require(member.getId(), Restriction.CHAT));
        as(admin, get("/api/v1/admin/users/" + member.getId())).andExpect(jsonPath("$.data.activeRestrictions.length()").value(0))
                .andExpect(jsonPath("$.data.sanctions[0].active").value(false));
        release(ended.getId(), "이미 끝남").andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("SANCTION_NOT_ACTIVE"));
    }

    @Test
    @DisplayName("#86-S3 운영자가 언제든 해제하고, 해제 사유는 필수다")
    void 해제() throws Exception {
        long sanctionId = id(sanction(member, """
                {"type":"PERMANENT","restrictions":["CHAT"],"reason":"영구 정지"}"""));
        release(sanctionId, " ").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.fields.reason").value("해제 사유를 적어 주세요"));
        release(sanctionId, "허위 신고로 확인").andExpect(status().isOk())
                .andExpect(jsonPath("$.data.active").value(false))
                .andExpect(jsonPath("$.data.releasedAt").exists())
                .andExpect(jsonPath("$.data.releaseReason").value("허위 신고로 확인"))
                .andExpect(jsonPath("$.data.releasedBy.id").value(admin.getId().intValue()));
        assertThatNoException().isThrownBy(() -> sanctionChecker.require(member.getId(), Restriction.CHAT));
        release(sanctionId, "또 해제").andExpect(status().isConflict());
        release(999999999L, "없음").andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("#86-S4 로그인이 막힌 회원은 로그인하지 못하고, 이미 로그인한 기기도 끊긴다")
    void 로그인_제재() throws Exception {
        String email = "login" + suffix + "@example.com";
        mvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON).content("""
                {"name":"김로그","nickname":"로그%s","email":"%s","password":"moa2026pw"}""".formatted(suffix, email)))
                .andExpect(status().isCreated());
        String login = """
                {"email":"%s","password":"moa2026pw"}""".formatted(email);
        String tokens = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(login))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String access = JsonPath.read(tokens, "$.data.accessToken");
        String refresh = JsonPath.read(tokens, "$.data.refreshToken");
        User signedUp = em.createQuery("select u from users u where u.email = :email", User.class).setParameter("email", email).getSingleResult();

        long sanctionId = id(sanction(signedUp, """
                {"type":"SUSPENSION","days":3,"restrictions":["LOGIN"],"reason":"계정 공유"}"""));

        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(login))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("RESTRICTED"))
                .andExpect(jsonPath("$.error.fields.restriction").value("LOGIN"))
                .andExpect(jsonPath("$.error.fields.reason").value("계정 공유"))
                .andExpect(jsonPath("$.error.fields.endsAt").exists());
        mvc.perform(get("/api/users/me").header("Authorization", "Bearer " + access)).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/refresh").contentType(MediaType.APPLICATION_JSON).content("""
                {"refreshToken":"%s"}""".formatted(refresh))).andExpect(status().isUnauthorized());

        release(sanctionId, "오해였음").andExpect(status().isOk());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(login)).andExpect(status().isOk());
    }

    @Test
    @DisplayName("#86-S5 다른 기능이 막힌 회원은 그 기능에서 403 RESTRICTED와 같은 안내를 받는다")
    void 기능_제재_확인() throws Exception {
        sanction(member, """
                {"type":"SUSPENSION","days":7,"restrictions":["CHAT"],"reason":"채팅 욕설"}""").andExpect(status().isCreated());

        assertThatThrownBy(() -> sanctionChecker.require(member.getId(), Restriction.CHAT))
                .isInstanceOfSatisfying(BusinessException.class, e -> {
                    assertThat(e.getErrorCode()).isEqualTo(ErrorCode.RESTRICTED);
                    assertThat(e.getFields()).containsEntry("restriction", "CHAT").containsEntry("reason", "채팅 욕설").containsKey("endsAt");
                });
        assertThatNoException().isThrownBy(() -> sanctionChecker.require(member.getId(), Restriction.APPLY));
        assertThatNoException().isThrownBy(() -> sanctionChecker.require(other.getId(), Restriction.CHAT));
    }

    @Test
    @DisplayName("#86-S6 운영자가 회원 목록을 닉네임과 필터로 찾는다")
    void 운영자_회원_목록() throws Exception {
        sanction(member, """
                {"type":"SUSPENSION","days":7,"restrictions":["CHAT"],"reason":"정지"}""").andExpect(status().isCreated());
        em.persist(Report.builder().reporter(member).reportedUser(other).targetType(ReportTargetType.USER)
                .targetId(other.getId()).reason("검토 대기").build());
        em.flush();

        as(admin, get("/api/v1/admin/users?q=" + suffix)).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.data[0].id").value(other.getId().intValue()))
                .andExpect(jsonPath("$.data[0].pendingReportCount").value(1))
                .andExpect(jsonPath("$.data[0].maskedName").doesNotExist())
                .andExpect(jsonPath("$.data[0].maskedEmail").doesNotExist())
                .andExpect(jsonPath("$.data[1].id").value(member.getId().intValue()))
                .andExpect(jsonPath("$.data[1].sanctionCount").value(1))
                .andExpect(jsonPath("$.data[1].activeRestrictions[0]").value("CHAT"))
                .andExpect(jsonPath("$.data[1].joinedAt").exists());
        String sanctioned = as(admin, get("/api/v1/admin/users?q=" + suffix + "&filter=sanctioned")).andReturn().getResponse().getContentAsString();
        assertThat(JsonPath.<List<Integer>>read(sanctioned, "$.data[*].id")).containsExactly(member.getId().intValue());
        String reported = as(admin, get("/api/v1/admin/users?q=" + suffix + "&filter=reported")).andReturn().getResponse().getContentAsString();
        assertThat(JsonPath.<List<Integer>>read(reported, "$.data[*].id")).containsExactly(other.getId().intValue());
        // 운영자는 목록에 없다
        String admins = as(admin, get("/api/v1/admin/users").param("q", admin.getNickname())).andReturn().getResponse().getContentAsString();
        assertThat(JsonPath.<List<Integer>>read(admins, "$.data[*].id")).isEmpty();
        as(admin, get("/api/v1/admin/users?filter=nope")).andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("#86-S7 운영자가 회원 상세에서 제재 이력과 받은 신고를 본다")
    void 운영자_회원_상세() throws Exception {
        sanction(member, """
                {"type":"WARNING","reason":"먼저 경고"}""").andExpect(status().isCreated());
        sanction(member, """
                {"type":"SUSPENSION","days":7,"restrictions":["RECRUIT"],"reason":"나중 정지"}""").andExpect(status().isCreated());
        em.persist(Report.builder().reporter(other).reportedUser(member).targetType(ReportTargetType.USER)
                .targetId(member.getId()).reason("받은 신고").build());
        em.flush();

        as(admin, get("/api/v1/admin/users/" + member.getId())).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.nickname").value(member.getNickname()))
                .andExpect(jsonPath("$.data.maskedName").value("서*호"))
                .andExpect(jsonPath("$.data.maskedEmail").value("me***@example.com"))
                .andExpect(jsonPath("$.data.activeRestrictions[0]").value("RECRUIT"))
                .andExpect(jsonPath("$.data.sanctions.length()").value(2))
                .andExpect(jsonPath("$.data.sanctions[0].reason").value("나중 정지"))
                .andExpect(jsonPath("$.data.sanctions[1].type").value("WARNING"))
                .andExpect(jsonPath("$.data.receivedReports[0].reason").value("받은 신고"))
                .andExpect(jsonPath("$.data.receivedReports[0].status").value("PENDING"))
                .andExpect(jsonPath("$.data.pendingReportCount").value(1));
        as(admin, get("/api/v1/admin/users/999999999")).andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("#86-S8 회원이 내가 받은 경고·정지를 본다")
    void 내_제재() throws Exception {
        sanction(member, """
                {"type":"SUSPENSION","days":7,"restrictions":["FEEDBACK"],"reason":"성의 없는 피드백"}""").andExpect(status().isCreated());
        as(member, get("/api/v1/sanctions/me")).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].reason").value("성의 없는 피드백"))
                .andExpect(jsonPath("$.data[0].restrictions[0]").value("FEEDBACK"))
                .andExpect(jsonPath("$.data[0].endsAt").exists())
                .andExpect(jsonPath("$.data[0].active").value(true))
                .andExpect(jsonPath("$.data[0].sanctionedBy").doesNotExist());
        as(other, get("/api/v1/sanctions/me")).andExpect(jsonPath("$.data.length()").value(0));
    }

    @Test
    @DisplayName("#86-S9 운영자 회원·제재 API는 운영자만 쓸 수 있다")
    void 운영자만() throws Exception {
        as(member, get("/api/v1/admin/users")).andExpect(status().isForbidden());
        as(member, get("/api/v1/admin/users/" + other.getId())).andExpect(status().isForbidden());
        as(member, post("/api/v1/admin/users/" + other.getId() + "/sanctions").contentType(MediaType.APPLICATION_JSON)
                .content("{\"type\":\"WARNING\",\"reason\":\"권한\"}")).andExpect(status().isForbidden());
        as(member, post("/api/v1/admin/sanctions/1/release").contentType(MediaType.APPLICATION_JSON)
                .content("{\"reason\":\"권한\"}")).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/admin/users")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/sanctions/me")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("#86-S10 운영자와 자기 자신은 제재할 수 없다")
    void 운영자와_자기_자신은_제재할_수_없다() throws Exception {
        User otherAdmin = save("운영둘" + suffix, "박운영", Role.ADMIN);
        em.flush();
        sanction(otherAdmin, """
                {"type":"WARNING","reason":"운영자"}""").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.fields.userId").value("운영자는 제재할 수 없어요"));
        sanction(admin, """
                {"type":"WARNING","reason":"나"}""").andExpect(status().isBadRequest());
    }
}
