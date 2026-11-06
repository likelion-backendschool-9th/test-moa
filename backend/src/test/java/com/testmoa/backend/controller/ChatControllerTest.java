package com.testmoa.backend.controller;

import com.testmoa.backend.domain.entity.*;
import com.testmoa.backend.global.common.*;
import com.testmoa.backend.global.security.JwtProvider;
import com.testmoa.backend.support.ChatFixtures;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.stream.IntStream;
import static com.testmoa.backend.support.ChatFixtures.participantWithRole;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ChatControllerTest {
    @Autowired MockMvc mvc;
    @Autowired EntityManager em;
    @Autowired JwtProvider jwt;
    @Autowired ObjectMapper json;
    @Autowired com.testmoa.backend.service.ChatService chatService;
    ChatFixtures fixtures;
    User developer, tester;
    ChatRoom room;
    ChatParticipant developerSide, testerSide;

    @BeforeEach
    void setUp() {
        fixtures = new ChatFixtures(em);
        developer = fixtures.user("모아개발");
        tester = fixtures.user("모아테스터");
        var recruitment = fixtures.recruitment(developer, "북로그", "https://img.test/booklog.png");
        room = ChatRoom.builder().register(fixtures.confirmedRegister(recruitment, tester)).build();
        em.persist(room);
        developerSide = participantWithRole(room, ChatRole.DEVELOPER);
        testerSide = participantWithRole(room, ChatRole.TESTER);
        em.flush();
    }

    String url() { return "/api/v1/chats/" + room.getRoomKey(); }
    ResultActions call(MockHttpServletRequestBuilder request, User user) throws Exception {
        return mvc.perform(request.header("Authorization", "Bearer " + jwt.createAccessToken(user.getId())));
    }
    ResultActions send(String text) throws Exception {
        return call(post(url() + "/messages").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("text", text))), tester);
    }
    void messages(int count) {
        for (int i = 0; i < count; i++) {
            var message = room.createMessage(i % 2 == 0 ? testerSide : developerSide, "메시지" + (i + 1));
            em.persist(message);
        }
        em.flush();
    }
    void reload() { em.flush(); em.clear(); }

    @Test @DisplayName("#49-S1 테스터가 본 방 정보")
    void testerRoom() throws Exception {
        call(get(url()), tester).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.roomKey").value(room.getRoomKey()))
                .andExpect(jsonPath("$.data.recruitmentId").value(room.getRecruitment().getId()))
                .andExpect(jsonPath("$.data.projectName").value("북로그"))
                .andExpect(jsonPath("$.data.projectImage").value("https://img.test/booklog.png"))
                .andExpect(jsonPath("$.data.roomName").isEmpty())
                .andExpect(jsonPath("$.data.myRole").value("TESTER"))
                .andExpect(jsonPath("$.data.partner.nickname").value("모아개발"))
                .andExpect(jsonPath("$.data.partner.role").value("DEVELOPER"))
                .andExpect(jsonPath("$.data.messages").doesNotExist());
        assertThat(testerSide.getLastReadSeq()).isZero();
    }
    @Test @DisplayName("#49-S2 개발자 이름 변경은 본인에게만 보인다")
    void customName() throws Exception {
        developerSide.rename("결제 테스트");
        call(get(url()), developer).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.roomName").value("결제 테스트"))
                .andExpect(jsonPath("$.data.myRole").value("DEVELOPER"))
                .andExpect(jsonPath("$.data.partner.nickname").value("모아테스터"))
                .andExpect(jsonPath("$.data.partner.role").value("TESTER"));
        call(get(url()), tester).andExpect(jsonPath("$.data.roomName").isEmpty());
    }
    @Test @DisplayName("#49-S3 메시지 순서와 보는 사람에 따른 발신자")
    void messageSender() throws Exception {
        messages(2);
        call(get(url() + "/messages"), tester).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.messages[*].seq", contains(1, 2)))
                .andExpect(jsonPath("$.data.messages[*].text", contains("메시지1", "메시지2")))
                .andExpect(jsonPath("$.data.messages[*].from", contains("me", "partner")))
                .andExpect(jsonPath("$.data.messages[0].sentAt").exists())
                .andExpect(jsonPath("$.data.hasMore").value(false));
        call(get(url() + "/messages"), developer)
                .andExpect(jsonPath("$.data.messages[*].from", contains("partner", "me")));
        assertThat(testerSide.getLastReadSeq()).isZero();
    }
    @Test @DisplayName("#49-S4 빈 방과 최근 메시지 30개 경계")
    void latestSlice() throws Exception {
        call(get(url() + "/messages"), tester).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.messages").isEmpty()).andExpect(jsonPath("$.data.hasMore").value(false));
        messages(30);
        call(get(url() + "/messages"), tester).andExpect(jsonPath("$.data.messages.length()").value(30))
                .andExpect(jsonPath("$.data.hasMore").value(false));
        messages(1);
        call(get(url() + "/messages"), tester).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.messages[*].seq", contains(IntStream.rangeClosed(2, 31).boxed().toArray())))
                .andExpect(jsonPath("$.data.hasMore").value(true));
    }
    @Test @DisplayName("#49-S5 이전 메시지를 커서로 조회")
    void olderSlice() throws Exception {
        messages(65);
        call(get(url() + "/messages").param("before", "36"), tester).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.messages[*].seq", contains(IntStream.rangeClosed(6, 35).boxed().toArray())))
                .andExpect(jsonPath("$.data.hasMore").value(true));
        call(get(url() + "/messages").param("before", "6"), tester)
                .andExpect(jsonPath("$.data.messages[*].seq", contains(1, 2, 3, 4, 5)))
                .andExpect(jsonPath("$.data.hasMore").value(false));
        call(get(url() + "/messages").param("before", "1"), tester)
                .andExpect(jsonPath("$.data.messages").isEmpty()).andExpect(jsonPath("$.data.hasMore").value(false));
    }
    @Test @DisplayName("#49-S6 잘못된 커서는 400")
    void invalidCursor() throws Exception {
        for (String before : new String[]{"0", "-1", "abc"}) {
            call(get(url() + "/messages").param("before", before), tester).andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error.code").value("INVALID_INPUT"));
        }
    }
    @Test @DisplayName("#49-S7 메시지 저장과 순번·최근 일시 갱신")
    void sendMessage() throws Exception {
        messages(2);
        send("로그인 화면에서\n멈춰요").andExpect(status().isOk())
                .andExpect(jsonPath("$.data.seq").value(3)).andExpect(jsonPath("$.data.from").value("me"))
                .andExpect(jsonPath("$.data.text").value("로그인 화면에서\n멈춰요"))
                .andExpect(jsonPath("$.data.sentAt").exists());
        reload();
        var saved = em.find(ChatRoom.class, room.getId());
        var last = em.createQuery("select m from chat_messages m where m.room = :room and m.seq = 3", ChatMessage.class)
                .setParameter("room", saved).getSingleResult();
        assertThat(saved.getLastSeq()).isEqualTo(3);
        assertThat(saved.getLastMessageAt()).isEqualTo(last.getSentAt());
        call(get(url() + "/messages"), developer).andExpect(jsonPath("$.data.messages[2].text").value("로그인 화면에서\n멈춰요"))
                .andExpect(jsonPath("$.data.messages[2].from").value("partner"));
    }
    @Test @DisplayName("#49-S8 앞뒤 공백과 줄바꿈 그대로 저장")
    void preserveWhitespace() throws Exception {
        String text = "  \n 확인했어요 \n ";
        send(text).andExpect(status().isOk()).andExpect(jsonPath("$.data.text").value(text));
        reload();
        assertThat(em.createQuery("select m.content from chat_messages m where m.room.id = :id", String.class)
                .setParameter("id", room.getId()).getSingleResult()).isEqualTo(text);
    }
    @Test @DisplayName("#49-S9 상대의 삭제만 풀고 이름과 읽은 순번 유지")
    void restorePartner() throws Exception {
        developerSide.hide();
        developerSide.rename("결제 테스트");
        developerSide.markRead(2);
        messages(2);
        send("다시 확인 부탁드려요").andExpect(status().isOk());
        reload();
        var saved = em.find(ChatParticipant.class, developerSide.getId());
        assertThat(saved.isHidden()).isFalse();
        assertThat(saved.getCustomName()).isEqualTo("결제 테스트");
        assertThat(saved.getLastReadSeq()).isEqualTo(2);
        call(get(url()), developer).andExpect(status().isOk());
        call(get(url() + "/messages"), developer).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.messages[2].text").value("다시 확인 부탁드려요"));
    }
    @Test @DisplayName("#49-S11 빈 메시지는 저장하지 않는다")
    void blankMessage() throws Exception {
        for (String text : new String[]{"", "  \n  "}) {
            send(text).andExpect(status().isBadRequest()).andExpect(jsonPath("$.error.code").value("INVALID_INPUT"))
                    .andExpect(jsonPath("$.error.fields.text").value("메시지를 입력해 주세요"));
        }
        call(post(url() + "/messages").contentType(MediaType.APPLICATION_JSON).content("{}"), tester)
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error.fields.text").value("메시지를 입력해 주세요"));
        assertThat(room.getLastSeq()).isZero();
    }
    @Test @DisplayName("#49-S12 공백을 포함해 500자까지 허용")
    void messageLength() throws Exception {
        for (String text : new String[]{"가".repeat(500), " " + "가".repeat(498) + " "}) {
            send(text).andExpect(status().isOk()).andExpect(jsonPath("$.data.text").value(text));
        }
        for (String text : new String[]{"가".repeat(501), " " + "가".repeat(499) + " "}) {
            send(text).andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error.fields.text").value("메시지는 500자까지 보낼 수 있어요"));
        }
        reload();
        assertThat(em.find(ChatRoom.class, room.getId()).getLastSeq()).isEqualTo(2);
    }
    MockHttpServletRequestBuilder[] requests(String base) {
        return new MockHttpServletRequestBuilder[]{get(base), get(base + "/messages"),
                post(base + "/messages").contentType(MediaType.APPLICATION_JSON).content("{\"text\":\"안녕하세요\"}")};
    }
    @Test @DisplayName("#49-S13 비로그인은 세 API 모두 401")
    void unauthenticated() throws Exception {
        for (var request : requests(url())) {
            mvc.perform(request).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));
        }
    }
    void notFound(User user, String base) throws Exception {
        for (var request : requests(base)) {
            call(request, user).andExpect(status().isNotFound()).andExpect(content().json(
                    "{\"success\":false,\"data\":null,\"error\":{\"code\":\"NOT_FOUND\",\"message\":\"찾을 수 없어요\"}}",
                    org.springframework.test.json.JsonCompareMode.STRICT));
        }
    }
    @Test @DisplayName("#49-S14 비참여자·운영자·없는 방은 같은 404")
    void inaccessible() throws Exception {
        var outsider = fixtures.user("외부회원");
        var admin = fixtures.user("운영자");
        em.flush();
        em.createQuery("update users u set u.role = :role where u.id = :id")
                .setParameter("role", Role.ADMIN).setParameter("id", admin.getId()).executeUpdate();
        em.clear();
        notFound(outsider, url());
        notFound(admin, url());
        notFound(tester, "/api/v1/chats/aaaaaaaaaaaaaaaaaaaaaa");
        assertThat(em.find(ChatRoom.class, room.getId()).getLastSeq()).isZero();
    }
    @Test @DisplayName("#49-S15 내가 삭제한 방은 세 API 모두 404이고 삭제 유지")
    void hiddenRoom() throws Exception {
        testerSide.hide();
        reload();
        notFound(tester, url());
        reload();
        assertThat(em.find(ChatParticipant.class, testerSide.getId()).isHidden()).isTrue();
        assertThat(em.find(ChatRoom.class, room.getId()).getLastSeq()).isZero();
    }
    @Test @DisplayName("#49-S1 방 상세 정보는 지연 로딩 없이 쿼리 한 번으로 조회")
    void roomSingleQuery() {
        em.flush();
        em.clear();
        var statistics = em.getEntityManagerFactory().unwrap(org.hibernate.SessionFactory.class).getStatistics();
        boolean enabled = statistics.isStatisticsEnabled();
        statistics.setStatisticsEnabled(true);
        statistics.clear();
        try {
            var result = chatService.getRoom(room.getRoomKey(), tester.getId());
            assertThat(result.projectName()).isEqualTo("북로그");
            assertThat(result.partner().nickname()).isEqualTo("모아개발");
            assertThat(statistics.getPrepareStatementCount()).isEqualTo(1);
            assertThat(statistics.getEntityLoadCount()).isZero();
        } finally {
            statistics.setStatisticsEnabled(enabled);
        }
    }

}
