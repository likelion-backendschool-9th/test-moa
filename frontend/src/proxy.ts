import { type NextRequest, NextResponse } from "next/server";
import { REFRESH_TOKEN_COOKIE, type Tokens, tokenCookies } from "@/lib/auth-tokens";
import { requestBackend } from "@/lib/backend-http";

/*
 * access 토큰(30분)이 만료되면 refresh 토큰으로 새 토큰 쌍을 받아 로그인을 이어 준다.
 * access 쿠키는 토큰보다 1분 먼저 만료돼서, 쿠키가 없으면 곧 만료될 것이다. 아래 matcher가 그때만 이 함수를 부른다.
 * 새 토큰은 응답 쿠키(브라우저)와 요청 쿠키(이번 렌더링·서버 액션) 양쪽에 넣는다.
 */
export async function proxy(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  if (process.env.AUTH_MODE !== "backend" || !refreshToken) return NextResponse.next();

  const result = await requestBackend<Tokens>("/api/auth/refresh", { method: "POST", body: { refreshToken } });
  /*
   * 실패해도 쿠키를 지우지 않는다. 동시에 온 요청 중 하나가 먼저 갱신하면 같은 refresh 토큰은 버려져 나머지는 실패하는데,
   * 그 실패가 먼저 성공한 쪽의 새 쿠키를 지우면 안 되기 때문이다. 이번 요청은 비로그인으로 보인다.
   * 로그아웃 전에 시작한 갱신이 로그아웃 뒤에 끝나 새 토큰을 쿠키에 넣더라도, 백엔드가 로그아웃한 세션의 토큰을 401로 막아 로그인이 되살아나지 않는다.
   * ponytail: 정말 쓸 수 없는 refresh 토큰이면 쿠키가 만료(14일)되거나 다시 로그인할 때까지 요청마다 갱신을 시도한다
   */
  if (!result.ok) return NextResponse.next();

  const cookies = tokenCookies(result.data);
  for (const { name, value } of cookies) request.cookies.set(name, value);
  const response = NextResponse.next({ request: { headers: request.headers } });
  for (const cookie of cookies) response.cookies.set(cookie);
  return response;
}

/* matcher는 빌드할 때 읽어서 변수를 쓸 수 없다. 쿠키 이름은 auth-tokens.ts의 값과 같다 */
export const config = {
  matcher: [
    {
      /* 정적 파일·이미지·파일 확장자가 있는 주소는 빼고, access 쿠키 없이 refresh 쿠키만 있을 때만 */
      source: "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
      has: [{ type: "cookie", key: "refresh_token" }],
      missing: [
        { type: "cookie", key: "access_token" },
        /* 미리 불러오기(prefetch)는 갱신하지 않는다. 실제로 이동할 때 갱신한다 */
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
