package com.testmoa.backend.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * 신고 증거 파일(#85). 파일은 서버 디스크에 두고 여기에는 위치와 정보만 둔다. 공개 주소가 없고 API로만 연다
 */
@Entity(name = "report_evidences")
@Getter
@ToString
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ReportEvidence {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 어느 신고의 증거인지
    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false)
    private Report report;

    // 업로드 폴더 안의 상대 경로(무작위 이름)
    @Column(nullable = false, columnDefinition = "TEXT")
    private String storedPath;

    // 올린 사람의 원래 파일 이름. 내려받을 때 쓴다
    @Column(nullable = false)
    private String originalName;

    // 파일 종류(image/png, image/jpeg, image/webp, application/pdf). 파일 앞부분으로 확인한 값
    @Column(nullable = false)
    private String contentType;

    // 파일 크기(바이트)
    @Column(nullable = false)
    private Long size;

    // 화면에 보일 순서. 올린 순서대로 0부터
    @Column(nullable = false)
    private Integer sortOrder;

    @Builder
    public ReportEvidence(Report report, String storedPath, String originalName, String contentType, Long size, Integer sortOrder) {
        this.report = report;
        this.storedPath = storedPath;
        this.originalName = originalName;
        this.contentType = contentType;
        this.size = size;
        this.sortOrder = sortOrder;
    }
}
