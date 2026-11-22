package com.testmoa.backend.controller;

import com.testmoa.backend.entity.ChatParticipant;
import com.testmoa.backend.entity.ChatRoom;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.entity.enums.ChatRole;
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
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.json.JsonCompareMode;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import java.util.stream.IntStream;

import static com.testmoa.backend.support.ChatFixtures.participantWithRole;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ChatSearchControllerTest {
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

    void write(ChatRoom target, ChatParticipant sender, String... texts) {
        for (String text : texts) em.persist(target.createMessage(sender, text));
        em.flush();
    }

    MockHttpServletRequestBuilder search(ChatRoom target, String q) {
        return get("/api/v1/chats/" + target.getRoomKey() + "/messages/search").queryParam("q", q);
    }

    MockHttpServletRequestBuilder range(String... params) {
        var request = get("/api/v1/chats/" + room.getRoomKey() + "/messages");
        for (int i = 0; i < params.length; i += 2) request.queryParam(params[i], params[i + 1]);
        return request;
    }

    void writeNumbered(int count) {
        write(room, testerSide, IntStream.rangeClosed(1, count).mapToObj(i -> "메시지 " + i).toArray(String[]::new));
    }

    static Object[] seqs(int from, int to) {
        return IntStream.rangeClosed(from, to).boxed().toArray();
    }

    ResultActions call(MockHttpServletRequestBuilder request, User user) throws Exception {
        return mvc.perform(request.header("Authorization", "Bearer " + jwt.createAccessToken(user.getId())));
    }

    @Test @DisplayName("#105-S1 검색어가 들어간 메시지의 순번을 최신부터, 대소문자 없이")
    void search() throws Exception {
        write(room, testerSide, "사진 올렸어요", "확인했어요", "사진 순서가 바뀌어요", "Photo 앱에서 찍은 사진이에요");
        call(search(room, "사진"), tester).andExpect(status().isOk())
                .andExpect(content().json("{\"success\":true,\"data\":{\"seqs\":[4,3,1],\"hasMore\":false}}"));
        call(search(room, "photo"), developer).andExpect(jsonPath("$.data.seqs", contains(4)));
        call(search(room, "없는말"), tester).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.seqs", empty())).andExpect(jsonPath("$.data.hasMore").value(false));
    }

    @Test @DisplayName("#105-S2 앞뒤 공백은 빼고, 다른 방의 메시지는 찾지 않는다")
    void trimsAndScopesToRoom() throws Exception {
        write(room, testerSide, "사진 올렸어요", "확인했어요", "사진 순서가 바뀌어요", "Photo 앱에서 찍은 사진이에요");
        var other = newRoom(fixtures.user("다른개발"), tester, "레시피핏");
        write(other, participantWithRole(other, ChatRole.TESTER), "사진 다시 보내요");
        call(search(room, " 사진 "), tester).andExpect(jsonPath("$.data.seqs", contains(4, 3, 1)));
    }

    @Test @DisplayName("#105-S3 %와 _는 글자 그대로 찾는다")
    void likeWildcards() throws Exception {
        write(room, testerSide, "진행률 50% 넘었어요", "진행률 500 넘었어요", "file_name 확인", "filexname 확인");
        call(search(room, "50%"), tester).andExpect(jsonPath("$.data.seqs", contains(1)));
        call(search(room, "file_"), tester).andExpect(jsonPath("$.data.seqs", contains(3)));
    }

    @Test @DisplayName("#105-S4 결과가 100개를 넘으면 최신 100개와 hasMore")
    void limit() throws Exception {
        write(room, testerSide, IntStream.rangeClosed(1, 101).mapToObj(i -> "버그 " + i).toArray(String[]::new));
        Object[] expected = IntStream.iterate(101, i -> i >= 2, i -> i - 1).boxed().toArray();
        call(search(room, "버그"), tester).andExpect(jsonPath("$.data.seqs", hasSize(100)))
                .andExpect(jsonPath("$.data.seqs", contains(expected)))
                .andExpect(jsonPath("$.data.hasMore").value(true));
    }

    @Test @DisplayName("#105-S5 비었거나 100자를 넘는 검색어는 400")
    void invalidQuery() throws Exception {
        String hundred = "가".repeat(100);
        for (var request : new MockHttpServletRequestBuilder[]{
                get("/api/v1/chats/" + room.getRoomKey() + "/messages/search"),
                search(room, ""), search(room, "  "), search(room, hundred + "가"), search(room, " " + hundred)}) {
            call(request, tester).andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error.code").value("INVALID_INPUT"));
        }
        call(search(room, hundred), tester).andExpect(status().isOk());
    }

    @Test @DisplayName("#105-S6 비로그인은 401, 비참여자·운영자·없는 방·지운 방은 같은 404")
    void inaccessible() throws Exception {
        mvc.perform(search(room, "사진")).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));
        var outsider = fixtures.user("외부회원");
        var admin = fixtures.user("운영자");
        em.flush();
        em.createQuery("update users u set u.role = :role where u.id = :id")
                .setParameter("role", Role.ADMIN).setParameter("id", admin.getId()).executeUpdate();
        testerSide.hide();
        em.flush();
        em.clear();
        String body = "{\"success\":false,\"data\":null,\"error\":{\"code\":\"NOT_FOUND\",\"message\":\"찾을 수 없어요\"}}";
        var missing = get("/api/v1/chats/aaaaaaaaaaaaaaaaaaaaaa/messages/search").queryParam("q", "사진");
        call(search(room, "사진"), outsider).andExpect(status().isNotFound()).andExpect(content().json(body, JsonCompareMode.STRICT));
        call(search(room, "사진"), admin).andExpect(status().isNotFound()).andExpect(content().json(body, JsonCompareMode.STRICT));
        call(missing, developer).andExpect(status().isNotFound()).andExpect(content().json(body, JsonCompareMode.STRICT));
        call(search(room, "사진"), tester).andExpect(status().isNotFound()).andExpect(content().json(body, JsonCompareMode.STRICT));
    }

    @Test @DisplayName("#105-S14 before와 from으로 범위를 한 번에 받는다")
    void range() throws Exception {
        writeNumbered(65);
        call(range("before", "36", "from", "3"), tester).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.messages[*].seq", contains(seqs(3, 35))))
                .andExpect(jsonPath("$.data.hasMore").value(true));
        call(range("before", "36", "from", "1"), tester)
                .andExpect(jsonPath("$.data.messages[*].seq", contains(seqs(1, 35))))
                .andExpect(jsonPath("$.data.hasMore").value(false));
    }

    @Test @DisplayName("#105-S15 500개가 넘는 범위는 before 바로 앞 500개")
    void rangeLimit() throws Exception {
        writeNumbered(600);
        call(range("before", "601", "from", "1"), tester)
                .andExpect(jsonPath("$.data.messages[*].seq", contains(seqs(101, 600))))
                .andExpect(jsonPath("$.data.hasMore").value(true));
        call(range("before", "101", "from", "1"), tester)
                .andExpect(jsonPath("$.data.messages[*].seq", contains(seqs(1, 100))))
                .andExpect(jsonPath("$.data.hasMore").value(false));
    }

    @Test @DisplayName("#105-S16 before 없는 from, 빈 범위, from=0, after와 함께는 400")
    void invalidRange() throws Exception {
        writeNumbered(10);
        for (var request : new MockHttpServletRequestBuilder[]{
                range("from", "3"), range("before", "10", "from", "10"), range("before", "10", "from", "0"),
                range("before", "10", "from", "3", "after", "5")}) {
            call(request, tester).andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error.code").value("INVALID_INPUT"));
        }
    }
}
