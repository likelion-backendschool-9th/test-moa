package com.testmoa.backend.service.impl;

import com.testmoa.backend.dto.request.ApplicantDecisionRequest;
import com.testmoa.backend.dto.response.ApplicantResponse;
import com.testmoa.backend.dto.response.ApplicationResponse;
import com.testmoa.backend.entity.Recruitment;
import com.testmoa.backend.entity.Register;
import com.testmoa.backend.entity.enums.RecruitmentPhase;
import com.testmoa.backend.entity.enums.RecruitmentStatus;
import com.testmoa.backend.entity.enums.RegisterStatus;
import com.testmoa.backend.entity.enums.SelectionMode;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.repository.FeedbackRepository;
import com.testmoa.backend.repository.RecruitmentRepository;
import com.testmoa.backend.repository.RegisterRepository;
import com.testmoa.backend.repository.UserRepository;
import com.testmoa.backend.service.ApplicationService;
import com.testmoa.backend.service.RewardPolicy;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ApplicationServiceImpl implements ApplicationService {

    // 다시 지원을 막는 참가 상태. 참여 취소(CANCELLED)만 남은 회원은 다시 지원할 수 있다
    private static final List<RegisterStatus> BLOCKING = List.of(RegisterStatus.APPLIED, RegisterStatus.CONFIRMED, RegisterStatus.REJECTED);

    private final RecruitmentRepository recruitmentRepository;
    private final RegisterRepository registerRepository;
    private final UserRepository userRepository;
    private final FeedbackRepository feedbackRepository;

    @Override
    @Transactional
    public ApplicationResponse apply(Long userId, Long recruitmentId) {
        /* 모집글 행을 잠가 취소(#116)와 겹치지 않고, 같은 회원이 두 번 눌러도 두 번째는 첫 지원을 본다 */
        Recruitment recruitment = recruitmentRepository.findForApplyById(recruitmentId)
                .filter(item -> item.getStatus() != RecruitmentStatus.CANCELLED)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        LocalDateTime now = LocalDateTime.now();
        /* 모집 중일 때만 지원한다. 저장 상태가 RECRUITING이 아니면 마감일과 상관없이 끝난 것이다(Recruitment.phaseAt) */
        if (recruitment.phaseAt(now) != RecruitmentPhase.RECRUITING) {
            throw new BusinessException(ErrorCode.RECRUITMENT_CLOSED);
        }
        if (recruitment.getProject().getUser().getId().equals(userId)) {
            throw new BusinessException(ErrorCode.OWN_RECRUITMENT);
        }
        if (registerRepository.existsByRecruitmentIdAndUserIdAndStatusIn(recruitmentId, userId, BLOCKING)) {
            throw new BusinessException(ErrorCode.ALREADY_APPLIED);
        }

        Register register = registerRepository.save(Register.builder()
                .recruitment(recruitment)
                .user(userRepository.getReferenceById(userId))
                .build());
        if (recruitment.getSelectionMode() == SelectionMode.FIRST_COME) {
            /* 지원과 동시에 확정하므로 확정 시각을 지원 시각(저장할 때 찍힘)과 같게 둔다 */
            register.confirm(RewardPolicy.BASE_REWARD, RewardPolicy.EXTRA_REWARD, register.getAppliedAt());
        }
        registerRepository.flush();
        return new ApplicationResponse(register.getId(), recruitmentId, register.getStatus().name().toLowerCase(),
                register.getAppliedAt(), register.getConfirmedAt(), register.getBaseRewardSnapshot());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ApplicantResponse> findApplicants(Long userId, Long recruitmentId) {
        recruitmentRepository.findMineWithProject(recruitmentId, userId).orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        Set<Long> submitted = Set.copyOf(feedbackRepository.findRegisterIdsWithFeedback(recruitmentId));
        return registerRepository.findWithUserByRecruitmentId(recruitmentId).stream()
                .map(register -> new ApplicantResponse(register.getId(), register.getUser().getNickname(),
                        register.getStatus().name().toLowerCase(), register.getAppliedAt(), submitted.contains(register.getId())))
                .toList();
    }

    @Override
    @Transactional
    public void decide(Long userId, Long recruitmentId, ApplicantDecisionRequest request) {
        /* 모집글 행을 잠가 지원·모집 취소와 겹치지 않게 한다 */
        Recruitment recruitment = recruitmentRepository.findMineForUpdate(recruitmentId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (!recruitment.isSubscription() || recruitment.getSelectionMode() != SelectionMode.MANUAL
                || recruitment.phaseAt(LocalDateTime.now()) != RecruitmentPhase.RECRUITING) {
            throw new BusinessException(ErrorCode.APPLICANTS_NOT_SELECTABLE);
        }
        List<Long> ids = request.registerIds().stream().distinct().toList();
        List<Register> registers = registerRepository.findByIdInAndRecruitmentId(ids, recruitmentId);
        if (registers.size() != ids.size() || registers.stream().anyMatch(register -> register.getStatus() != RegisterStatus.APPLIED)) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "이미 처리했거나 이 모집의 지원이 아닌 지원자가 있어요");
        }
        LocalDateTime now = LocalDateTime.now();
        for (Register register : registers) {
            if ("confirmed".equals(request.status())) register.confirm(RewardPolicy.BASE_REWARD, RewardPolicy.EXTRA_REWARD, now);
            else register.reject();
        }
    }
}
