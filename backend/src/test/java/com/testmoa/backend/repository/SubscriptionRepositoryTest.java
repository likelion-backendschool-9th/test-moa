package com.testmoa.backend.repository;

import com.testmoa.backend.entity.Plan;
import com.testmoa.backend.entity.Subscription;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.entity.enums.UserStatus;
import com.testmoa.backend.global.security.Role;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;

@DataJpaTest
@ActiveProfiles("test")
class SubscriptionRepositoryTest {

    @Autowired
    private SubscriptionRepository subscriptionRepository;
    @Autowired
    private PlanRepository planRepository;
    @Autowired
    private UserRepository userRepository;

    private User user() {
        return userRepository.save(User.builder()
                .name("한서윤")
                .nickname("s" + UUID.randomUUID().toString().substring(0, 8))
                .email(UUID.randomUUID() + "@example.com")
                .role(Role.USER)
                .status(UserStatus.ACTIVE)
                .build());
    }

    private Plan plan() {
        return planRepository.save(Plan.builder()
                .tier("P-" + UUID.randomUUID())
                .cashPrice(10000)
                .creditPrice(9000)
                .periodDays(30)
                .version(1)
                .build());
    }

    private Subscription period(User user, Plan plan, LocalDateTime start, LocalDateTime end) {
        return subscriptionRepository.save(Subscription.builder()
                .user(user).plan(plan).startAt(start).endAt(end).build());
    }

    @Test
    @DisplayName("#69-S6 이미 끝난 기간은 읽지 않는다(상태가 ACTIVE여도)")
    void endedPeriodsAreNotRead() {
        User user = user();
        Plan plan = plan();
        LocalDateTime now = LocalDateTime.of(2026, 12, 10, 12, 0);
        period(user, plan, now.minusDays(40), now.minusDays(10));

        List<Subscription> found = subscriptionRepository
                .findByUserIdAndStatusAndEndAtAfterOrderByStartAtAsc(user.getId(), Subscription.Status.ACTIVE, now);

        assertEquals(0, found.size());
    }

    @Test
    @DisplayName("#69-S7 취소된 기간은 읽지 않고, 나머지는 시작이 빠른 순으로 읽는다")
    void cancelledPeriodsAreNotRead() {
        User user = user();
        Plan plan = plan();
        LocalDateTime now = LocalDateTime.of(2026, 11, 25, 12, 0);
        Subscription second = period(user, plan, now.plusDays(6), now.plusDays(36));
        Subscription first = period(user, plan, now.minusDays(24), now.plusDays(6));
        Subscription cancelled = period(user, plan, now.plusDays(36), now.plusDays(66));
        ReflectionTestUtils.setField(cancelled, "status", Subscription.Status.CANCELLED);
        subscriptionRepository.flush();

        List<Subscription> found = subscriptionRepository
                .findByUserIdAndStatusAndEndAtAfterOrderByStartAtAsc(user.getId(), Subscription.Status.ACTIVE, now);

        assertEquals(List.of(first.getId(), second.getId()), found.stream().map(Subscription::getId).toList());
    }
}
