package com.testmoa.backend.controller;

import com.testmoa.backend.entity.ChatParticipant;
import com.testmoa.backend.entity.ChatRoom;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.entity.enums.ChatRole;
import com.testmoa.backend.global.security.JwtProvider;
import com.testmoa.backend.global.security.Role;
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
import org.springframework.test.json.JsonCompareMode;
import java.time.LocalDateTime;
import static com.testmoa.backend.support.ChatFixtures.participantWithRole;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ChatReadControllerTest {
    @Autowired MockMvc mvc;
    @Autowired EntityManager em;
    @Autowired JwtProvider jwt;
    ChatFixtures fixtures;
    User developer, tester;
    ChatRoom room;
    ChatParticipant developerSide, testerSide;

    @BeforeEach
    void setUp() {
        fixtures = new ChatFixtures(em);
        developer = fixtures.user("모아개발");
        tester = fixtures.user("모아테스터");
        room = newRoom(developer, tester, "북로그");
        developerSide = participantWithRole(room, ChatRole.DEVELOPER);
        testerSide = participantWithRole(room, ChatRole.TESTER);
        em.flush();
    }
    ChatRoom newRoom(User owner, User member, String title) {
        fixtures.subscribe(owner);
        var recruitment = fixtures.recruitment(owner, title);
        var created = ChatRoom.builder().register(fixtures.confirmedRegister(recruitment, member)).build();
        em.persist(created);
        return created;
    }
    String url() { return "/api/v1/chats/" + room.getRoomKey(); }
    ResultActions call(MockHttpServletRequestBuilder request, User user) throws Exception {
        return mvc.perform(request.header("Authorization", "Bearer " + jwt.createAccessToken(user.getId())));
    }
    ResultActions read(User user, long seq) throws Exception {
        return call(post(url() + "/read").contentType(MediaType.APPLICATION_JSON)
                .content("{\"seq\":" + seq + "}"), user);
    }
    void send(ChatRoom target, User user) throws Exception {
        call(post("/api/v1/chats/" + target.getRoomKey() + "/messages")
                .contentType(MediaType.APPLICATION_JSON).content("{\"text\":\"안녕하세요\"}"), user)
                .andExpect(status().isOk());
    }
    void sendThree() throws Exception {
        for (int i = 0; i < 3; i++) send(room, developer);
    }
    ChatParticipant saved(Long id) {
        em.flush();
        em.clear();
        return em.find(ChatParticipant.class, id);
    }
    LocalDateTime resetUpdatedAt() {
        var past = LocalDateTime.of(2020, 1, 1, 0, 0);
        em.flush();
        em.createNativeQuery("update chat_participants set updated_at = :past where id = :id")
                .setParameter("past", past).setParameter("id", testerSide.getId()).executeUpdate();
        em.clear();
        return past;
    }
    @Test @DisplayName("#52-S1 읽은 순번과 갱신 일시를 올리고 상대 읽음은 유지")
    void markRead() throws Exception {
        sendThree();
        var past = resetUpdatedAt();
        read(tester, 3).andExpect(status().isOk()).andExpect(jsonPath("$.data.lastReadSeq").value(3));
        var me = saved(testerSide.getId());
        assertThat(me.getLastReadSeq()).isEqualTo(3);
        assertThat(me.getUpdatedAt()).isAfter(past);
        assertThat(saved(developerSide.getId()).getLastReadSeq()).isZero();
    }
    @Test @DisplayName("#52-S3 작거나 같은 순번은 읽음과 갱신 일시를 바꾸지 않음")
    void neverGoBack() throws Exception {
        sendThree();
        read(tester, 3).andExpect(status().isOk());
        var past = resetUpdatedAt();
        for (long seq : new long[]{2, 3}) {
            read(tester, seq).andExpect(status().isOk()).andExpect(jsonPath("$.data.lastReadSeq").value(3));
            var me = saved(testerSide.getId());
            assertThat(me.getLastReadSeq()).isEqualTo(3);
            assertThat(me.getUpdatedAt()).isEqualTo(past);
        }
    }
    @Test @DisplayName("#52-S4 읽음 처리는 이름과 삭제 여부를 유지")
    void preserveOtherColumns() throws Exception {
        sendThree();
        call(patch(url()).contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"북로그 1차\"}"), tester)
                .andExpect(status().isOk());
        read(tester, 3).andExpect(status().isOk());
        var me = saved(testerSide.getId());
        assertThat(me.getCustomRoomName()).isEqualTo("북로그 1차");
        assertThat(me.isHidden()).isFalse();
    }
    @Test @DisplayName("#52-S12 비로그인의 읽음 처리와 헤더 수는 401")
    void unauthenticated() throws Exception {
        mvc.perform(get("/api/v1/chats/unread")).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));
        mvc.perform(post(url() + "/read").contentType(MediaType.APPLICATION_JSON).content("{\"seq\":1}"))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));
    }
    @Test @DisplayName("#52-S5 누락·잘못된 타입·범위 밖 순번은 400이며 읽음 유지")
    void invalidSeq() throws Exception {
        sendThree();
        read(tester, 1).andExpect(status().isOk());
        for (String body : new String[]{"{}", "{\"seq\":0}", "{\"seq\":-1}", "{\"seq\":\"abc\"}", "{\"seq\":4}"}) {
            call(post(url() + "/read").contentType(MediaType.APPLICATION_JSON).content(body), tester)
                    .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error.code").value("INVALID_INPUT"));
        }
        assertThat(saved(testerSide.getId()).getLastReadSeq()).isEqualTo(1);
    }
    void notFound(User user, String base) throws Exception {
        call(post(base + "/read").contentType(MediaType.APPLICATION_JSON).content("{\"seq\":1}"), user)
                .andExpect(status().isNotFound())
                .andExpect(content().json("{\"success\":false,\"data\":null,\"error\":{\"code\":\"NOT_FOUND\",\"message\":\"찾을 수 없어요\"}}", JsonCompareMode.STRICT));
    }
    @Test @DisplayName("#52-S13 비참여자·운영자·없는 방·지운 방은 같은 404")
    void inaccessible() throws Exception {
        sendThree();
        var outsider = fixtures.user("외부회원");
        var admin = fixtures.user("운영자");
        em.flush();
        em.createQuery("update users u set u.role = :role where u.id = :id")
                .setParameter("role", Role.ADMIN).setParameter("id", admin.getId()).executeUpdate();
        em.clear();
        notFound(outsider, url());
        notFound(admin, url());
        notFound(tester, "/api/v1/chats/aaaaaaaaaaaaaaaaaaaaaa");
        call(delete(url()), tester).andExpect(status().isOk());
        notFound(tester, url());
        assertThat(saved(developerSide.getId()).getLastReadSeq()).isZero();
        assertThat(saved(testerSide.getId()).getLastReadSeq()).isZero();
    }

    void inboxUnread(User user, ChatRoom target, long count) throws Exception {
        call(get("/api/v1/chats"), user).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.rooms[?(@.roomKey == '" + target.getRoomKey() + "')].unreadCount")
                        .value(org.hamcrest.Matchers.contains((int) count)));
    }
    @Test @DisplayName("#52-S2 일부만 읽으면 남은 상대 메시지만 셈")
    void partiallyRead() throws Exception {
        sendThree();
        read(tester, 2).andExpect(status().isOk()).andExpect(jsonPath("$.data.lastReadSeq").value(2));
        inboxUnread(tester, room, 1);
    }
    @Test @DisplayName("#52-S6 두 역할의 방에서 내 메시지를 제외하고 읽음 반영")
    void inboxCounts() throws Exception {
        var member = fixtures.user("다른테스터");
        var other = newRoom(tester, member, "다른 프로젝트");
        send(room, developer);
        send(room, tester);
        send(room, developer);
        send(other, tester);
        inboxUnread(tester, room, 2);
        inboxUnread(tester, other, 0);
        read(tester, 3).andExpect(status().isOk());
        inboxUnread(tester, room, 0);
        inboxUnread(developer, room, 1);
    }
    @Test @DisplayName("#52-S7 메시지가 없는 방은 안 읽은 수 0")
    void emptyRoom() throws Exception {
        inboxUnread(tester, room, 0);
    }

    void headerUnread(User user, long count) throws Exception {
        call(get("/api/v1/chats/unread"), user).andExpect(status().isOk())
                .andExpect(content().json("{\"success\":true,\"data\":{\"count\":" + count + "}}", JsonCompareMode.STRICT));
    }
    @Test @DisplayName("#52-S8 헤더 합계에서 지운 방과 읽은 메시지는 제외")
    void headerCounts() throws Exception {
        var other = newRoom(developer, tester, "다른 프로젝트");
        send(room, developer);
        send(room, tester);
        send(room, developer);
        send(other, developer);
        headerUnread(tester, 3);
        call(delete("/api/v1/chats/" + other.getRoomKey()), tester).andExpect(status().isOk());
        headerUnread(tester, 2);
        read(tester, 3).andExpect(status().isOk());
        headerUnread(tester, 0);
    }
    @Test @DisplayName("#52-S9 지운 방이 다시 나타나면 지우기 전 안 읽은 메시지도 셈")
    void reappear() throws Exception {
        send(room, developer);
        send(room, developer);
        call(delete(url()), tester).andExpect(status().isOk());
        headerUnread(tester, 0);
        send(room, developer);
        inboxUnread(tester, room, 3);
        headerUnread(tester, 3);
        assertThat(saved(testerSide.getId()).getLastReadSeq()).isZero();
    }
    @Test @DisplayName("#52-S10 방이 없는 회원과 운영자는 헤더 수 0")
    void noRooms() throws Exception {
        var outsider = fixtures.user("외부회원");
        var admin = fixtures.user("운영자");
        em.flush();
        em.createQuery("update users u set u.role = :role where u.id = :id")
                .setParameter("role", Role.ADMIN).setParameter("id", admin.getId()).executeUpdate();
        em.clear();
        headerUnread(outsider, 0);
        headerUnread(admin, 0);
    }

    @Test @DisplayName("#52-S11 방 정보와 이름 변경 응답에 상대의 읽은 순번 제공")
    void partnerReadSeq() throws Exception {
        sendThree();
        send(room, tester);
        call(get(url()), tester).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.partnerLastReadSeq").value(0));
        read(developer, 4).andExpect(status().isOk());
        call(get(url()), tester).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.partnerLastReadSeq").value(4));
        call(get(url()), developer).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.partnerLastReadSeq").value(0));
        call(patch(url()).contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"북로그 1차\"}"), tester)
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.partnerLastReadSeq").value(4));
        call(delete(url()), developer).andExpect(status().isOk());
        call(get(url()), tester).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.partnerLastReadSeq").value(4));
    }

}
