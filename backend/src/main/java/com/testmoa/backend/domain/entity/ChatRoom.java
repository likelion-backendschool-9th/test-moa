package com.testmoa.backend.domain.entity;

import com.testmoa.backend.global.common.ChatRole;
import com.testmoa.backend.global.util.RoomKeyGenerator;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

@Entity(name = "chat_rooms")
@Getter
@ToString
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ChatRoom {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 주소에 쓰는 키. 추측할 수 없는 base62 22자
    @Column(nullable = false, unique = true, length = RoomKeyGenerator.LENGTH)
    private String roomKey;

    // 대화하는 모집 건. 프로젝트명·이미지는 recruitment.project에서 찾는다
    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false)
    private Recruitment recruitment;

    // 선정된 테스터의 참가. 참가 한 건에 채팅방은 하나
    @ToString.Exclude
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false, unique = true)
    private Register register;

    // 참여자 두 명(개발자, 테스터). 방을 저장할 때 함께 저장
    @ToString.Exclude
    @OneToMany(mappedBy = "room", cascade = CascadeType.PERSIST)
    private List<ChatParticipant> participants = new ArrayList<>();

    // 이 방에서 마지막으로 매긴 메시지 순번. 메시지가 없으면 0
    @Column(nullable = false)
    private long lastSeq;

    // 최근 메시지 일시. 채팅함 정렬에 쓴다. 메시지가 없으면 방을 연 일시
    @Column(nullable = false)
    private LocalDateTime lastMessageAt;

    // 생성 일시. 저장 시 자동 기록
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // 수정 일시. 저장, 수정 시 자동 기록
    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    /**
     * 채팅을 걸 때 새로운 ChatRoom 엔티티를 만들기 위해 사용하는 빌더 생성자.
     * 모집 건을 올린 개발자(recruitment.project.user)와 선정된 테스터를 참여자로 함께 만든다.
     * 채팅을 걸 수 있는지(구독, 선정 여부)는 호출하는 쪽에서 확인한다.
     *
     * @param register  선정된 테스터의 참가
     */
    @Builder
    public ChatRoom(Register register) {
        this.roomKey = RoomKeyGenerator.generate();
        this.recruitment = register.getRecruitment();
        this.register = register;
        this.lastSeq = 0;
        // Postgres timestamp는 마이크로초까지 저장하므로 저장 전후 값이 같도록 맞춘다
        this.lastMessageAt = LocalDateTime.now().truncatedTo(ChronoUnit.MICROS);
        this.participants.add(new ChatParticipant(this, recruitment.getProject().getUser(), ChatRole.DEVELOPER));
        this.participants.add(new ChatParticipant(this, register.getUser(), ChatRole.TESTER));
    }
    public long nextSeq(LocalDateTime sentAt) {
        this.lastMessageAt = sentAt;
        return ++this.lastSeq;
    }

}
