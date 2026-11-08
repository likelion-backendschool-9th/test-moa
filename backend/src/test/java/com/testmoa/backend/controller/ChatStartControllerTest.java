package com.testmoa.backend.controller;

import com.testmoa.backend.entity.*;
import com.testmoa.backend.entity.enums.*;
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
import java.time.LocalDateTime;
import java.util.List;
import static com.testmoa.backend.support.ChatFixtures.participantWithRole;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ChatStartControllerTest {
    @Autowired MockMvc mvc;
    @Autowired EntityManager em;
    @Autowired JwtProvider jwt;
    @Autowired ObjectMapper json;
    ChatFixtures fixtures;
    User developer, tester;
    Recruitment recruitment;
    Register register;
    Subscription subscription;

    @BeforeEach
    void setUp() {
        fixtures = new ChatFixtures(em);
        developer = fixtures.user("모아개발");
        tester = fixtures.user("모아테스터");
        recruitment = fixtures.recruitment(developer, "북로그");
        deadlines(LocalDateTime.now().minusDays(1), LocalDateTime.now().plusDays(7));
        register = fixtures.confirmedRegister(recruitment, tester);
        var plan = Plan.builder().tier("CHAT-" + developer.getId()).version(1).cashPrice(1000)
                .creditPrice(1000).periodDays(30).build();
        em.persist(plan);
        subscription = Subscription.builder().user(developer).plan(plan)
                .startAt(LocalDateTime.now().minusDays(1)).endAt(LocalDateTime.now().plusDays(30)).build();
        em.persist(subscription);
        em.flush();
    }
    void deadlines(LocalDateTime recruit, LocalDateTime feedback) {
        recruitment.edit(recruitment.getTitle(), null, null, null, SelectionMode.MANUAL, recruit, feedback);
    }
    ResultActions call(MockHttpServletRequestBuilder request, User user) throws Exception {
        return mvc.perform(request.header("Authorization", "Bearer " + jwt.createAccessToken(user.getId())));
    }
    ResultActions start(User user, Long id) throws Exception {
        return call(post("/api/v1/chats").contentType(MediaType.APPLICATION_JSON)
                .content("{\"registerId\":" + id + "}"), user);
    }
    String key(ResultActions result) throws Exception {
        return json.readTree(result.andReturn().getResponse().getContentAsString()).path("data").path("roomKey").asText();
    }
    ChatRoom room(String key) {
        return em.createQuery("select r from chat_rooms r where r.roomKey = :key", ChatRoom.class)
                .setParameter("key", key).getSingleResult();
    }
    long count(String entity) { return em.createQuery("select count(e) from " + entity + " e", Long.class).getSingleResult(); }
    void expire() {
        em.createQuery("update subscriptions s set s.endAt = :end where s.id = :id")
                .setParameter("end", LocalDateTime.now().minusHours(1)).setParameter("id", subscription.getId()).executeUpdate();
    }
    void noRoom() { assertThat(count("chat_rooms")).isZero(); }
    void error(ResultActions result, int expectedStatus, String code) throws Exception {
        result.andExpect(status().is(expectedStatus)).andExpect(jsonPath("$.error.code").value(code));
    }

    @Test @DisplayName("#53-S1 구독 개발자가 확정 참가의 방과 참여자 두 명을 만든다")
    void create() throws Exception {
        String key = key(start(developer, register.getId()).andExpect(status().isCreated()));
        assertThat(key).hasSize(22);
        var room = room(key);
        assertThat(room.getRegister().getId()).isEqualTo(register.getId());
        assertThat(room.getLastSeq()).isZero();
        assertThat(room.getParticipants()).hasSize(2);
        assertThat(participantWithRole(room, ChatRole.DEVELOPER).getUser().getId()).isEqualTo(developer.getId());
        assertThat(participantWithRole(room, ChatRole.TESTER).getUser().getId()).isEqualTo(tester.getId());
        assertThat(count("chat_rooms")).isEqualTo(1);
        call(get("/api/v1/chats/" + key), developer).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.partner.nickname").value("모아테스터"))
                .andExpect(jsonPath("$.data.readOnly").value(false));
    }

    @Test @DisplayName("#53-S2 기존 방은 구독 만료와 참가 취소 뒤에도 메시지를 보존한다")
    void existing() throws Exception {
        String key = key(start(developer, register.getId()));
        var room = room(key);
        var sender = participantWithRole(room, ChatRole.TESTER);
        em.persist(room.createMessage(sender, "하나"));
        em.persist(room.createMessage(sender, "둘"));
        em.flush();
        assertThat(key(start(developer, register.getId()).andExpect(status().isOk()))).isEqualTo(key);
        expire();
        assertThat(key(start(developer, register.getId()).andExpect(status().isOk()))).isEqualTo(key);
        register.cancel();
        assertThat(key(start(developer, register.getId()).andExpect(status().isOk()))).isEqualTo(key);
        assertThat(count("chat_rooms")).isEqualTo(1);
        assertThat(count("chat_participants")).isEqualTo(2);
        assertThat(count("chat_messages")).isEqualTo(2);
    }

    @Test @DisplayName("#53-S3 지운 내 방만 복원하고 이름과 읽은 순번은 보존한다")
    void restoreMine() throws Exception {
        String key = key(start(developer, register.getId()));
        var room = room(key);
        var sender = participantWithRole(room, ChatRole.TESTER);
        em.persist(room.createMessage(sender, "하나"));
        em.persist(room.createMessage(sender, "둘"));
        em.flush();
        String url = "/api/v1/chats/" + key;
        call(patch(url).contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"북로그 1차\"}"), developer)
                .andExpect(status().isOk());
        call(post(url + "/read").contentType(MediaType.APPLICATION_JSON).content("{\"seq\":2}"), developer)
                .andExpect(status().isOk());
        call(delete(url), developer).andExpect(status().isOk());
        call(delete(url), tester).andExpect(status().isOk());
        assertThat(key(start(developer, register.getId()).andExpect(status().isOk()))).isEqualTo(key);
        em.clear();
        room = room(key);
        var mine = participantWithRole(room, ChatRole.DEVELOPER);
        assertThat(mine.isHidden()).isFalse();
        assertThat(mine.getCustomRoomName()).isEqualTo("북로그 1차");
        assertThat(mine.getLastReadSeq()).isEqualTo(2);
        assertThat(participantWithRole(room, ChatRole.TESTER).isHidden()).isTrue();
        call(get("/api/v1/chats"), developer).andExpect(jsonPath("$.data.rooms[0].roomKey").value(key));
        call(get(url), developer).andExpect(status().isOk());
        call(delete(url), developer).andExpect(status().isOk());
        expire();
        start(developer, register.getId()).andExpect(status().isOk());
        em.clear();
        assertThat(participantWithRole(room(key), ChatRole.DEVELOPER).isHidden()).isFalse();
        call(get(url), developer).andExpect(jsonPath("$.data.readOnly").value(true));
    }

    @Test @DisplayName("#53-S4 동시에 시작해도 하나는 201 다른 하나는 200으로 같은 방을 반환한다")
    void concurrentStart() throws Exception {
        Long planId = subscription.getPlan().getId();
        Long projectId = recruitment.getProject().getId();
        org.springframework.test.context.transaction.TestTransaction.flagForCommit();
        org.springframework.test.context.transaction.TestTransaction.end();
        try {
            try (var executor = java.util.concurrent.Executors.newFixedThreadPool(2)) {
                var ready = new java.util.concurrent.CountDownLatch(2);
                var go = new java.util.concurrent.CountDownLatch(1);
                java.util.concurrent.Callable<MvcResult> request = () -> {
                    ready.countDown();
                    if (!go.await(10, java.util.concurrent.TimeUnit.SECONDS)) throw new IllegalStateException("시작 대기 초과");
                    return start(developer, register.getId()).andReturn();
                };
                var first = executor.submit(request);
                var second = executor.submit(request);
                try { assertThat(ready.await(10, java.util.concurrent.TimeUnit.SECONDS)).isTrue(); }
                finally { go.countDown(); }
                var a = first.get(20, java.util.concurrent.TimeUnit.SECONDS);
                var b = second.get(20, java.util.concurrent.TimeUnit.SECONDS);
                assertThat(List.of(a.getResponse().getStatus(), b.getResponse().getStatus())).containsExactlyInAnyOrder(201, 200);
                assertThat(json.readTree(a.getResponse().getContentAsString()).path("data").path("roomKey").asText())
                        .isEqualTo(json.readTree(b.getResponse().getContentAsString()).path("data").path("roomKey").asText());
            }
            org.springframework.test.context.transaction.TestTransaction.start();
            assertThat(count("chat_rooms")).isEqualTo(1);
            assertThat(count("chat_participants")).isEqualTo(2);
        } finally {
            if (!org.springframework.test.context.transaction.TestTransaction.isActive())
                org.springframework.test.context.transaction.TestTransaction.start();
            em.createQuery("delete from chat_participants p where p.room.register.id = :id").setParameter("id", register.getId()).executeUpdate();
            em.createQuery("delete from chat_rooms r where r.register.id = :id").setParameter("id", register.getId()).executeUpdate();
            for (String entity : List.of("registers", "recruitments", "projects", "subscriptions", "plans")) {
                Long id = switch (entity) {
                    case "registers" -> register.getId(); case "recruitments" -> recruitment.getId();
                    case "projects" -> projectId; case "subscriptions" -> subscription.getId(); default -> planId;
                };
                em.createQuery("delete from " + entity + " e where e.id = :id").setParameter("id", id).executeUpdate();
            }
            em.createQuery("delete from users u where u.id in :ids")
                    .setParameter("ids", List.of(developer.getId(), tester.getId())).executeUpdate();
            org.springframework.test.context.transaction.TestTransaction.flagForCommit();
            org.springframework.test.context.transaction.TestTransaction.end();
        }
    }

    void readOnly(String key, boolean expected) throws Exception {
        for (var user : List.of(developer, tester)) {
            call(get("/api/v1/chats/" + key), user).andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.readOnly").value(expected));
            var response = call(get("/api/v1/chats"), user).andExpect(status().isOk()).andReturn();
            var rooms = json.readTree(response.getResponse().getContentAsString()).path("data").path("rooms");
            boolean found = false;
            for (var room : rooms) {
                if (room.path("roomKey").asText().equals(key)) {
                    found = true;
                    assertThat(room.path("readOnly").asBoolean()).isEqualTo(expected);
                }
            }
            assertThat(found).isTrue();
        }
    }

    @Test @DisplayName("#53-S11 테스트 중인 방과 모집 중 확정 참가의 방은 양쪽 모두 쓰기 가능하다")
    void openRooms() throws Exception {
        String key = key(start(developer, register.getId()));
        var recruiting = fixtures.recruitment(developer, "다음 모집");
        var otherTester = fixtures.user("선착순테스터");
        recruiting.edit(recruiting.getTitle(), null, null, null, SelectionMode.FIRST_COME,
                LocalDateTime.now().plusDays(3), LocalDateTime.now().plusDays(7));
        var otherRegister = fixtures.confirmedRegister(recruiting, otherTester);
        String otherKey = key(start(developer, otherRegister.getId()).andExpect(status().isCreated()));
        readOnly(key, false);
        call(get("/api/v1/chats/" + otherKey), developer).andExpect(jsonPath("$.data.readOnly").value(false));
        var inbox = call(get("/api/v1/chats"), developer).andReturn();
        var rooms = json.readTree(inbox.getResponse().getContentAsString()).path("data").path("rooms");
        assertThat(rooms.size()).isEqualTo(2);
        for (var room : rooms) assertThat(room.path("readOnly").asBoolean()).isFalse();
    }

    @Test @DisplayName("#53-S12 마감·모집 취소·개발자 구독 종료는 방 정보와 채팅함에 반영된다")
    void readOnlyRooms() throws Exception {
        String key = key(start(developer, register.getId()));
        deadlines(LocalDateTime.now().minusDays(7), LocalDateTime.now().minusDays(1));
        readOnly(key, true);
        deadlines(LocalDateTime.now().minusDays(1), LocalDateTime.now().plusDays(7));
        recruitment.cancel(null, LocalDateTime.now());
        readOnly(key, true);
        em.flush();
        em.createQuery("update recruitments r set r.status = :state where r.id = :id")
                .setParameter("state", RecruitmentStatus.RECRUITING).setParameter("id", recruitment.getId()).executeUpdate();
        em.clear();
        readOnly(key, false);
        expire();
        readOnly(key, true);
        call(patch("/api/v1/chats/" + key).contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"기록\"}"), tester)
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.readOnly").value(true));
        em.createQuery("update subscriptions s set s.endAt = :end, s.status = :state where s.id = :id")
                .setParameter("end", LocalDateTime.now().plusDays(30)).setParameter("state", Subscription.Status.CANCELLED)
                .setParameter("id", subscription.getId()).executeUpdate();
        readOnly(key, true);
        em.createQuery("update subscriptions s set s.startAt = :start, s.status = :state where s.id = :id")
                .setParameter("start", LocalDateTime.now().plusDays(1)).setParameter("state", Subscription.Status.ACTIVE)
                .setParameter("id", subscription.getId()).executeUpdate();
        readOnly(key, true);
    }

    @Test @DisplayName("#53-S5 남의 참가와 없는 참가와 테스터 요청은 404다")
    void notFound() throws Exception {
        error(start(fixtures.user("다른개발자"), register.getId()), 404, "NOT_FOUND");
        error(start(developer, 999999L), 404, "NOT_FOUND");
        error(start(tester, register.getId()), 404, "NOT_FOUND");
        noRoom();
    }

    @Test @DisplayName("#53-S6 미확정·거절·취소 참가는 방을 만들 수 없다")
    void unconfirmed() throws Exception {
        for (var state : List.of(RegisterStatus.APPLIED, RegisterStatus.REJECTED, RegisterStatus.CANCELLED)) {
            em.createQuery("update registers r set r.status = :state where r.id = :id")
                    .setParameter("state", state).setParameter("id", register.getId()).executeUpdate();
            em.clear();
            error(start(developer, register.getId()), 400, "INVALID_INPUT");
        }
        noRoom();
    }

    @Test @DisplayName("#53-S7 구독 없음·만료·취소·시작 전이면 방을 만들 수 없다")
    void subscriptionRequired() throws Exception {
        expire();
        error(start(developer, register.getId()), 403, "SUBSCRIPTION_REQUIRED");
        em.createQuery("update subscriptions s set s.endAt = :end, s.status = :state where s.id = :id")
                .setParameter("end", LocalDateTime.now().plusDays(30)).setParameter("state", Subscription.Status.CANCELLED)
                .setParameter("id", subscription.getId()).executeUpdate();
        error(start(developer, register.getId()), 403, "SUBSCRIPTION_REQUIRED");
        em.createQuery("update subscriptions s set s.startAt = :start, s.status = :state where s.id = :id")
                .setParameter("start", LocalDateTime.now().plusDays(1)).setParameter("state", Subscription.Status.ACTIVE)
                .setParameter("id", subscription.getId()).executeUpdate();
        error(start(developer, register.getId()), 403, "SUBSCRIPTION_REQUIRED");
        em.createQuery("delete from subscriptions s where s.id = :id").setParameter("id", subscription.getId()).executeUpdate();
        error(start(developer, register.getId()), 403, "SUBSCRIPTION_REQUIRED");
        noRoom();
    }

    @Test @DisplayName("#53-S8 피드백 마감과 모집 취소 뒤에는 새 방을 만들 수 없다")
    void closed() throws Exception {
        deadlines(LocalDateTime.now().minusDays(7), LocalDateTime.now().minusDays(1));
        error(start(developer, register.getId()), 403, "CHAT_READ_ONLY");
        deadlines(LocalDateTime.now().minusDays(1), LocalDateTime.now().plusDays(7));
        recruitment.cancel(null, LocalDateTime.now());
        error(start(developer, register.getId()), 403, "CHAT_READ_ONLY");
        noRoom();
    }

    @Test @DisplayName("#53-S9 누락·0·음수·문자열 참가 번호는 400이다")
    void invalidBody() throws Exception {
        for (String body : List.of("{}", "{\"registerId\":0}", "{\"registerId\":-1}", "{\"registerId\":\"abc\"}")) {
            error(call(post("/api/v1/chats").contentType(MediaType.APPLICATION_JSON).content(body), developer), 400, "INVALID_INPUT");
        }
        noRoom();
    }

    @Test @DisplayName("#53-S10 비로그인 요청은 401이다")
    void anonymous() throws Exception {
        error(mvc.perform(post("/api/v1/chats").contentType(MediaType.APPLICATION_JSON)
                .content("{\"registerId\":" + register.getId() + "}")), 401, "UNAUTHORIZED");
    }
}
