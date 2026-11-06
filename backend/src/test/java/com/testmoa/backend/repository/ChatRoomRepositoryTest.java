package com.testmoa.backend.repository;

import com.testmoa.backend.entity.ChatParticipant;
import com.testmoa.backend.entity.ChatRoom;
import com.testmoa.backend.entity.Recruitment;
import com.testmoa.backend.entity.Register;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.entity.enums.ChatRole;
import com.testmoa.backend.support.ChatFixtures;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;

import static com.testmoa.backend.support.ChatFixtures.participantWithRole;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
class ChatRoomRepositoryTest {
    @Autowired
    private TestEntityManager em;

    @Autowired
    private ChatRoomRepository chatRoomRepository;

    private ChatFixtures fixtures;
    private User developer;
    private User tester;
    private Recruitment recruitment;
    private Register register;

    @BeforeEach
    void setUp() {
        fixtures = new ChatFixtures(em);
        developer = fixtures.user("developerA");
        tester = fixtures.user("testerB");
        recruitment = fixtures.recruitment(developer, "결제 모듈 테스트");
        register = fixtures.confirmedRegister(recruitment, tester);
    }

    /** 영속성 컨텍스트를 비우고 DB에서 다시 읽은 방 */
    private ChatRoom reload(ChatRoom room) {
        em.flush();
        em.clear();
        return chatRoomRepository.findById(room.getId()).orElseThrow();
    }

    private ChatRoom open(Register register) {
        return chatRoomRepository.save(ChatRoom.builder().register(register).build());
    }

    @Test
    @DisplayName("#47-S1 선정된 참가로 채팅방을 열면 그 모집 건과 참가의 방이 하나 저장된다")
    void openRoom() {
        ChatRoom saved = reload(open(register));

        assertThat(chatRoomRepository.count()).isEqualTo(1);
        assertThat(saved.getRecruitment().getId()).isEqualTo(recruitment.getId());
        assertThat(saved.getRegister().getId()).isEqualTo(register.getId());
    }

    @Test
    @DisplayName("#47-S2 같은 참가로 채팅방을 하나 더 저장하면 거절된다")
    void rejectSecondRoomForSameRegister() {
        chatRoomRepository.saveAndFlush(ChatRoom.builder().register(register).build());

        assertThatThrownBy(() -> chatRoomRepository.saveAndFlush(ChatRoom.builder().register(register).build()))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("#47-S3 채팅방을 열면 개발자와 테스터 두 참여자가 처음 상태로 함께 저장된다")
    void openRoomWithTwoParticipants() {
        ChatRoom saved = reload(open(register));

        List<ChatParticipant> participants = saved.getParticipants();
        assertThat(participants).hasSize(2);
        assertThat(participantWithRole(saved, ChatRole.DEVELOPER).getUser().getId()).isEqualTo(developer.getId());
        assertThat(participantWithRole(saved, ChatRole.TESTER).getUser().getId()).isEqualTo(tester.getId());
        assertThat(participants).allSatisfy(p -> {
            assertThat(p.getCustomName()).isNull();
            assertThat(p.isHidden()).isFalse();
            assertThat(p.getLastReadSeq()).isZero();
        });
        assertThat(saved.getLastSeq()).isZero();
    }

    @Test
    @DisplayName("#47-S4 개발자가 이름을 바꾸고 방을 삭제해도 테스터의 상태는 그대로다")
    void participantStateIsSeparate() {
        ChatRoom room = reload(open(register));
        ChatParticipant developerSide = participantWithRole(room, ChatRole.DEVELOPER);
        developerSide.rename("결제 테스트");
        developerSide.hide();

        ChatRoom saved = reload(room);

        ChatParticipant savedDeveloper = participantWithRole(saved, ChatRole.DEVELOPER);
        assertThat(savedDeveloper.getCustomName()).isEqualTo("결제 테스트");
        assertThat(savedDeveloper.isHidden()).isTrue();
        ChatParticipant savedTester = participantWithRole(saved, ChatRole.TESTER);
        assertThat(savedTester.getCustomName()).isNull();
        assertThat(savedTester.isHidden()).isFalse();
    }

    @Test
    @DisplayName("#47-S7 채팅방은 서로 다른 22자 base62 roomKey를 받고 그 키로 찾을 수 있다")
    void findByRoomKey() {
        Register otherRegister = fixtures.confirmedRegister(recruitment, fixtures.user("testerC"));
        ChatRoom first = open(register);
        ChatRoom second = open(otherRegister);
        em.flush();
        em.clear();

        assertThat(List.of(first.getRoomKey(), second.getRoomKey())).allMatch(key -> key.matches("[0-9A-Za-z]{22}"));
        assertThat(first.getRoomKey()).isNotEqualTo(second.getRoomKey());
        assertThat(chatRoomRepository.findByRoomKey(first.getRoomKey()))
                .get().extracting(ChatRoom::getId).isEqualTo(first.getId());
        assertThat(chatRoomRepository.findByRoomKey("aaaaaaaaaaaaaaaaaaaaaa")).isEmpty();
    }
}
