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

import static org.assertj.core.api.Assertions.assertThatThrownBy;

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
}
