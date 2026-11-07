import "server-only";
import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, type Tokens, tokenCookies } from "@/lib/auth-tokens";
import { type BackendResult, type RequestOptions, requestBackend } from "@/lib/backend-http";

/*
 * 백엔드(Spring) 호출. 브라우저는 백엔드를 직접 부르지 않고, Next 서버가 쿠키의 토큰을 Bearer로 붙여 부른다(BFF).
 * 통신 자체는 backend-http.ts가 하고, 여기서는 현재 요청의 쿠키를 읽고 쓴다.
 *
 * AUTH_MODE=backend일 때만 로그인·세션이 백엔드를 쓴다. 값이 없으면 지금처럼 목업(demo-role 쿠키)이라
 * 백엔드 없이 프론트만 띄우는 개발과 e2e 테스트는 그대로 돈다.
 */

export const isBackendAuth = process.env.AUTH_MODE === "backend";

export type { BackendResult, Tokens };

type Options = Omit<RequestOptions, "token"> & {
  /** 로그인·가입·갱신은 false. 만료되거나 정지된 회원, 로그아웃한 세션의 토큰이 붙으면 백엔드가 401로 막는다 */
  withToken?: boolean;
};

/** 현재 요청 쿠키의 access 토큰을 붙여 백엔드를 부른다 */
export async function backendFetch<T>(path: string, { withToken = true, ...options }: Options = {}): Promise<BackendResult<T>> {
  const token = withToken ? (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value : undefined;
  return requestBackend<T>(path, { ...options, token });
}

/** 토큰을 httpOnly 쿠키에 넣는다. Server Action·Route Handler에서만 부른다 */
export async function saveTokens(tokens: Tokens) {
  const store = await cookies();
  for (const cookie of tokenCookies(tokens)) store.set(cookie);
}

/** 쿠키의 refresh 토큰. 로그아웃할 때 백엔드에 버리게 하려고 읽는다 */
export async function getRefreshToken(): Promise<string | undefined> {
  return (await cookies()).get(REFRESH_TOKEN_COOKIE)?.value;
}

/** 토큰 쿠키 두 개를 지운다. 백엔드는 부르지 않는다 */
export async function clearTokens() {
  const store = await cookies();
  store.delete(ACCESS_TOKEN_COOKIE);
  store.delete(REFRESH_TOKEN_COOKIE);
}
