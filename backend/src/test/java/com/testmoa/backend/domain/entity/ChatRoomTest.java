package com.testmoa.backend.domain.entity;

import com.testmoa.backend.global.common.ChatRole;
import com.testmoa.backend.support.ChatFixtures;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

import static com.testmoa.backend.support.ChatFixtures.participantWithRole;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
class ChatRoomTest {
    @Autowired TestEntityManager em;

    private ChatRoom room(String suffix) {
        var fixtures = new ChatFixtures(em);
        var recruitment = fixtures.recruitment(fixtures.user("개발자" + suffix), "프로젝트" + suffix);
        return ChatRoom.builder().register(fixtures.confirmedRegister(recruitment, fixtures.user("테스터" + suffix))).build();
    }

    private void rejectsOtherRoom(ChatRoom target, ChatParticipant sender) {
        long lastSeq = target.getLastSeq();
        var lastMessageAt = target.getLastMessageAt();
        var senderRoom = sender.getRoom();
        long senderLastSeq = senderRoom.getLastSeq();
        var senderLastMessageAt = senderRoom.getLastMessageAt();

        assertThatThrownBy(() -> target.createMessage(sender, "잘못된 방 메시지"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("이 방의 참여자만 메시지를 보낼 수 있어요");
        assertThat(target.getLastSeq()).isEqualTo(lastSeq);
        assertThat(target.getLastMessageAt()).isEqualTo(lastMessageAt);
        assertThat(senderRoom.getLastSeq()).isEqualTo(senderLastSeq);
        assertThat(senderRoom.getLastMessageAt()).isEqualTo(senderLastMessageAt);
    }

    @Test @DisplayName("#49-S7 다른 방 참여자는 상태를 바꾸기 전에 거절")
    void rejectsPersistedOtherRoom() {
        var target = em.persistAndFlush(room("A"));
        var other = em.persistAndFlush(room("B"));
        target.createMessage(participantWithRole(target, ChatRole.TESTER), "기존 메시지");
        rejectsOtherRoom(target, participantWithRole(other, ChatRole.TESTER));
    }

    @Test @DisplayName("#49-S7 저장 전에도 같은 방 참여자는 허용하고 다른 방 참여자는 거절")
    void checksUnsavedRoomsByIdentity() {
        var target = room("A");
        var other = room("B");
        rejectsOtherRoom(target, participantWithRole(other, ChatRole.TESTER));

        var message = target.createMessage(participantWithRole(target, ChatRole.TESTER), "같은 방 메시지");
        assertThat(message.getRoom()).isSameAs(target);
        assertThat(message.getSeq()).isEqualTo(1);
        assertThat(target.getLastSeq()).isEqualTo(1);
        assertThat(target.getLastMessageAt()).isEqualTo(message.getSentAt());
    }

    @Test @DisplayName("#49-S7 같은 방 id의 프록시도 올바른 참여자로 허용")
    void acceptsSameRoomProxy() {
        var target = em.persistAndFlush(room("A"));
        var senderId = participantWithRole(target, ChatRole.TESTER).getId();
        em.clear();
        var sender = em.find(ChatParticipant.class, senderId);
        assertThat(sender.getRoom()).isNotSameAs(target);
        assertThat(org.hibernate.Hibernate.isInitialized(sender.getRoom())).isFalse();

        var message = target.createMessage(sender, "프록시 방 메시지");
        assertThat(message.getRoom().getId()).isEqualTo(target.getId());
        assertThat(message.getSeq()).isEqualTo(1);
        assertThat(target.getLastSeq()).isEqualTo(1);
        assertThat(target.getLastMessageAt()).isEqualTo(message.getSentAt());
    }
}
