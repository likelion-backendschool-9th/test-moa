package com.testmoa.backend.repository;

import com.testmoa.backend.entity.Feedback;
import com.testmoa.backend.entity.Project;
import com.testmoa.backend.entity.Recruitment;
import com.testmoa.backend.entity.Register;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.entity.enums.FeedbackStatus;
import com.testmoa.backend.entity.enums.RegisterStatus;
import com.testmoa.backend.global.security.Role;
import com.testmoa.backend.entity.enums.SelectionMode;
import com.testmoa.backend.entity.enums.UserStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jpa.test.autoconfigure.AutoConfigureTestEntityManager;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;

@DataJpaTest
@AutoConfigureTestEntityManager
class RegisterRepositoryTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 11, 5, 12, 0);

    @Autowired
    private RegisterRepository registerRepository;
    @Autowired
    private org.springframework.boot.jpa.test.autoconfigure.TestEntityManager entityManager;

    @Test
    @DisplayName("#66-S3 승인 대기는 참가당 1회·SUBMITTED만")
    void sumsPendingRewardOncePerSubmittedRegister() {
        User tester = persistTester("pending-once@example.com");
        Register register = persistConfirmedRegister(tester, 1000, 350);
        persistSubmittedFeedback(register, "항목1");
        persistSubmittedFeedback(register, "항목2");
        entityManager.flush();
        entityManager.clear();

        Integer pending = sumPending(tester);

        assertEquals(1350, pending);
    }

    @Test
    @DisplayName("#66-S3 REPORTED만 있으면 승인 대기는 0")
    void excludesReportedOnly() {
        User tester = persistTester("pending-reported@example.com");
        Register register = persistConfirmedRegister(tester, 1000, 350);
        Feedback feedback = persistSubmittedFeedback(register, "신고될 내용");
        feedback.report("신고 사유");
        entityManager.flush();
        entityManager.clear();

        assertEquals(0, sumPending(tester));
    }

    @Test
    @DisplayName("#66-S3 SUBMITTED와 REPORTED가 섞이면 참가 전체를 승인 대기에서 제외")
    void excludesWhenSubmittedAndReportedMixed() {
        User tester = persistTester("pending-mixed@example.com");
        Register register = persistConfirmedRegister(tester, 1000, 350);
        persistSubmittedFeedback(register, "정상 항목");
        Feedback reported = persistSubmittedFeedback(register, "신고된 항목");
        reported.report("신고 사유");
        entityManager.flush();
        entityManager.clear();

        assertEquals(0, sumPending(tester));
    }

    @Test
    @DisplayName("#66-S3 SUBMITTED와 EXCLUDED가 섞여도 참가 전체를 승인 대기에서 제외 (고침 #85)")
    void excludesWhenSubmittedAndExcludedMixed() {
        User tester = persistTester("pending-excluded@example.com");
        Register register = persistConfirmedRegister(tester, 1000, 350);
        persistSubmittedFeedback(register, "정상 항목");
        Feedback excluded = persistSubmittedFeedback(register, "보상 제외된 항목");
        excluded.report("신고 사유");
        excluded.exclude();
        entityManager.flush();
        entityManager.clear();

        assertEquals(0, sumPending(tester));
    }

    @Test
    @DisplayName("#66-S4 취소된 참가는 승인 대기에서 제외")
    void excludesCancelledRegister() {
        User tester = persistTester("pending-cancelled@example.com");
        Register register = persistConfirmedRegister(tester, 1000, 350);
        persistSubmittedFeedback(register, "제출 후 취소");
        register.cancel();
        entityManager.flush();
        entityManager.clear();

        assertEquals(0, sumPending(tester));
    }

    private Integer sumPending(User tester) {
        return registerRepository.sumPendingRewardByUserId(
                tester.getId(),
                RegisterStatus.CONFIRMED,
                FeedbackStatus.SUBMITTED,
                FeedbackStatus.REPORTED
        );
    }

    private User persistTester(String email) {
        User user = User.builder()
                .nickname("tester")
                .email(email)
                .role(Role.USER)
                .status(UserStatus.ACTIVE)
                .build();
        return entityManager.persist(user);
    }

    private Register persistConfirmedRegister(User tester, int base, int extra) {
        User owner = User.builder()
                .nickname("dev")
                .email("dev-" + tester.getEmail())
                .role(Role.USER)
                .status(UserStatus.ACTIVE)
                .build();
        entityManager.persist(owner);

        Project project = Project.builder()
                .user(owner)
                .title("앱")
                .description("설명")
                .build();
        entityManager.persist(project);

        Recruitment recruitment = Recruitment.builder()
                .project(project)
                .title("모집")
                .recruitDeadline(NOW.plusDays(1))
                .feedbackDeadline(NOW.plusDays(3))
                .selectionMode(SelectionMode.FIRST_COME)
                .build();
        entityManager.persist(recruitment);

        Register register = Register.builder()
                .recruitment(recruitment)
                .user(tester)
                .build();
        entityManager.persist(register);
        register.confirm(base, extra, NOW);
        return register;
    }

    private Feedback persistSubmittedFeedback(Register register, String content) {
        Feedback feedback = Feedback.builder()
                .register(register)
                .content(content)
                .submittedAt(NOW)
                .build();
        return entityManager.persist(feedback);
    }
}
