package com.testmoa.backend.entity;

import com.testmoa.backend.entity.enums.ChatRole;
import com.testmoa.backend.support.ChatFixtures;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * 참여자 생성자는 ChatRoom만 쓰도록 package-private이라, 같은 패키지에서 DB 제약을 확인한다.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
class ChatParticipantPersistenceTest {
    @Autowired
    private TestEntityManager em;

    @Test
    @DisplayName("#47-S8 한 방에 같은 역할의 참여자는 두 명 저장되지 않는다")
    void rejectSecondParticipantWithSameRole() {
        ChatFixtures fixtures = new ChatFixtures(em);
        Recruitment recruitment = fixtures.recruitment(fixtures.user("developerA"), "결제 모듈 테스트");
        ChatRoom room = em.persistAndFlush(ChatRoom.builder()
                .register(fixtures.confirmedRegister(recruitment, fixtures.user("testerB")))
                .build());
        User otherDeveloper = fixtures.user("developerC");

        assertThatThrownBy(() -> em.persistAndFlush(new ChatParticipant(room, otherDeveloper, ChatRole.DEVELOPER)))
                .rootCause()
                .hasMessageContaining("chat_participants_room_id_role_key");
    }
    @Test
    @DisplayName("#50-S11 바꾼 방 이름은 custom_room_name 30자 컬럼에 저장한다")
    void customRoomNameColumn() {
        var fixtures = new ChatFixtures(em);
        var recruitment = fixtures.recruitment(fixtures.user("개발자"), "북로그");
        var room = em.persistAndFlush(ChatRoom.builder()
                .register(fixtures.confirmedRegister(recruitment, fixtures.user("테스터"))).build());
        var participant = ChatFixtures.participantWithRole(room, ChatRole.TESTER);
        participant.rename("북로그 1차");
        em.flush();
        assertThat(em.getEntityManager().createNativeQuery(
                "select custom_room_name from chat_participants where id = :id", String.class)
                .setParameter("id", participant.getId()).getSingleResult()).isEqualTo("북로그 1차");
        var columns = em.getEntityManager().createNativeQuery("""
                select column_name from information_schema.columns
                where table_schema = current_schema() and table_name = 'chat_participants'
                """, String.class).getResultList();
        assertThat(columns).contains("custom_room_name").doesNotContain("custom_name");
        assertThat(((Number) em.getEntityManager().createNativeQuery("""
                select character_maximum_length from information_schema.columns
                where table_schema = current_schema() and table_name = 'chat_participants'
                  and column_name = 'custom_room_name'
                """).getSingleResult()).intValue()).isEqualTo(30);
    }

}
