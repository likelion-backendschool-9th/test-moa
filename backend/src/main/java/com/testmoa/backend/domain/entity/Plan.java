package com.testmoa.backend.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity(name = "plans")
@Table(uniqueConstraints = @UniqueConstraint(
        name = "uk_plans_tier_version",
        columnNames = {"tier", "version"}
))
@Getter
@ToString
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Plan {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 등급
    @Column(nullable = false)
    private String tier;

    // 현금 결제 가격
    @Column(nullable = false)
    private Integer cashPrice;

    // 크레딧 결제 가격
    @Column(nullable = false)
    private Integer creditPrice;

    // 월간 모집 제한 인원
    @Column(nullable = false)
    private Integer monthlyRecruitLimit;

    // 같은 tier의 몇 번째 조건인지. 가격·한도가 바뀌면 이 행을 고치지 않고 version을 1 올린 새 행을 만든다.
    // 구독 행은 산 당시의 플랜 행을 가리켜서, 예전 구독의 조건이 그대로 남는다.
    @Column(nullable = false)
    private Integer version;

    // 설명
    @Column(columnDefinition = "TEXT")
    private String description;

    // 플랜 이미지 URL
    @Column(columnDefinition = "TEXT")
    private String imageUrl;

    // 구독 제공 기간. 일 단위로 기록 (예: 한 달 30, 1년 365)
    @Column(nullable = false)
    private Integer periodDays;

    // 생성 일시. 저장 시 자동 기록
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // 수정 일시. 저장, 수정 시 자동 기록
    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    /**
     * 구독 플랜 등록 시 새로운 Plan 엔티티 생성하기 위해 사용하는 빌더 생성자.
     *
     * @param tier                  등급
     * @param cashPrice             현금 결제 가격
     * @param creditPrice           크레딧 결제 가격
     * @param monthlyRecruitLimit   월간 모집 제한 인원
     * @param version               플랜 버전
     * @param description           설명
     * @param imageUrl              플랜 이미지 URL
     * @param periodDays            구독 제공 기간 (일 단위)
     */
    @Builder
    public Plan(
            String tier,
            Integer cashPrice,
            Integer creditPrice,
            Integer monthlyRecruitLimit,
            Integer version,
            String description,
            String imageUrl,
            Integer periodDays
    ){
        this.tier = tier;
        this.cashPrice = cashPrice;
        this.creditPrice = creditPrice;
        this.monthlyRecruitLimit = monthlyRecruitLimit;
        this.version = version;
        this.description = description;
        this.imageUrl = imageUrl;
        this.periodDays = periodDays;
    }
}
