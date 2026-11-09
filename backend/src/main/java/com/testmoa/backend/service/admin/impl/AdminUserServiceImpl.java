package com.testmoa.backend.service.admin.impl;

import com.testmoa.backend.dto.request.SanctionCreateRequest;
import com.testmoa.backend.dto.response.AdminUserResponse;
import com.testmoa.backend.dto.response.ReportResponse;
import com.testmoa.backend.dto.response.SanctionResponse;
import com.testmoa.backend.entity.Sanction;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.entity.enums.ReportStatus;
import com.testmoa.backend.entity.enums.Restriction;
import com.testmoa.backend.entity.enums.SanctionType;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.global.security.Role;
import com.testmoa.backend.repository.RefreshTokenRepository;
import com.testmoa.backend.repository.ReportEvidenceRepository;
import com.testmoa.backend.repository.ReportRepository;
import com.testmoa.backend.repository.SanctionRepository;
import com.testmoa.backend.repository.UserRepository;
import com.testmoa.backend.service.SanctionChecker;
import com.testmoa.backend.service.admin.AdminUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminUserServiceImpl implements AdminUserService {

    static final int MAX_DAYS = 3650;

    private final UserRepository userRepository;
    private final SanctionRepository sanctionRepository;
    private final ReportRepository reportRepository;
    private final ReportEvidenceRepository evidenceRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final SanctionChecker sanctionChecker;

    /**
     * 회원 목록. 제재 이력 수·검토 대기 신고 수·지금 막힌 기능은 회원 id로 모아 한 번씩 읽는다.
     * ponytail: 필터는 읽은 뒤 메모리에서 거른다. 회원이 많아지면 쪽 나누기와 함께 쿼리로 옮긴다
     */
    @Override
    public List<AdminUserResponse> list(String q, String filter) {
        List<User> users = userRepository.findByRoleAndNicknameContainingIgnoreCaseOrderByCreatedAtDescIdDesc(
                Role.USER, q == null ? "" : q.trim());
        if (users.isEmpty()) return List.of();
        List<Long> ids = users.stream().map(User::getId).toList();
        Map<Long, Long> sanctionCounts = toMap(sanctionRepository.countByUserIds(ids));
        Map<Long, Long> pendingCounts = toMap(reportRepository.countReceivedByStatus(ids, ReportStatus.PENDING));
        Map<Long, Set<Restriction>> active = new HashMap<>();
        sanctionRepository.findActive(ids, LocalDateTime.now(), SanctionType.WARNING).forEach(sanction ->
                active.computeIfAbsent(sanction.getUser().getId(), id -> EnumSet.noneOf(Restriction.class)).addAll(sanction.getRestrictions()));

        return users.stream()
                .filter(user -> switch (filter) {
                    case "sanctioned" -> sanctionCounts.getOrDefault(user.getId(), 0L) > 0;
                    case "reported" -> pendingCounts.getOrDefault(user.getId(), 0L) > 0;
                    default -> true;
                })
                .map(user -> AdminUserResponse.row(user, sanctionCounts.getOrDefault(user.getId(), 0L),
                        pendingCounts.getOrDefault(user.getId(), 0L),
                        active.getOrDefault(user.getId(), Set.of()).stream().sorted().toList()))
                .toList();
    }

    @Override
    public AdminUserResponse get(Long userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        LocalDateTime now = LocalDateTime.now();
        List<SanctionResponse> sanctions = sanctionRepository.findByUserIdOrderByStartedAtDescIdDesc(userId).stream()
                .map(sanction -> SanctionResponse.of(sanction, now)).toList();
        List<ReportResponse> reports = reportRepository.findByReportedUserIdOrderByCreatedAtDescIdDesc(userId).stream()
                .map(report -> ReportResponse.of(report, evidenceRepository.findByReportIdOrderBySortOrderAsc(report.getId())))
                .toList();
        long pending = reports.stream().filter(report -> report.status() == ReportStatus.PENDING).count();
        return AdminUserResponse.detail(user, pending, sanctionChecker.activeRestrictions(userId).stream().sorted().toList(),
                sanctions, reports);
    }

    @Override
    @Transactional
    public SanctionResponse sanction(Long adminId, Long userId, SanctionCreateRequest request) {
        User user = userRepository.findById(userId).orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (user.getRole() == Role.ADMIN) throw fieldError("userId", "운영자는 제재할 수 없어요");
        if (user.getId().equals(adminId)) throw fieldError("userId", "자기 자신은 제재할 수 없어요");

        Set<Restriction> restrictions = request.restrictions() == null ? Set.of() : request.restrictions();
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime endsAt = null;
        switch (request.type()) {
            case WARNING -> {
                if (!restrictions.isEmpty()) throw fieldError("restrictions", "경고는 기능을 막지 않아요");
                if (request.days() != null) throw fieldError("days", "경고는 기간이 없어요");
            }
            case SUSPENSION -> {
                if (request.days() == null || request.days() < 1 || request.days() > MAX_DAYS) {
                    throw fieldError("days", "정지 기간은 1~3,650일로 적어 주세요");
                }
                if (restrictions.isEmpty()) throw fieldError("restrictions", "막을 기능을 하나 이상 골라 주세요");
                endsAt = now.plusDays(request.days());
            }
            case PERMANENT -> {
                if (restrictions.isEmpty()) throw fieldError("restrictions", "막을 기능을 하나 이상 골라 주세요");
                if (request.days() != null) throw fieldError("days", "영구 정지는 기간이 없어요");
            }
        }

        Sanction sanction = sanctionRepository.save(Sanction.builder()
                .user(user)
                .sanctionedBy(userRepository.getReferenceById(adminId))
                .type(request.type())
                .restrictions(restrictions)
                .reason(request.reason().trim())
                .startedAt(now)
                .endsAt(endsAt)
                .build());
        // 로그인을 막으면 이미 로그인한 기기도 끊는다. access 토큰은 요청마다 세션을 확인해서 바로 401이 된다
        if (restrictions.contains(Restriction.LOGIN)) refreshTokenRepository.deleteByUser(user);
        return SanctionResponse.of(sanction, now);
    }

    @Override
    @Transactional
    public SanctionResponse release(Long adminId, Long sanctionId, String reason) {
        // 제재 행을 잠가 두 운영자가 동시에 해제해도 하나만 된다
        Sanction sanction = sanctionRepository.findByIdForUpdate(sanctionId).orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        LocalDateTime now = LocalDateTime.now();
        if (!sanction.isActive(now)) throw new BusinessException(ErrorCode.SANCTION_NOT_ACTIVE);
        sanction.release(userRepository.getReferenceById(adminId), reason.trim(), now);
        return SanctionResponse.of(sanction, now);
    }

    private static Map<Long, Long> toMap(List<Object[]> rows) {
        Map<Long, Long> map = new HashMap<>();
        rows.forEach(row -> map.put((Long) row[0], (Long) row[1]));
        return map;
    }

    private static BusinessException fieldError(String field, String message) {
        return new BusinessException(ErrorCode.INVALID_INPUT, message, Map.of(field, message));
    }
}
