package com.testmoa.backend.service;

import com.testmoa.backend.entity.enums.UserStatus;
import com.testmoa.backend.global.security.Role;
import com.testmoa.backend.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * 이미 가입한 회원에게 가입 크레딧을 한 번 지급하는 일회성 실행기(#255).
 * credit.signup-bonus.backfill 이 true 일 때만 만들어져 서버 시작 때 돈다. 지급한 뒤에는 설정을 끈다.
 * 켜 둔 채 다시 시작해도 이미 받은 회원은 건너뛰어서 중복 지급되지 않는다.
 * 트랜잭션 밖에서 회원마다 지급해 한 회원이 실패해도 나머지는 계속한다
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "credit.signup-bonus.backfill", havingValue = "true")
public class SignupCreditBackfillRunner implements ApplicationRunner {

    /** 관리자·탈퇴 유예·파기 회원은 대상이 아니다. 정지 중인 회원은 받는다 */
    static final List<UserStatus> TARGET_STATUSES = List.of(UserStatus.ACTIVE, UserStatus.SUSPENDED);

    private final UserRepository userRepository;
    private final SignupCreditService signupCreditService;

    public SignupCreditBackfillRunner(UserRepository userRepository, SignupCreditService signupCreditService) {
        this.userRepository = userRepository;
        this.signupCreditService = signupCreditService;
    }

    @Override
    public void run(ApplicationArguments args) {
        int granted = 0;
        int skipped = 0;
        int failed = 0;
        for (Long userId : userRepository.findIdsByRoleAndStatusIn(Role.USER, TARGET_STATUSES)) {
            try {
                if (signupCreditService.grant(userId)) granted++;
                else skipped++;
            } catch (RuntimeException e) {
                failed++;
                log.error("가입 크레딧 소급 지급 실패 userId={}", userId, e);
            }
        }
        log.info("가입 크레딧 소급 지급 끝: 지급 {}명, 건너뜀 {}명, 실패 {}명", granted, skipped, failed);
    }
}
