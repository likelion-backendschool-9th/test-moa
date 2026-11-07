package com.testmoa.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

// 메시지 순서는 방마다 1부터 매기는 순번(seq)으로 정한다. 한 방에서 같은 순번은 두 번 저장되지 않는다
// (room_id, seq) unique 제약의 인덱스가 방별 조회와 이전 메시지 커서에도 쓰인다
@Entity(name = "chat_messages")
@Table(uniqueConstraints = @UniqueConstraint(columnNames = {"room_id", "seq"}))
@Getter
@ToString
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ChatMessage {
    // 메시지 한 개의 최대 글자 수(UTF-16 코드 단위). 프론트의 CHAT_MESSAGE_MAX는 #54에서 맞춘다
    public static final int CONTENT_MAX = 10_000;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 메시지가 속한 채팅방
    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false)
    private ChatRoom room;

    // 방 안에서의 순번. 1부터 시작한다
    @Column(nullable = false)
    private long seq;

    // 보낸 참여자
    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false)
    private ChatParticipant sender;

    // 내용. 줄바꿈을 그대로 담는다. 개인 대화라 엔티티를 로그에 찍어도 남지 않게 toString에서 뺀다
    @ToString.Exclude
    @Column(nullable = false, length = CONTENT_MAX)
    private String content;

    // 보낸 일시
    @Column(nullable = false, updatable = false)
    private LocalDateTime sentAt;

    /**
     * 메시지를 보낼 때 새로운 ChatMessage 엔티티를 만들기 위해 사용하는 빌더 생성자.
     * 채팅방은 보낸 참여자의 방으로 정한다. 전송 시 순번 할당과 방 갱신은 ChatRoom.createMessage가 함께 한다.
     *
     * @param sender    보낸 참여자
     * @param seq       방 안에서의 순번
     * @param content   내용
     */
    @Builder
    public ChatMessage(ChatParticipant sender, long seq, String content) {
        this.room = sender.getRoom();
        this.sender = sender;
        this.seq = seq;
        this.content = content;
        // Postgres timestamp는 마이크로초까지 저장하므로 저장 전후 값이 같도록 맞춘다
        this.sentAt = LocalDateTime.now().truncatedTo(ChronoUnit.MICROS);
    }
}
