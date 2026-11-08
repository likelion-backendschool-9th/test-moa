package com.testmoa.backend.service.impl;

import com.testmoa.backend.dto.response.ApplicationResponse;
import com.testmoa.backend.entity.Recruitment;
import com.testmoa.backend.entity.Register;
import com.testmoa.backend.entity.enums.RecruitmentStatus;
import com.testmoa.backend.entity.enums.RegisterStatus;
import com.testmoa.backend.entity.enums.SelectionMode;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
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

@Service
@RequiredArgsConstructor
public class ApplicationServiceImpl implements ApplicationService {

    // 다시 지원을 막는 참가 상태. 참여 취소(CANCELLED)만 남은 회원은 다시 지원할 수 있다
    private static final List<RegisterStatus> BLOCKING = List.of(RegisterStatus.APPLIED, RegisterStatus.CONFIRMED, RegisterStatus.REJECTED);

    private final RecruitmentRepository recruitmentRepository;
    private final RegisterRepository registerRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public ApplicationResponse apply(Long userId, Long recruitmentId) {
        /* 모집글 행을 잠가 취소(#116)와 겹치지 않고, 같은 회원이 두 번 눌러도 두 번째는 첫 지원을 본다 */
        Recruitment recruitment = recruitmentRepository.findForApplyById(recruitmentId)
                .filter(item -> item.getStatus() != RecruitmentStatus.CANCELLED)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        LocalDateTime now = LocalDateTime.now();
        /* 모집 중은 모집 마감 전이다(README 정한 것 11). 저장 상태가 RECRUITING이 아니면 마감으로 본다 */
        if (recruitment.getStatus() != RecruitmentStatus.RECRUITING || !now.isBefore(recruitment.getRecruitDeadline())) {
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
}
