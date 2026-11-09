package com.testmoa.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.ToString;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 무료 플랜의 조건(이름, 혜택). 구독 플랜({@link Plan})과 별도 테이블이다.
 * 구독 플랜 행으로 넣으면 판매 목록에 섞여 결제 대상이 되고 구독 중으로 계산되기 때문이다.
 * 행은 하나뿐이라 PK를 고정값으로 둔다. 가격·기간·버전은 없다.
 */
@Entity(name = "free_plans")
@Getter
@ToString
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class FreePlan {
    /** 행이 하나뿐이라 PK를 고정한다. 같은 PK로 두 번 넣을 수는 없지만, 다른 id의 행은 DB가 막지 않아서 코드가 항상 이 id만 저장해 한 행을 지킨다 */
    public static final Long SINGLE_ID = 1L;

    /** 행이 없을 때 조회가 돌려주는 이름 */
    public static final String DEFAULT_TIER = "FREE";

    @Id
    private Long id;

    // 무료 플랜 이름
    @Column(nullable = false)
    private String tier;

    // 혜택 문구. 쉼표로 이어 한 칼럼에 넣는다(문구에는 쉼표를 쓰지 않는다). benefits()로 잘라 읽는다
    @Column(columnDefinition = "TEXT")
    private String description;

    // 생성 일시. 저장 시 자동 기록
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // 수정 일시. 저장, 수정 시 자동 기록
    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    /**
     * 무료 플랜 조건을 처음 만든다. PK는 고정값이다.
     *
     * @param tier     무료 플랜 이름
     * @param benefits 혜택 문구 목록. 문구에 쉼표가 없다고 가정한다
     */
    public FreePlan(String tier, List<String> benefits) {
        this.id = SINGLE_ID;
        this.tier = tier;
        this.description = Plan.joinBenefits(benefits);
    }

    /**
     * 이름과 혜택을 고친다. 이력은 남기지 않는다.
     *
     * @param tier     무료 플랜 이름
     * @param benefits 혜택 문구 목록
     */
    public void update(String tier, List<String> benefits) {
        this.tier = tier;
        this.description = Plan.joinBenefits(benefits);
    }

    /**
     * 혜택 문구 목록. description을 쉼표로 자르고 앞뒤 공백을 지운다. 비어 있으면 빈 목록이다.
     *
     * @return 혜택 문구 목록
     */
    public List<String> benefits() {
        return Plan.splitBenefits(description);
    }
}
