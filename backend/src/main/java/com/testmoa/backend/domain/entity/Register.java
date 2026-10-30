package com.testmoa.backend.domain.entity;

import com.testmoa.backend.global.common.RegisterStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity(name = "registers")
@Getter
@ToString
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Register {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 참가한 프로젝트
    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false)
    private Project project;

    // 테스터
    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false)
    private User user;

    // 참가 상태(CONFIRMED, REJECTED, CANCELLED)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RegisterStatus status;

    // 신청 일시. 저장 시 자동 기록
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime appliedAt;

    // 참여 확정 일시. 확정 전에는 null
    private LocalDateTime confirmedAt;

    // 생성 일시. 저장 시 자동 기록
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // 수정 일시. 저장, 수정 시 자동 기록
    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    /**
     * 테스트 참가 신청 시 새로운 Register 엔티티 생성하기 위해 사용하는 빌더 생성자.
     *
     * @param project   참가한 프로젝트
     * @param user      테스터
     * @param status    참가 상태
     */
    @Builder
    public Register(
            Project project,
            User user,
            RegisterStatus status
    ){
        this.project = project;
        this.user = user;
        this.status = status;
    }
}
