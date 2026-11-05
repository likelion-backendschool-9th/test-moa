import "server-only";
import { cookies } from "next/headers";

/*
 * 백엔드(Spring) 호출. 브라우저는 백엔드를 직접 부르지 않고, Next 서버가 쿠키의 토큰을 Bearer로 붙여 부른다(BFF).
 *
 * AUTH_MODE=backend일 때만 로그인·세션이 백엔드를 쓴다. 값이 없으면 지금처럼 목업(demo-role 쿠키)이라
 * 백엔드 없이 프론트만 띄우는 개발과 e2e 테스트는 그대로 돈다.
 */

export const isBackendAuth = process.env.AUTH_MODE === "backend";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";

export type BackendError = {
  ok: false;
  status: number;
  /** 백엔드 ErrorCode 이름 (예: INVALID_CREDENTIALS). 백엔드에 닿지 못하면 BACKEND_UNAVAILABLE */
  code: string;
  message: string;
  /** 입력 칸별 오류 문구 */
  fields?: Record<string, string>;
};

export type BackendResult<T> = { ok: true; data: T } | BackendError;

type Options = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  /** 로그인·가입·갱신은 false. 만료되거나 정지된 회원의 토큰이 붙으면 백엔드가 401로 막는다 */
  withToken?: boolean;
};

/** 백엔드를 부르고 ApiResponse를 성공·실패로 나눠 돌려준다. 백엔드가 꺼져 있어도 던지지 않는다 */
export async function backendFetch<T>(path: string, { method = "GET", body, withToken = true }: Options = {}): Promise<BackendResult<T>> {
  const token = withToken ? (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value : undefined;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${BACKEND_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    return { ok: false, status: 503, code: "BACKEND_UNAVAILABLE", message: "잠시 후 다시 시도해 주세요" };
  }

  const json = await response.json().catch(() => null);
  if (response.ok && json?.success) return { ok: true, data: json.data as T };
  return {
    ok: false,
    status: response.status,
    code: json?.error?.code ?? "INTERNAL_ERROR",
    message: json?.error?.message ?? "잠시 후 다시 시도해 주세요",
    fields: json?.error?.fields,
  };
}

/** 백엔드 로그인·갱신 응답 (TokenResponse) */
export type Tokens = {
  accessToken: string;
  refreshToken: string;
  /** 초 */
  accessTokenExpiresIn: number;
  /** 초 */
  refreshTokenExpiresIn: number;
};

/**
 * 토큰을 httpOnly 쿠키에 넣는다. Server Action·Route Handler에서만 부른다.
 * 쿠키 수명을 토큰 수명과 같게 둬서, access 쿠키가 없으면 곧 만료된 것으로 볼 수 있다
 */
export async function saveTokens(tokens: Tokens) {
  const store = await cookies();
  const base = { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" } as const;
  store.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, { ...base, maxAge: tokens.accessTokenExpiresIn });
  store.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, { ...base, maxAge: tokens.refreshTokenExpiresIn });
}
