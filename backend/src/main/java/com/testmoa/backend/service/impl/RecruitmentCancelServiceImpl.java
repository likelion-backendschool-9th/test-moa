package com.testmoa.backend.service.impl;

import com.testmoa.backend.dto.response.RecruitmentCancelResponse;
import com.testmoa.backend.entity.Recruitment;
import com.testmoa.backend.entity.Register;
import com.testmoa.backend.entity.enums.RecruitmentStatus;
import com.testmoa.backend.entity.enums.RegisterStatus;
import com.testmoa.backend.entity.enums.SelectionMode;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.repository.FeedbackRepository;
import com.testmoa.backend.repository.RecruitmentRepository;
import com.testmoa.backend.repository.RegisterRepository;
import com.testmoa.backend.service.RecruitmentCancelService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class RecruitmentCancelServiceImpl implements RecruitmentCancelService {

    private final RecruitmentRepository recruitmentRepository;
    private final RegisterRepository registerRepository;
    private final FeedbackRepository feedbackRepository;

    /**
     * 모집 중: 확정 테스터가 없으면 사유 없이 취소한다. 선착순 모집은 지원과 함께 확정되므로 확정 테스터가 있어도 취소한다(11-07 팀 결정).
     * 테스트 중: 사유가 있어야 취소한다. 종료·취소된 모집은 취소할 수 없다.
     * 취소하면 대기 지원과 피드백을 내지 않은 확정 테스터는 참여 취소가 되고, 피드백을 낸 테스터는 확정으로 남는다
     */
    @Override
    @Transactional
    public RecruitmentCancelResponse cancel(Long userId, Long recruitmentId, String reason) {
        Recruitment recruitment = recruitmentRepository.findMineForUpdate(recruitmentId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        LocalDateTime now = LocalDateTime.now();
        List<Register> active = registerRepository.findByRecruitmentIdAndStatusIn(
                recruitmentId, List.of(RegisterStatus.APPLIED, RegisterStatus.CONFIRMED));

        String savedReason = switch (phaseOf(recruitment, now)) {
            case RECRUITING -> {
                boolean hasConfirmed = active.stream().anyMatch(item -> item.getStatus() == RegisterStatus.CONFIRMED);
                if (hasConfirmed && recruitment.getSelectionMode() != SelectionMode.FIRST_COME) {
                    throw new BusinessException(ErrorCode.RECRUITMENT_NOT_CANCELLABLE, "확정된 테스터가 있어 취소할 수 없어요");
                }
                yield null;
            }
            case TESTING -> {
                if (reason == null || reason.isBlank()) {
                    throw new BusinessException(ErrorCode.INVALID_INPUT, ErrorCode.INVALID_INPUT.getMessage(),
                            Map.of("reason", "취소 사유를 적어 주세요"));
                }
                yield reason;
            }
            case CLOSED -> throw new BusinessException(ErrorCode.RECRUITMENT_NOT_CANCELLABLE);
        };

        Set<Long> submitted = new HashSet<>(feedbackRepository.findRegisterIdsWithFeedback(recruitmentId));
        int cancelled = 0;
        int kept = 0;
        for (Register register : active) {
            if (register.getStatus() == RegisterStatus.CONFIRMED && submitted.contains(register.getId())) {
                kept++;
            } else {
                register.cancel();
                cancelled++;
            }
        }
        recruitment.cancel(savedReason, now);
        return new RecruitmentCancelResponse(recruitment.getId(), "cancelled", recruitment.getCancelReason(),
                recruitment.getCancelledAt(), cancelled, kept);
    }

    private enum Phase { RECRUITING, TESTING, CLOSED }

    // 저장된 상태는 취소 여부만 뜻하고, 모집 중·테스트 중·종료는 마감일로 계산한다(README 정한 것 11).
    // 저장 상태가 RECRUITING이 아니면 마감일과 상관없이 끝난 것으로 본다. Recruitment.cancel()의 조건과 같아 500 대신 409로 끝난다
    private Phase phaseOf(Recruitment recruitment, LocalDateTime now) {
        if (recruitment.getStatus() != RecruitmentStatus.RECRUITING) return Phase.CLOSED;
        if (now.isBefore(recruitment.getRecruitDeadline())) return Phase.RECRUITING;
        return now.isBefore(recruitment.getFeedbackDeadline()) ? Phase.TESTING : Phase.CLOSED;
    }
}
