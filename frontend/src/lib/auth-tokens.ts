/*
 * 로그인 토큰 쿠키. backend.ts(서버 액션·서버 컴포넌트)와 proxy.ts(토큰 갱신)가 함께 쓴다.
 * proxy에서도 읽어야 해서 "server-only"와 next/headers를 쓰지 않는다.
 */

export const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";

/** 백엔드 로그인·갱신 응답 (TokenResponse) */
export type Tokens = {
  accessToken: string;
  refreshToken: string;
  /** 초 */
  accessTokenExpiresIn: number;
  /** 초 */
  refreshTokenExpiresIn: number;
};

type TokenCookie = {
  name: string;
  value: string;
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: "/";
  maxAge: number;
};

/**
 * 토큰을 넣을 httpOnly 쿠키 두 개.
 * 쿠키 수명을 토큰 수명과 같게 둬서, access 쿠키가 없으면 만료된 것으로 보고 proxy가 갱신한다
 */
export function tokenCookies(tokens: Tokens): TokenCookie[] {
  const base = { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" } as const;
  return [
    { ...base, name: ACCESS_TOKEN_COOKIE, value: tokens.accessToken, maxAge: tokens.accessTokenExpiresIn },
    { ...base, name: REFRESH_TOKEN_COOKIE, value: tokens.refreshToken, maxAge: tokens.refreshTokenExpiresIn },
  ];
}
