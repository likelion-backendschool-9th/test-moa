package com.testmoa.backend.controller;

import com.testmoa.backend.domain.dto.request.ChatInboxQuery;
import com.testmoa.backend.domain.entity.ChatRoom;
import com.testmoa.backend.domain.entity.User;
import com.testmoa.backend.global.common.ChatRole;
import com.testmoa.backend.global.common.Role;
import com.testmoa.backend.global.security.JwtProvider;
import com.testmoa.backend.support.ChatFixtures;
import com.testmoa.backend.service.ChatService;
import org.hibernate.SessionFactory;
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
import tools.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;
import java.util.Map;

import static com.testmoa.backend.support.ChatFixtures.participantWithRole;
import static org.hamcrest.Matchers.contains;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ChatInboxControllerTest {
    @Autowired MockMvc mvc;
    @Autowired EntityManager em;
    @Autowired JwtProvider jwt;
    @Autowired ObjectMapper json;
    @Autowired ChatService chatService;
    ChatFixtures fixtures;
    User developer, me, tester;
    ChatRoom first, second;

    @BeforeEach
    void setUp() throws Exception {
        fixtures = new ChatFixtures(em);
        developer = fixtures.user("모아개발");
        me = fixtures.user("모아테스터");
        tester = fixtures.user("새싹");
        first = open(developer, me, "북로그", "https://img.test/booklog.png");
        second = open(me, tester, "가계부", null);
        send(first, developer, "안녕하세요");
        send(second, tester, "로그인이 안 돼요");
        // 테스트 순서가 시계 해상도에 의존하지 않게 마지막 메시지와 방 시각을 함께 고정한다.
        messageTime(first, LocalDateTime.of(2026, 11, 5, 10, 0));
        messageTime(second, LocalDateTime.of(2026, 11, 5, 11, 0));
    }

    ChatRoom open(User owner, User member, String name, String image) {
        var recruitment = fixtures.recruitment(owner, name, image);
        var room = ChatRoom.builder().register(fixtures.confirmedRegister(recruitment, member)).build();
        em.persist(room);
        em.flush();
        return room;
    }

    void messageTime(ChatRoom room, LocalDateTime time) {
        em.flush();
        em.createQuery("update chat_rooms r set r.lastMessageAt = :time where r.id = :id")
                .setParameter("time", time).setParameter("id", room.getId()).executeUpdate();
        em.createQuery("update chat_messages m set m.sentAt = :time where m.room.id = :id and m.seq = :seq")
                .setParameter("time", time).setParameter("id", room.getId()).setParameter("seq", room.getLastSeq()).executeUpdate();
    }

    ResultActions call(MockHttpServletRequestBuilder request, User user) throws Exception {
        return mvc.perform(request.header("Authorization", "Bearer " + jwt.createAccessToken(user.getId())));
    }

    void send(ChatRoom room, User sender, String text) throws Exception {
        call(post("/api/v1/chats/" + room.getRoomKey() + "/messages").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("text", text))), sender).andExpect(status().isOk());
    }

    ResultActions inbox(User user) throws Exception {
        em.flush();
        em.clear();
        return call(get("/api/v1/chats"), user);
    }

    @Test @DisplayName("#48-S1 테스터와 개발자로 참여한 방을 최근 순서로 함께 조회")
    void mixedRoles() throws Exception {
        inbox(me).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.rooms[*].roomKey", contains(second.getRoomKey(), first.getRoomKey())))
                .andExpect(jsonPath("$.data.total").value(2))
                .andExpect(jsonPath("$.data.counts.all").value(2))
                .andExpect(jsonPath("$.data.counts.tester").value(1))
                .andExpect(jsonPath("$.data.counts.developer").value(1))
                .andExpect(jsonPath("$.data.rooms[0].projectName").value("가계부"))
                .andExpect(jsonPath("$.data.rooms[0].projectImage").isEmpty())
                .andExpect(jsonPath("$.data.rooms[0].roomName").isEmpty())
                .andExpect(jsonPath("$.data.rooms[0].myRole").value("DEVELOPER"))
                .andExpect(jsonPath("$.data.rooms[0].partner.nickname").value("새싹"))
                .andExpect(jsonPath("$.data.rooms[0].partner.role").value("TESTER"))
                .andExpect(jsonPath("$.data.rooms[0].lastMessage").value("로그인이 안 돼요"))
                .andExpect(jsonPath("$.data.rooms[0].lastMessageAt").value("2026-11-05T11:00:00"))
                .andExpect(jsonPath("$.data.rooms[1].recruitmentId").value(first.getRecruitment().getId()))
                .andExpect(jsonPath("$.data.rooms[1].projectName").value("북로그"))
                .andExpect(jsonPath("$.data.rooms[1].projectImage").value("https://img.test/booklog.png"))
                .andExpect(jsonPath("$.data.rooms[1].myRole").value("TESTER"))
                .andExpect(jsonPath("$.data.rooms[1].partner.nickname").value("모아개발"))
                .andExpect(jsonPath("$.data.rooms[1].partner.role").value("DEVELOPER"))
                .andExpect(jsonPath("$.data.rooms[1].lastMessage").value("안녕하세요"))
                .andExpect(jsonPath("$.data.rooms[1].lastMessageAt").value("2026-11-05T10:00:00"));
    }

    @Test @DisplayName("#48-S2 새 메시지를 받으면 맨 위로 이동")
    void newMessageFirst() throws Exception {
        send(first, developer, "확인했어요");
        inbox(me).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.rooms[*].roomKey", contains(first.getRoomKey(), second.getRoomKey())))
                .andExpect(jsonPath("$.data.rooms[0].lastMessage").value("확인했어요"));
    }

    @Test @DisplayName("#48-S3 내가 바꾼 이름은 내 채팅함에만 표시")
    void privateName() throws Exception {
        participantWithRole(first, ChatRole.TESTER).rename("북로그 1차");
        inbox(me).andExpect(jsonPath("$.data.rooms[1].roomName").value("북로그 1차"))
                .andExpect(jsonPath("$.data.rooms[1].projectName").value("북로그"));
        inbox(developer).andExpect(jsonPath("$.data.rooms[0].roomName").isEmpty());
    }

    @Test @DisplayName("#48-S4 메시지가 없는 방도 생성 시각으로 정렬")
    void emptyRoom() throws Exception {
        var empty = open(developer, me, "새 프로젝트", null);
        var openedAt = empty.getLastMessageAt();
        inbox(me).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.rooms[*].roomKey", contains(empty.getRoomKey(), second.getRoomKey(), first.getRoomKey())))
                .andExpect(jsonPath("$.data.rooms[0].lastMessage").isEmpty())
                .andExpect(jsonPath("$.data.rooms[0].lastMessageAt").value(
                        json.readTree(json.writeValueAsString(openedAt)).asString()));
    }

    @Test @DisplayName("#48-S5 방이 없는 회원과 운영자는 빈 목록")
    void noRooms() throws Exception {
        var outsider = fixtures.user("외부회원");
        var admin = fixtures.user("운영자");
        em.flush();
        em.createQuery("update users u set u.role = :role where u.id = :id")
                .setParameter("role", Role.ADMIN).setParameter("id", admin.getId()).executeUpdate();
        for (var user : new User[]{outsider, admin}) {
            inbox(user).andExpect(status().isOk()).andExpect(jsonPath("$.data.rooms").isEmpty())
                    .andExpect(jsonPath("$.data.total").value(0))
                    .andExpect(jsonPath("$.data.counts.all").value(0))
                    .andExpect(jsonPath("$.data.counts.tester").value(0))
                    .andExpect(jsonPath("$.data.counts.developer").value(0));
        }
    }

    @Test @DisplayName("#48-S6 내가 지운 방은 제외하고 상대 메시지가 오면 다시 표시")
    void hiddenRoomRestored() throws Exception {
        participantWithRole(second, ChatRole.DEVELOPER).hide();
        inbox(me).andExpect(jsonPath("$.data.rooms[*].roomKey", contains(first.getRoomKey())))
                .andExpect(jsonPath("$.data.total").value(1)).andExpect(jsonPath("$.data.counts.developer").value(0));
        inbox(tester).andExpect(jsonPath("$.data.rooms[*].roomKey", contains(second.getRoomKey())));
        send(second, tester, "다시 봐 주세요");
        inbox(me).andExpect(jsonPath("$.data.rooms[*].roomKey", contains(second.getRoomKey(), first.getRoomKey())))
                .andExpect(jsonPath("$.data.rooms[0].lastMessage").value("다시 봐 주세요"));
    }

    @Test @DisplayName("#48-S12 비로그인 채팅함 조회는 401")
    void unauthenticated() throws Exception {
        mvc.perform(get("/api/v1/chats")).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));
    }
    ResultActions query(MockHttpServletRequestBuilder request) throws Exception {
        em.flush();
        em.clear();
        return call(request, me);
    }

    ChatRoom meetingRoom() {
        var meeting = open(developer, me, "회의록", null);
        participantWithRole(meeting, ChatRole.TESTER).rename("정산 회의");
        return meeting;
    }

    @Test @DisplayName("#48-S7 상대 닉네임·내 이름·프로젝트명에서 검색하고 앞뒤 공백 무시")
    void search() throws Exception {
        var meeting = meetingRoom();
        query(get("/api/v1/chats").param("q", "모아개발"))
                .andExpect(jsonPath("$.data.rooms[*].roomKey", contains(meeting.getRoomKey(), first.getRoomKey())))
                .andExpect(jsonPath("$.data.total").value(3))
                .andExpect(jsonPath("$.data.counts.all").value(2))
                .andExpect(jsonPath("$.data.counts.tester").value(2))
                .andExpect(jsonPath("$.data.counts.developer").value(0));
        for (String keyword : new String[]{"정산", "회의록"}) {
            query(get("/api/v1/chats").param("q", keyword)).andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.rooms[*].roomKey", contains(meeting.getRoomKey())));
        }
        for (String keyword : new String[]{"가계", "가계부 ", " 가계부"}) {
            query(get("/api/v1/chats").param("q", keyword))
                    .andExpect(jsonPath("$.data.rooms[*].roomKey", contains(second.getRoomKey())));
        }
        query(get(java.net.URI.create("/api/v1/chats?q=%EA%B0%80%EA%B3%84%EB%B6%80")))
                .andExpect(jsonPath("$.data.rooms[*].roomKey", contains(second.getRoomKey())));
        query(get("/api/v1/chats").param("q", "  "))
                .andExpect(jsonPath("$.data.rooms.length()").value(3));
        query(get("/api/v1/chats").param("q", "일치하지않음"))
                .andExpect(jsonPath("$.data.rooms").isEmpty()).andExpect(jsonPath("$.data.total").value(3))
                .andExpect(jsonPath("$.data.counts.all").value(0));
    }

    @Test @DisplayName("#48-S8 대소문자를 무시하고 퍼센트·밑줄은 글자 그대로 검색")
    void literalSearch() throws Exception {
        var english = open(developer, me, "MoaPlan", null);
        var special = open(developer, me, "100%_done", null);
        open(developer, me, "100XXdone", null);
        query(get("/api/v1/chats").param("q", "moaplan"))
                .andExpect(jsonPath("$.data.rooms[*].roomKey", contains(english.getRoomKey())));
        query(get(java.net.URI.create("/api/v1/chats?q=%25_")))
                .andExpect(jsonPath("$.data.rooms[*].roomKey", contains(special.getRoomKey())));
    }

    @Test @DisplayName("#48-S9 역할 필터를 적용해도 검색 기준 역할별 개수는 유지")
    void roleFilter() throws Exception {
        var meeting = meetingRoom();
        query(get("/api/v1/chats").param("role", "TESTER"))
                .andExpect(jsonPath("$.data.rooms[*].roomKey", contains(meeting.getRoomKey(), first.getRoomKey())))
                .andExpect(jsonPath("$.data.counts.all").value(3))
                .andExpect(jsonPath("$.data.counts.tester").value(2))
                .andExpect(jsonPath("$.data.counts.developer").value(1));
        query(get("/api/v1/chats").param("q", "모아개발").param("role", "DEVELOPER"))
                .andExpect(jsonPath("$.data.rooms").isEmpty()).andExpect(jsonPath("$.data.total").value(3))
                .andExpect(jsonPath("$.data.counts.all").value(2))
                .andExpect(jsonPath("$.data.counts.tester").value(2))
                .andExpect(jsonPath("$.data.counts.developer").value(0));
        query(get("/api/v1/chats").param("role", "DEVELOPER"))
                .andExpect(jsonPath("$.data.rooms[*].roomKey", contains(second.getRoomKey())));
    }

    @Test @DisplayName("#48-S10 최신·오래된 순서와 기본 정렬")
    void sorting() throws Exception {
        var meeting = meetingRoom();
        send(meeting, developer, "회의 확인");
        messageTime(meeting, LocalDateTime.of(2026, 11, 5, 9, 0));
        query(get("/api/v1/chats").param("sort", "OLDEST"))
                .andExpect(jsonPath("$.data.rooms[*].roomKey", contains(meeting.getRoomKey(), first.getRoomKey(), second.getRoomKey())));
        query(get("/api/v1/chats").param("sort", "LATEST"))
                .andExpect(jsonPath("$.data.rooms[*].roomKey", contains(second.getRoomKey(), first.getRoomKey(), meeting.getRoomKey())));
        inbox(me).andExpect(jsonPath("$.data.rooms[*].roomKey", contains(second.getRoomKey(), first.getRoomKey(), meeting.getRoomKey())));
    }

    @Test @DisplayName("#48-S10 일시가 같으면 두 정렬 모두 방 id 내림차순")
    void sortingTies() throws Exception {
        messageTime(second, LocalDateTime.of(2026, 11, 5, 10, 0));
        for (String sort : new String[]{"LATEST", "OLDEST"}) {
            query(get("/api/v1/chats").param("sort", sort))
                    .andExpect(jsonPath("$.data.rooms[*].roomKey", contains(second.getRoomKey(), first.getRoomKey())));
        }
    }

    @Test @DisplayName("#48-S11 잘못된 역할·정렬 값은 400")
    void invalidFilters() throws Exception {
        for (var request : new MockHttpServletRequestBuilder[]{
                get("/api/v1/chats").param("role", "ADMIN"),
                get("/api/v1/chats").param("role", "tester"),
                get("/api/v1/chats").param("sort", "newest")}) {
            query(request).andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error.code").value("INVALID_INPUT"));
        }
    }

    @Test @DisplayName("#48-S1 방 수와 관계없이 목록을 쿼리 한 번으로 조회")
    void singleQuery() {
        open(developer, me, "추가 프로젝트", null);
        em.flush();
        em.clear();
        var statistics = em.getEntityManagerFactory().unwrap(SessionFactory.class).getStatistics();
        boolean enabled = statistics.isStatisticsEnabled();
        statistics.setStatisticsEnabled(true);
        statistics.clear();
        try {
            var result = chatService.getInbox(me.getId(),
                    new ChatInboxQuery(null, null, null));
            assertThat(result.rooms()).hasSize(3);
            assertThat(statistics.getPrepareStatementCount()).isEqualTo(1);
        } finally {
            statistics.setStatisticsEnabled(enabled);
        }
    }

}
