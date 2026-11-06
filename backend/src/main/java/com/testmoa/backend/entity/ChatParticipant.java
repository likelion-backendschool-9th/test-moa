package com.testmoa.backend.entity;

import com.testmoa.backend.entity.enums.ChatRole;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity(name = "chat_participants")
// 한 방에 같은 회원은 한 번만, 역할마다 한 명만(개발자 1명, 테스터 1명) 들어간다
@Table(uniqueConstraints = {
        @UniqueConstraint(columnNames = {"room_id", "user_id"}),
        @UniqueConstraint(columnNames = {"room_id", "role"})
})
@Getter
@ToString
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ChatParticipant {
    // 바꾼 대화방 이름의 최대 글자 수. 프론트의 CHAT_ROOM_NAME_MAX와 같다
    public static final int ROOM_NAME_MAX = 30;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 들어가 있는 채팅방
    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false)
    private ChatRoom room;

    // 참여한 회원
    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false)
    private User user;

    // 이 방에서의 역할(DEVELOPER, TESTER)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ChatRole role;

    // 내가 바꾼 대화방 이름. 내 채팅함에만 보인다. 바꾸지 않았으면 null
    @Column(length = ROOM_NAME_MAX)
    private String customName;

    // 내 채팅함에서 삭제했는지. 상대 채팅함에는 영향이 없다
    @Column(nullable = false)
    private boolean hidden;

    // 마지막으로 읽은 메시지 순번. 읽은 적이 없으면 0
    @Column(nullable = false)
    private long lastReadSeq;

    // 생성 일시. 저장 시 자동 기록
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // 수정 일시. 저장, 수정 시 자동 기록
    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    /**
     * 채팅방을 열 때 ChatRoom이 참여자를 만들기 위해 사용하는 생성자.
     *
     * @param room  들어가는 채팅방
     * @param user  참여하는 회원
     * @param role  이 방에서의 역할
     */
    ChatParticipant(ChatRoom room, User user, ChatRole role) {
        this.room = room;
        this.user = user;
        this.role = role;
        this.hidden = false;
        this.lastReadSeq = 0;
    }

    public void rename(String customName) { this.customName = customName; }

    public void hide() { this.hidden = true; }

    public void unhide() { this.hidden = false; }

    public void markRead(long seq) { this.lastReadSeq = seq; }
}
