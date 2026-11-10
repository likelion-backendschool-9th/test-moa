package com.testmoa.backend.entity;

import com.testmoa.backend.entity.enums.Restriction;
import com.testmoa.backend.entity.enums.SanctionType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.EnumSet;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 운영자 제재(#86). 경고는 기록만 남기고, 정지는 고른 기능을 막는다. 기간 정지는 종료 일시가 지나면 따로 처리하지 않아도 풀린다
 */
@Entity(name = "sanctions")
@Table(indexes = @Index(columnList = "user_id"))
@Getter
@ToString
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Sanction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 제재받은 회원
    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false)
    private User user;

    // 제재한 운영자
    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sanctioned_by", nullable = false)
    private User sanctionedBy;

    // 해제한 운영자. 해제 전에는 null
    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "released_by")
    private User releasedBy;

    // 종류(WARNING, SUSPENSION, PERMANENT)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SanctionType type;

    // 막을 기능. 쉼표로 이어 저장한다(예: LOGIN,CHAT). 경고는 빈 값
    @Convert(converter = RestrictionsConverter.class)
    @Column(name = "restriction", nullable = false)
    private Set<Restriction> restrictions;

    // 운영자가 적은 사유
    @Column(nullable = false, columnDefinition = "TEXT")
    private String reason;

    // 시작 일시
    @Column(nullable = false)
    private LocalDateTime startedAt;

    // 종료 일시. 기간 정지만 있고, 영구 정지·경고는 null
    private LocalDateTime endsAt;

    // 운영자가 해제한 일시. 해제 전에는 null
    private LocalDateTime releasedAt;

    // 해제 사유. 해제할 때 필수(허위 신고 등)
    @Column(columnDefinition = "TEXT")
    private String releaseReason;

    @Builder
    public Sanction(User user, User sanctionedBy, SanctionType type, Set<Restriction> restrictions, String reason,
                    LocalDateTime startedAt, LocalDateTime endsAt) {
        this.user = user;
        this.sanctionedBy = sanctionedBy;
        this.type = type;
        this.restrictions = restrictions == null || restrictions.isEmpty() ? EnumSet.noneOf(Restriction.class) : EnumSet.copyOf(restrictions);
        this.reason = reason;
        this.startedAt = startedAt;
        this.endsAt = endsAt;
    }

    /** 지금 걸려 있는지. 해제하지 않았고, 시작했고, 끝나지 않은 정지만 기능을 막는다. 경고는 막지 않는다 */
    public boolean isActive(LocalDateTime now) {
        return type != SanctionType.WARNING && releasedAt == null
                && !startedAt.isAfter(now) && (endsAt == null || endsAt.isAfter(now));
    }

    /** 해제. 지금 걸린 정지만 풀 수 있다(서비스가 먼저 확인해 409로 알린다) */
    public void release(User admin, String reason, LocalDateTime now) {
        if (!isActive(now)) throw new IllegalStateException("지금 걸린 제재가 아닙니다.");
        this.releasedBy = admin;
        this.releaseReason = reason;
        this.releasedAt = now;
    }

    /** restriction 칸: 막을 기능을 쉼표로 이어 저장한다 */
    @Converter
    public static class RestrictionsConverter implements AttributeConverter<Set<Restriction>, String> {
        @Override
        public String convertToDatabaseColumn(Set<Restriction> restrictions) {
            return restrictions == null ? "" : restrictions.stream().map(Enum::name).sorted().collect(Collectors.joining(","));
        }

        @Override
        public Set<Restriction> convertToEntityAttribute(String column) {
            EnumSet<Restriction> set = EnumSet.noneOf(Restriction.class);
            if (column == null || column.isBlank()) return set;
            Arrays.stream(column.split(",")).map(String::trim).filter(s -> !s.isEmpty()).map(Restriction::valueOf).forEach(set::add);
            return set;
        }
    }
}
