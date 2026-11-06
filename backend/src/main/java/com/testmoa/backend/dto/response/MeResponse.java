package com.testmoa.backend.dto.response;

import com.testmoa.backend.entity.Account;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.global.security.Provider;
import com.testmoa.backend.global.security.Role;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 내 정보. 프론트는 이 응답으로 헤더·마이페이지·구독 화면을 그린다
 *
 * @param providers    연동된 로그인 방식 (LOCAL, GOOGLE, GITHUB)
 * @param hasPassword  이메일 로그인 계정(LOCAL)이 있는지. 없으면 비밀번호 변경 대신 "비밀번호 만들기"
 * @param subscription 구독 상태. 운영자는 구독 대상이 아니라 null
 */
public record MeResponse(
        Long id,
        String name,
        String nickname,
        String email,
        String imageUrl,
        Role role,
        List<Provider> providers,
        boolean hasPassword,
        SubscriptionStatusResponse subscription
) {
    /**
     * @param active 지금 구독 중인지
     * @param plan   구독 중인 플랜 등급. 구독 중이 아니면 null
     * @param endAt  구독 만료 일시. 구독 중이 아니면 null
     */
    public record SubscriptionStatusResponse(boolean active, String plan, LocalDateTime endAt) {}

    public static MeResponse of(User user, List<Account> accounts, SubscriptionStatusResponse subscription) {
        List<Provider> providers = accounts.stream().map(Account::getProvider).toList();

        return new MeResponse(
                user.getId(),
                user.getName(),
                user.getNickname(),
                user.getEmail(),
                user.getImageUrl(),
                user.getRole(),
                providers,
                providers.contains(Provider.LOCAL),
                subscription);
    }
}
