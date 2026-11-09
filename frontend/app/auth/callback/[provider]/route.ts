import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { callbackUrl, holdRestore, type OAuthLogin, oauthErrorKey, saveSignup, takeState } from "@/features/auth/oauth";
import { withNext } from "@/features/auth/types";
import { backendFetch, isBackendAuth, saveTokens } from "@/lib/backend";

/*
 * 제공자(구글·깃허브) 동의 화면에서 돌아오는 곳. 백엔드는 브라우저에 열려 있지 않아서(BFF) Next가 받는다.
 * state가 쿠키와 같은지 본 뒤 code를 백엔드에 넘기고, 백엔드가 제공자와 교환한다.
 * 가입한 회원이면 토큰 쿠키를 넣고 돌아갈 곳으로, 처음이면 이름 입력 화면으로 보낸다.
 */
export async function GET(request: NextRequest, { params }: RouteContext<"/auth/callback/[provider]">) {
  if (!isBackendAuth) redirect("/login");
  const { provider } = await params;
  const saved = await takeState();
  const next = saved?.next ?? "/";
  const query = request.nextUrl.searchParams;

  // 동의 화면에서 취소하면 code 없이 돌아온다. 문구 없이 로그인 화면(연동이면 시작한 화면)으로 간다
  if (saved && saved.provider === provider && query.get("state") === saved.state && !query.get("code")) {
    redirect(saved.link ? next : withNext("/login", next));
  }
  if (!saved || saved.provider !== provider || query.get("state") !== saved.state) {
    redirect(saved?.link ? `${next}?accountError=oauth` : withNext("/login", next, { error: "oauth" }));
  }

  // 로그인한 회원의 계정 연동(#84): 쿠키의 access 토큰으로 연동 API를 부르고 개인정보 수정 화면으로 돌아간다
  if (saved.link) {
    const linked = await backendFetch(`/api/users/me/accounts/${saved.provider}`, {
      method: "POST",
      body: { code: query.get("code"), redirectUri: callbackUrl(saved.provider) },
      timeoutMs: 20_000,
    });
    redirect(linked.ok ? `${next}?linked=${saved.provider}` : `${next}?accountError=${linked.code}`);
  }

  const result = await backendFetch<OAuthLogin>(`/api/auth/oauth/${saved.provider}`, {
    method: "POST",
    body: { code: query.get("code"), redirectUri: callbackUrl(saved.provider) },
    withToken: false,
    /* 백엔드가 제공자에게 2~3번(한 번에 5초까지) 묻는다. 5초에 끊으면 백엔드는 연동했는데 화면은 실패가 될 수 있다 */
    timeoutMs: 20_000,
  });
  // 탈퇴 유예 계정은 이메일 로그인과 같이 되돌릴지 묻는다(#84)
  if (!result.ok && (await holdRestore(result, next))) redirect("/login?restore=1");
  if (!result.ok) redirect(withNext("/login", next, { error: oauthErrorKey(result.code) }));

  if (result.data.signupRequired) {
    const { signupToken, email, nickname } = result.data;
    await saveSignup({ signupToken, email, nickname, next });
    redirect("/signup/social");
  }
  await saveTokens(result.data.tokens);
  redirect(next);
}
