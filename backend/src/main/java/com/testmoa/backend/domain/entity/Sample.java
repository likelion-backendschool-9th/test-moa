package com.testmoa.backend.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity(name = "samples")
@Getter
@ToString
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Sample {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 임시 필드 1
    private String temp1;

    // 임시 필드 2
    private String temp2;

    // 생성 일시. 저장 시 자동 기록
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // 수정 일시. 저장, 수정 시 자동 기록
    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    /**
     * CRUD 예시용 Sample 엔티티 생성하기 위해 사용하는 빌더 생성자.
     *
     * @param temp1     임시 필드 1
     * @param temp2     임시 필드 2
     */
    @Builder
    public Sample(
            String temp1,
            String temp2
    ){
        this.temp1 = temp1;
        this.temp2 = temp2;
    }

    public void updateTemp1(String temp1) { this.temp1 = temp1; }

    public void updateTemp2(String temp2) { this.temp2 = temp2; }
}
