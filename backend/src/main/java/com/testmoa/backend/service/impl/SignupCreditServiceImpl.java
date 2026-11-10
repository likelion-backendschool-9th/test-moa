package com.testmoa.backend.service.impl;

import com.testmoa.backend.entity.CreditLedger;
import com.testmoa.backend.entity.CreditWallet;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.global.security.Role;
import com.testmoa.backend.repository.CreditLedgerRepository;
import com.testmoa.backend.repository.CreditWalletRepository;
import com.testmoa.backend.repository.UserRepository;
import com.testmoa.backend.service.SignupCreditService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;

@Service
@Transactional
public class SignupCreditServiceImpl implements SignupCreditService {

    /** 장부에 남기는 원인. 이미 받았는지 가리는 기준이라 가입 지급과 소급 지급이 같은 값을 쓴다 */
    public static final String DESCRIPTION = "가입 크레딧";

    private final UserRepository userRepository;
    private final CreditWalletRepository creditWalletRepository;
    private final CreditLedgerRepository creditLedgerRepository;
    private final int amount;
    private final Clock clock;

    @Autowired
    public SignupCreditServiceImpl(
            UserRepository userRepository,
            CreditWalletRepository creditWalletRepository,
            CreditLedgerRepository creditLedgerRepository,
            @Value("${credit.signup-bonus.amount}") int amount
    ) {
        this(userRepository, creditWalletRepository, creditLedgerRepository, amount, Clock.systemDefaultZone());
    }

    SignupCreditServiceImpl(
            UserRepository userRepository,
            CreditWalletRepository creditWalletRepository,
            CreditLedgerRepository creditLedgerRepository,
            int amount,
            Clock clock
    ) {
        this.userRepository = userRepository;
        this.creditWalletRepository = creditWalletRepository;
        this.creditLedgerRepository = creditLedgerRepository;
        this.amount = amount;
        this.clock = clock;
    }

    @Override
    public boolean grantToExistingMember(Long userId) {
        User user = userRepository.findByIdForUpdate(userId).orElse(null);
        if (user == null || user.getRole() != Role.USER || !BACKFILL_STATUSES.contains(user.getStatus())) {
            return false;
        }
        return grant(userId);
    }

    @Override
    public boolean grant(Long userId) {
        if (amount <= 0) return false;

        creditWalletRepository.insertIfAbsent(userId, LocalDateTime.now(clock));
        CreditWallet wallet = creditWalletRepository.findLockedByUserId(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (creditLedgerRepository.existsByCreditWalletIdAndTypeAndDescription(
                wallet.getId(), CreditLedger.Type.EVENT, DESCRIPTION)) {
            return false;
        }

        wallet.grantEvent(amount);
        creditLedgerRepository.save(CreditLedger.builder()
                .creditWallet(wallet)
                .delta(amount)
                .description(DESCRIPTION)
                .type(CreditLedger.Type.EVENT)
                .build());
        return true;
    }
}
