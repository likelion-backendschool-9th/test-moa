package com.testmoa.backend.service;

import com.testmoa.backend.entity.Plan;
import com.testmoa.backend.entity.Subscription;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.entity.enums.UserStatus;
import com.testmoa.backend.global.security.Role;
import com.testmoa.backend.repository.PlanRepository;
import com.testmoa.backend.repository.SubscriptionRepository;
import com.testmoa.backend.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * "구독 중" 판정이 두 곳에 있다: 화면의 {@code SubscriptionService.getStatus}와 구독자 전용 기능의 권한 검사
 * {@code SubscriptionChecker}. 한쪽만 고치면 화면은 "구독 중"인데 API는 403이 될 수 있어서,
 * 같은 기간 배치에서 두 곳이 같은 답을 내는지 실제 DB로 확인한다(#69-S17).
 */
@SpringBootTest
@Transactional
class SubscriptionActiveConsistencyTest {

    @Autowired UserRepository userRepository;
    @Autowired PlanRepository planRepository;
    @Autowired SubscriptionRepository subscriptionRepository;
    @Autowired SubscriptionService subscriptionService;
    @Autowired SubscriptionChecker subscriptionChecker;

    private Plan plan;
    // 모든 기간의 기준 시각. 기간마다 now()를 새로 읽으면 이어 붙인 기간 사이에 아주 작은 틈이 생긴다
    private LocalDateTime base;

    private User saveUser() {
        return userRepository.save(User.builder()
                .name("한서윤")
                .nickname("t" + UUID.randomUUID().toString().substring(0, 8))
                .email(UUID.randomUUID() + "@example.com")
                .role(Role.USER)
                .status(UserStatus.ACTIVE)
                .build());
    }

    /** 지금 기준 며칠 전·후(음수=전)에 시작하고 끝나는 기간을 넣는다 */
    private void period(User user, int startDays, int endDays, boolean cancelled) {
        Subscription subscription = subscriptionRepository.save(Subscription.builder()
                .user(user).plan(plan).startAt(base.plusDays(startDays)).endAt(base.plusDays(endDays)).build());
        if (cancelled) {
            ReflectionTestUtils.setField(subscription, "status", Subscription.Status.CANCELLED);
            subscriptionRepository.save(subscription);
        }
    }

    @Test
    @DisplayName("#69-S17 이어 붙은 기간·빈틈·취소·끝난 기간·시작 전 기간에서 화면과 권한 검사가 같은 답을 낸다")
    void statusAndCheckerAgree() {
        base = LocalDateTime.now();
        plan = planRepository.save(Plan.builder()
                .tier("구독-" + UUID.randomUUID().toString().substring(0, 8))
                .cashPrice(10000).creditPrice(9000).periodDays(30).version(1).build());

        // 이름 → (기대: 구독 중인가). 기대값은 규칙 표 그대로이고, 두 판정이 모두 이 값과 같아야 한다
        Map<String, Boolean> expected = new LinkedHashMap<>();
        Map<String, User> users = new LinkedHashMap<>();
        for (String name : new String[]{"기간 없음", "지금 기간", "끝난 기간", "시작 전 기간", "취소된 지금 기간",
                "이어 붙은 기간", "빈틈 뒤 기간", "취소 뒤 미리 결제한 기간", "지금 기간과 취소된 이어 붙은 기간"}) {
            users.put(name, saveUser());
        }
        expected.put("기간 없음", false);
        expected.put("지금 기간", true);
        period(users.get("지금 기간"), -10, 20, false);
        expected.put("끝난 기간", false);
        period(users.get("끝난 기간"), -40, -10, false);
        expected.put("시작 전 기간", false);
        period(users.get("시작 전 기간"), 5, 35, false);
        expected.put("취소된 지금 기간", false);
        period(users.get("취소된 지금 기간"), -10, 20, true);
        expected.put("이어 붙은 기간", true);
        period(users.get("이어 붙은 기간"), -10, 20, false);
        period(users.get("이어 붙은 기간"), 20, 50, false);
        expected.put("빈틈 뒤 기간", true);
        period(users.get("빈틈 뒤 기간"), -10, 20, false);
        period(users.get("빈틈 뒤 기간"), 25, 55, false);
        expected.put("취소 뒤 미리 결제한 기간", false);
        period(users.get("취소 뒤 미리 결제한 기간"), -10, 20, true);
        period(users.get("취소 뒤 미리 결제한 기간"), 20, 50, false);
        expected.put("지금 기간과 취소된 이어 붙은 기간", true);
        period(users.get("지금 기간과 취소된 이어 붙은 기간"), -10, 20, false);
        period(users.get("지금 기간과 취소된 이어 붙은 기간"), 20, 50, true);

        for (Map.Entry<String, Boolean> entry : expected.entrySet()) {
            Long userId = users.get(entry.getKey()).getId();
            boolean status = subscriptionService.getStatus(userId).active();
            boolean checker = subscriptionChecker.isActive(userId);
            assertEquals(entry.getValue(), status, entry.getKey() + ": 화면(getStatus)");
            assertEquals(entry.getValue(), checker, entry.getKey() + ": 권한 검사(SubscriptionChecker)");
        }
    }
}
