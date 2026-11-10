package com.testmoa.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity(name = "feedback_images")
@Getter
@ToString
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class FeedbackImage {
    /** 업로드 폴더. 테스터 주소와 개발자 주소가 이 이름 아래에서 파일을 읽고 쓴다 */
    public static final String FOLDER = "feedback-images";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 대상 피드백
    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false)
    private Feedback feedback;

    // 이미지 URL
    @Column(nullable = false, columnDefinition = "TEXT")
    private String url;

    // 생성 일시. 저장 시 자동 기록
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // 수정 일시. 저장, 수정 시 자동 기록
    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    /**
     * 피드백 이미지 등록 시 새로운 FeedbackImage 엔티티 생성하기 위해 사용하는 빌더 생성자.
     *
     * @param feedback  대상 피드백
     * @param url       이미지 URL
     */
    @Builder
    public FeedbackImage(
            Feedback feedback,
            String url
    ){
        this.feedback = feedback;
        this.url = url;
    }
}
