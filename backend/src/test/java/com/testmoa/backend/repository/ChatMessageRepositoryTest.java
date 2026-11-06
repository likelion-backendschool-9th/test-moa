package com.testmoa.backend.repository;

import com.testmoa.backend.entity.ChatMessage;
import com.testmoa.backend.entity.ChatParticipant;
import com.testmoa.backend.entity.ChatRoom;
import com.testmoa.backend.entity.Recruitment;
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
import static org.assertj.core.api.Assertions.tuple;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
class ChatMessageRepositoryTest {
    @Autowired
    private TestEntityManager em;

    @Autowired
    private ChatRoomRepository chatRoomRepository;

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    private ChatFixtures fixtures;
    private Recruitment recruitment;
    private ChatRoom room;

    @BeforeEach
    void setUp() {
        fixtures = new ChatFixtures(em);
        recruitment = fixtures.recruitment(fixtures.user("developerA"), "결제 모듈 테스트");
        room = chatRoomRepository.save(ChatRoom.builder()
                .register(fixtures.confirmedRegister(recruitment, fixtures.user("testerB")))
                .build());
    }

    private ChatMessage message(ChatParticipant sender, long seq, String content) {
        return ChatMessage.builder().sender(sender).seq(seq).content(content).build();
    }

    @Test
    @DisplayName("#47-S5 메시지는 순번·보낸 참여자·내용·보낸 일시로 저장되고 순번 순으로 읽힌다")
    void saveMessagesInSeqOrder() {
        ChatParticipant developerSide = participantWithRole(room, ChatRole.DEVELOPER);
        ChatParticipant testerSide = participantWithRole(room, ChatRole.TESTER);
        // 순번 순으로 읽히는지 보려고 순번 2를 먼저 저장한다
        chatMessageRepository.save(message(developerSide, 2, "반갑습니다"));
        chatMessageRepository.save(message(testerSide, 1, "안녕하세요"));
        em.flush();
        em.clear();

        List<ChatMessage> messages = chatMessageRepository.findByRoomOrderBySeqAsc(
                chatRoomRepository.findById(room.getId()).orElseThrow());

        assertThat(messages)
                .extracting(ChatMessage::getSeq, ChatMessage::getContent, m -> m.getSender().getId())
                .containsExactly(
                        tuple(1L, "안녕하세요", testerSide.getId()),
                        tuple(2L, "반갑습니다", developerSide.getId()));
        assertThat(messages).allSatisfy(m -> assertThat(m.getSentAt()).isNotNull());
    }

    @Test
    @DisplayName("#47-S6 같은 방에 같은 순번은 두 번 저장되지 않는다(순번은 방마다 따로 센다)")
    void rejectDuplicateSeqInSameRoom() {
        ChatRoom otherRoom = chatRoomRepository.save(ChatRoom.builder()
                .register(fixtures.confirmedRegister(recruitment, fixtures.user("testerC")))
                .build());
        ChatParticipant tester = participantWithRole(room, ChatRole.TESTER);
        chatMessageRepository.saveAndFlush(message(tester, 1, "안녕하세요"));
        chatMessageRepository.saveAndFlush(message(participantWithRole(otherRoom, ChatRole.TESTER), 1, "안녕하세요"));

        assertThatThrownBy(() -> chatMessageRepository.saveAndFlush(message(tester, 1, "반갑습니다")))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}
