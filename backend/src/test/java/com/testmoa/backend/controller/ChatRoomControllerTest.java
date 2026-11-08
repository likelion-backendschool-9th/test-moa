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
import tools.jackson.databind.ObjectMapper;
import java.util.Map;
import static com.testmoa.backend.support.ChatFixtures.participantWithRole;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ChatRoomControllerTest {
    @Autowired MockMvc mvc;
    @Autowired EntityManager em;
    @Autowired JwtProvider jwt;
    @Autowired ObjectMapper json;
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
    void reload() { em.flush(); em.clear(); }

    ResultActions rename(String name) throws Exception {
        return call(patch(url()).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("name", name))), tester);
    }

    void roomName(User user, String name) throws Exception {
        call(get(url()), user).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.roomName").value(name));
        call(get("/api/v1/chats"), user).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.rooms[0].roomName").value(name));
    }

    @Test @DisplayName("#50-S1 이름 변경은 본인의 방 정보와 채팅함에만 반영")
    void renameRoom() throws Exception {
        rename("북로그 1차").andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.roomKey").value(room.getRoomKey()))
                .andExpect(jsonPath("$.data.recruitmentId").value(room.getRecruitment().getId()))
                .andExpect(jsonPath("$.data.projectName").value("북로그"))
                .andExpect(jsonPath("$.data.roomName").value("북로그 1차"))
                .andExpect(jsonPath("$.data.projectImage").value("https://img.test/booklog.png"))
                .andExpect(jsonPath("$.data.myRole").value("TESTER"))
                .andExpect(jsonPath("$.data.partner.nickname").value("모아개발"))
                .andExpect(jsonPath("$.data.partner.role").value("DEVELOPER"));
        reload();
        roomName(tester, "북로그 1차");
        roomName(developer, null);
    }

    @Test @DisplayName("#50-S2 다시 바꾸면 앞뒤 공백을 뺀 이름 저장")
    void renameAgain() throws Exception {
        rename("북로그 1차").andExpect(status().isOk());
        rename("  결제 문의  ").andExpect(status().isOk())
                .andExpect(jsonPath("$.data.roomName").value("결제 문의"));
        reload();
        assertThat(em.find(ChatParticipant.class, testerSide.getId()).getCustomRoomName()).isEqualTo("결제 문의");
    }

    @Test @DisplayName("#50-S3 이름 변경은 읽은 순번과 삭제 여부 유지")
    void preserveOtherColumns() throws Exception {
        testerSide.markRead(5);
        reload();
        rename("북로그 1차").andExpect(status().isOk());
        reload();
        var saved = em.find(ChatParticipant.class, testerSide.getId());
        assertThat(saved.getLastReadSeq()).isEqualTo(5);
        assertThat(saved.isHidden()).isFalse();
    }

    @Test @DisplayName("#50-S4 빈 이름·공백·누락 거절 후 이름 유지")
    void blankName() throws Exception {
        rename("북로그 1차").andExpect(status().isOk());
        for (String body : new String[]{"{\"name\":\"\"}", "{\"name\":\"   \"}", "{}"}) {
            call(patch(url()).contentType(MediaType.APPLICATION_JSON).content(body), tester)
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error.code").value("INVALID_INPUT"))
                    .andExpect(jsonPath("$.error.fields.name").value("대화방 이름을 입력해 주세요"));
        }
        reload();
        roomName(tester, "북로그 1차");
    }

    @Test @DisplayName("#50-S6 삭제는 내 채팅함에서만 숨기고 방 접근 차단")
    void deleteRoom() throws Exception {
        var recruitment = fixtures.recruitment(developer, "다른 프로젝트");
        var other = ChatRoom.builder().register(fixtures.confirmedRegister(recruitment, tester)).build();
        em.persist(other);
        reload();
        call(delete(url()), tester).andExpect(status().isOk())
                .andExpect(content().json("{\"success\":true,\"data\":null}",
                        org.springframework.test.json.JsonCompareMode.STRICT));
        reload();
        call(get("/api/v1/chats"), tester).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.total").value(1))
                .andExpect(jsonPath("$.data.rooms.length()").value(1))
                .andExpect(jsonPath("$.data.rooms[0].roomKey").value(other.getRoomKey()));
        for (var request : new MockHttpServletRequestBuilder[]{get(url()), get(url() + "/messages"),
                post(url() + "/messages").contentType(MediaType.APPLICATION_JSON).content("{\"text\":\"안녕하세요\"}")}) {
            call(request, tester).andExpect(status().isNotFound())
                    .andExpect(content().json("{\"success\":false,\"data\":null,\"error\":{\"code\":\"NOT_FOUND\",\"message\":\"찾을 수 없어요\"}}",
                            org.springframework.test.json.JsonCompareMode.STRICT));
        }
        call(get("/api/v1/chats"), developer).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.total").value(2))
                .andExpect(jsonPath("$.data.rooms[*].roomKey", org.hamcrest.Matchers.hasItem(room.getRoomKey())));
    }

    @Test @DisplayName("#50-S7 상대가 보내면 이름과 읽은 순번을 유지한 채 다시 표시")
    void reappear() throws Exception {
        testerSide.markRead(3);
        reload();
        rename("북로그 1차").andExpect(status().isOk());
        call(delete(url()), tester).andExpect(status().isOk());
        reload();
        var hidden = em.find(ChatParticipant.class, testerSide.getId());
        assertThat(hidden.isHidden()).isTrue();
        assertThat(hidden.getCustomRoomName()).isEqualTo("북로그 1차");
        assertThat(hidden.getLastReadSeq()).isEqualTo(3);
        call(post(url() + "/messages").contentType(MediaType.APPLICATION_JSON)
                .content("{\"text\":\"다시 확인 부탁드려요\"}"), developer).andExpect(status().isOk());
        reload();
        roomName(tester, "북로그 1차");
        var saved = em.find(ChatParticipant.class, testerSide.getId());
        assertThat(saved.isHidden()).isFalse();
        assertThat(saved.getLastReadSeq()).isEqualTo(3);
    }

    @Test @DisplayName("#50-S5 공백 제거 후 30자까지 허용")
    void nameLength() throws Exception {
        String name = "가".repeat(30);
        for (String input : new String[]{name, "  " + name + "  "}) {
            rename(input).andExpect(status().isOk()).andExpect(jsonPath("$.data.roomName").value(name));
        }
        rename(name + "가").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_INPUT"))
                .andExpect(jsonPath("$.error.fields.name").value("대화방 이름은 30자까지 쓸 수 있어요"));
        reload();
        roomName(tester, name);
    }
}

