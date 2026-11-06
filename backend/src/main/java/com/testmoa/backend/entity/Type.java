package com.testmoa.backend.entity;

import com.testmoa.backend.entity.enums.TypeCode;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity(name = "types")
@Getter
@ToString
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Type {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 타입 코드(WEB, MOBILE, GAME, API)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, unique = true)
    private TypeCode code;

    // 아이콘 이미지 URL
    @Column(columnDefinition = "TEXT")
    private String imageUrl;

    // 생성 일시. 저장 시 자동 기록
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // 수정 일시. 저장, 수정 시 자동 기록
    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    /**
     * 프로젝트 타입 등록 시 새로운 Type 엔티티 생성하기 위해 사용하는 빌더 생성자.
     *
     * @param code      타입 코드
     * @param imageUrl  아이콘 이미지 URL
     */
    @Builder
    public Type(
            TypeCode code,
            String imageUrl
    ){
        this.code = code;
        this.imageUrl = imageUrl;
    }
}
