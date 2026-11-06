package com.testmoa.backend.domain.dto.response;

/**
 * 로그인·토큰 갱신 결과. Next 서버가 두 토큰을 httpOnly 쿠키에 넣는다
 *
 * @param accessToken           요청마다 Authorization: Bearer로 붙이는 토큰
 * @param refreshToken          access 토큰이 만료되면 새 토큰 쌍을 받는 데 쓰는 토큰 (한 번 쓰면 버려진다)
 * @param accessTokenExpiresIn  access 토큰 유효 시간(초). 쿠키 maxAge로 쓴다
 * @param refreshTokenExpiresIn refresh 토큰 유효 시간(초). 쿠키 maxAge로 쓴다
 */
public record TokenResponse(
        String accessToken,
        String refreshToken,
        long accessTokenExpiresIn,
        long refreshTokenExpiresIn
) {}
