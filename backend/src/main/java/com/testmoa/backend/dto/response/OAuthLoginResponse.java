package com.testmoa.backend.dto.response;

/**
 * 소셜 로그인 결과. 가입한 회원이면 tokens, 처음이면 signupRequired와 이름 입력 화면에서 쓸 값이 온다
 *
 * @param signupRequired 처음 온 사람이라 이름을 받아 가입해야 하는지
 * @param tokens         로그인 토큰. 가입이 필요하면 null
 * @param signupToken    가입할 때 다시 보내는 토큰(10분). 로그인했으면 null
 * @param email          가입할 이메일(제공자가 확인한 이메일). 로그인했으면 null
 * @param nickname       가입하면 쓸 닉네임. 로그인했으면 null
 */
public record OAuthLoginResponse(
        boolean signupRequired,
        TokenResponse tokens,
        String signupToken,
        String email,
        String nickname
) {
    public static OAuthLoginResponse loggedIn(TokenResponse tokens) {
        return new OAuthLoginResponse(false, tokens, null, null, null);
    }

    public static OAuthLoginResponse signupRequired(String signupToken, String email, String nickname) {
        return new OAuthLoginResponse(true, null, signupToken, email, nickname);
    }
}
