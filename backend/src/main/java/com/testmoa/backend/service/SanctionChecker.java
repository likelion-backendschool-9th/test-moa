package com.testmoa.backend.service;

import com.testmoa.backend.entity.Sanction;
import com.testmoa.backend.entity.enums.Restriction;
import com.testmoa.backend.entity.enums.SanctionType;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.repository.SanctionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * 운영자 제재로 막힌 기능인지 확인한다(#86). 각 기능 담당은 자기 서비스에서 한 줄을 부른다.
 * 예) sanctionChecker.require(userId, Restriction.CHAT);
 */
@Component
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SanctionChecker {
    private final SanctionRepository sanctionRepository;

    /**
     * 막혀 있으면 403 RESTRICTED. error.fields에 막힌 기능(restriction), 사유(reason), 해제 일시(endsAt, 영구 정지는 없음)를 준다.
     * 같은 기능을 막는 정지가 여럿이면 가장 늦게 풀리는 것(영구 정지가 먼저)을 알린다
     */
    public void require(Long userId, Restriction restriction) {
        find(userId, restriction).ifPresent(sanction -> {
            Map<String, String> fields = new LinkedHashMap<>();
            fields.put("restriction", restriction.name());
            fields.put("reason", sanction.getReason());
            if (sanction.getEndsAt() != null) {
                fields.put("endsAt", DateTimeFormatter.ISO_OFFSET_DATE_TIME.format(sanction.getEndsAt().atZone(ZoneId.systemDefault())));
            }
            throw new BusinessException(ErrorCode.RESTRICTED, ErrorCode.RESTRICTED.getMessage(), fields);
        });
    }

    /** 지금 막힌 기능 전체(운영자 회원 상세) */
    public Set<Restriction> activeRestrictions(Long userId) {
        EnumSet<Restriction> restrictions = EnumSet.noneOf(Restriction.class);
        active(userId).forEach(sanction -> restrictions.addAll(sanction.getRestrictions()));
        return restrictions;
    }

    private Optional<Sanction> find(Long userId, Restriction restriction) {
        return active(userId).stream()
                .filter(sanction -> sanction.getRestrictions().contains(restriction))
                .max(Comparator.comparing(sanction -> sanction.getEndsAt() == null ? LocalDateTime.MAX : sanction.getEndsAt()));
    }

    private List<Sanction> active(Long userId) {
        return sanctionRepository.findActive(List.of(userId), LocalDateTime.now(), SanctionType.WARNING);
    }
}
