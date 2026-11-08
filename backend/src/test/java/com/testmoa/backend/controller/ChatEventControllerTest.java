package com.testmoa.backend.controller;

import com.testmoa.backend.entity.ChatRoom;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.global.security.JwtProvider;
import com.testmoa.backend.global.security.Role;
import com.testmoa.backend.service.ChatService;
import com.testmoa.backend.service.chat.ChatEventHub;
import com.testmoa.backend.support.ChatFixtures;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.io.*;
import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {"chat.sse.heartbeat=1s", "chat.sse.timeout=8s"})
@ActiveProfiles("test")
class ChatEventControllerTest {
    @LocalServerPort int port;
    @Autowired EntityManager em;
    @Autowired JwtProvider jwt;
    @Autowired ChatService service;
    @Autowired ChatEventHub hub;
    @Autowired PlatformTransactionManager manager;
    TransactionTemplate tx;
    User developer, tester, outsider, admin;
    String roomKey, otherRoomKey;
    Long roomId, otherRoomId;
    final List<Stream> streams = new ArrayList<>();
    final List<Long> users = new ArrayList<>(), projects = new ArrayList<>(), recruitments = new ArrayList<>(), registers = new ArrayList<>();
    HttpClient client;

    @BeforeEach void setUp() {
        tx = new TransactionTemplate(manager);
        client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
        tx.executeWithoutResult(status -> {
            var f = new ChatFixtures(em);
            String suffix = UUID.randomUUID().toString();
            developer = f.user("개발" + suffix); tester = f.user("테스터" + suffix);
            outsider = f.user("외부" + suffix); admin = f.user("운영" + suffix);
            users.addAll(List.of(developer.getId(), tester.getId(), outsider.getId(), admin.getId()));
            em.createQuery("update users u set u.role = :role where u.id = :id")
                    .setParameter("role", Role.ADMIN).setParameter("id", admin.getId()).executeUpdate();
            var room = room(f, tester); roomId = room.getId(); roomKey = room.getRoomKey();
            var other = room(f, outsider); otherRoomId = other.getId(); otherRoomKey = other.getRoomKey();
        });
    }

    ChatRoom room(ChatFixtures f, User member) {
        var recruitment = f.recruitment(developer, "북로그" + UUID.randomUUID());
        var register = f.confirmedRegister(recruitment, member);
        var room = ChatRoom.builder().register(register).build(); em.persist(room); em.flush();
        projects.add(recruitment.getProject().getId()); recruitments.add(recruitment.getId()); registers.add(register.getId());
        return room;
    }

    @AfterEach void cleanUp() throws Exception {
        for (var stream : streams) stream.close();
        hub.shutdown();
        client.close();
        tx.executeWithoutResult(status -> {
            for (String entity : List.of("chat_messages", "chat_participants"))
                em.createQuery("delete from " + entity + " e where e.room.id in :ids").setParameter("ids", List.of(roomId, otherRoomId)).executeUpdate();
            delete("chat_rooms", List.of(roomId, otherRoomId)); delete("registers", registers);
            delete("recruitments", recruitments); delete("projects", projects); delete("users", users);
        });
    }
    void delete(String entity, List<Long> ids) {
        em.createQuery("delete from " + entity + " e where e.id in :ids").setParameter("ids", ids).executeUpdate();
    }

    Stream connect(User user) throws Exception {
        var response = client.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/v1/chats/events"))
                .header("Authorization", "Bearer " + jwt.createAccessToken(user.getId()))
                .header("Accept", "text/event-stream").GET().build(), HttpResponse.BodyHandlers.ofInputStream());
        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.headers().firstValue("Content-Type").orElseThrow()).startsWith("text/event-stream");
        var stream = new Stream(response.body()); streams.add(stream);
        assertThat(stream.event()).contains("retry:3000", "event:ready", "data:{}");
        return stream;
    }

    static class Stream implements AutoCloseable {
        final InputStream body;
        final BlockingQueue<String> events = new LinkedBlockingQueue<>();
        final Thread reader;
        Stream(InputStream body) {
            this.body = body;
            reader = Thread.ofVirtual().start(() -> {
                try (var lines = new BufferedReader(new InputStreamReader(body, java.nio.charset.StandardCharsets.UTF_8))) {
                    String line; var frame = new StringBuilder();
                    while ((line = lines.readLine()) != null) {
                        if (line.isEmpty()) { if (!frame.isEmpty()) events.add(frame.toString()); frame.setLength(0); }
                        else frame.append(line).append('\n');
                    }
                } catch (IOException ignored) { } finally { events.add("EOF"); }
            });
        }
        String frame() throws Exception {
            String frame = events.poll(12, TimeUnit.SECONDS);
            assertThat(frame).as("제한 시간 안에 SSE 프레임 수신").isNotNull(); return frame;
        }
        String event() throws Exception { String f; do { f = frame(); } while (f.startsWith(":")); return f; }
        @Override public void close() throws IOException { body.close(); }
    }

    void send(User user) { service.sendMessage(roomKey, user.getId(), "안녕하세요"); }
    void message(Stream stream, String key, int seq) throws Exception {
        assertThat(stream.event()).contains("event:message", "\"roomKey\":\"" + key + "\"", "\"seq\":" + seq)
                .doesNotContain("안녕하세요", "reader");
    }

    @Test @DisplayName("#51-S1 연결 직후 ready와 retry")
    void ready() throws Exception { connect(tester); }

    @Test @DisplayName("#51-S2 주석 하트비트")
    void heartbeat() throws Exception {
        var stream = connect(tester);
        assertThat(stream.frame()).startsWith(":"); assertThat(stream.frame()).startsWith(":");
    }

    @Test @DisplayName("#51-S3 연결 만료는 정상 종료되고 재연결 가능")
    void timeout() throws Exception {
        var stream = connect(tester);
        long start = System.nanoTime();
        assertThat(stream.event()).isEqualTo("EOF");
        assertThat(Duration.ofNanos(System.nanoTime() - start).toSeconds()).isBetween(7L, 11L);
        connect(tester);
    }

    @Test @DisplayName("#51-S4 비로그인은 스트림 대신 401")
    void unauthenticated() throws Exception {
        var response = client.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/v1/chats/events"))
                .header("Accept", "text/event-stream").GET().build(), HttpResponse.BodyHandlers.ofString());
        assertThat(response.statusCode()).isEqualTo(401); assertThat(response.body()).contains("UNAUTHORIZED");
    }

    @Test @DisplayName("#51-S5 양쪽 참여자에게 메시지 알림")
    void bothParticipants() throws Exception {
        var a = connect(developer); var b = connect(tester); send(developer);
        message(a, roomKey, 1); message(b, roomKey, 1);
    }

    @Test @DisplayName("#51-S6 회원의 모든 연결에 알림")
    void multipleConnections() throws Exception {
        var b = connect(tester); var b2 = connect(tester); send(developer);
        message(b, roomKey, 1); message(b2, roomKey, 1);
    }

    @Test @DisplayName("#51-S7 삭제된 방도 상대 전송 알림 수신")
    void hidden() throws Exception {
        service.deleteRoom(roomKey, tester.getId()); var b = connect(tester); send(developer);
        message(b, roomKey, 1); assertThat(service.getRoom(roomKey, tester.getId()).roomKey()).isEqualTo(roomKey);
    }

    @Test @DisplayName("#51-S8 비참여자와 운영자에게 다른 방 알림이 가지 않는다")
    void isolation() throws Exception {
        var c = connect(outsider); var d = connect(admin); send(developer);
        service.sendMessage(otherRoomKey, developer.getId(), "다른 방"); message(c, otherRoomKey, 1);
        assertThat(d.frame()).startsWith(":");
        assertThat(d.events).noneMatch(frame -> frame.contains("event:message"));
    }

    HttpResponse<String> post(String path, User user, String body) throws Exception {
        return client.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/v1/chats/" + roomKey + path))
                .header("Authorization", "Bearer " + jwt.createAccessToken(user.getId()))
                .header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(body)).build(),
                HttpResponse.BodyHandlers.ofString());
    }

    @Test @DisplayName("#51-S9 저장 실패와 롤백은 알림을 보내지 않는다")
    void failedSend() throws Exception {
        var a = connect(developer);
        assertThat(post("/messages", tester, "{\"text\":\"  \"}").statusCode()).isEqualTo(400);
        tx.executeWithoutResult(status -> { send(tester); status.setRollbackOnly(); });
        send(tester); message(a, roomKey, 1);
    }

    @Test @DisplayName("#51-S10 읽음은 받는 사람 기준 me와 partner")
    void read() throws Exception {
        send(developer); send(developer); send(developer);
        var a = connect(developer); var b = connect(tester);
        assertThat(post("/read", tester, "{\"seq\":3}").statusCode()).isEqualTo(200);
        assertThat(a.event()).contains("event:read", "\"reader\":\"partner\"", "\"lastReadSeq\":3", roomKey);
        assertThat(b.event()).contains("event:read", "\"reader\":\"me\"", "\"lastReadSeq\":3", roomKey);
    }

    @Test @DisplayName("#51-S11 읽은 순번이 오르지 않으면 알리지 않는다")
    void unchangedRead() throws Exception {
        send(developer); send(developer); send(developer);
        var a = connect(developer); service.markRead(roomKey, tester.getId(), 3);
        assertThat(a.event()).contains("event:read");
        service.markRead(roomKey, tester.getId(), 2); service.markRead(roomKey, tester.getId(), 3);
        send(developer); message(a, roomKey, 4);
    }

    @Test @DisplayName("#51-S15 끊긴 연결은 제거되고 전송은 성공")
    void disconnected() throws Exception {
        var b = connect(tester); b.close(); send(developer);
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(4);
        while (hub.connectionCount(tester.getId()) != 0 && System.nanoTime() < deadline) Thread.sleep(50);
        assertThat(hub.connectionCount(tester.getId())).isZero();
        assertThat(service.getMessages(roomKey, developer.getId(), null, 0L).messages()).hasSize(1);
    }

    @Test @DisplayName("#51-S16 여섯 번째 연결은 가장 오래된 연결을 종료")
    void limit() throws Exception {
        var first = connect(tester); var active = new ArrayList<Stream>();
        for (int i = 0; i < 5; i++) active.add(connect(tester));
        assertThat(first.event()).isEqualTo("EOF");
        assertThat(hub.connectionCount(tester.getId())).isEqualTo(5);
        send(developer); for (var stream : active) message(stream, roomKey, 1);
    }
}
