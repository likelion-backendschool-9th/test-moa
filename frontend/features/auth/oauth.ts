import "server-only";
import { cookies } from "next/headers";
import type { Tokens } from "@/lib/backend";
import type { SocialProviderId } from "@/features/auth/types";

/*
 * 소셜 로그인(OAuth) 중간 상태를 담는 httpOnly 쿠키 두 개.
 * - oauth_state: 동의 화면으로 보내기 전에 만든 무작위 state. 돌아온 주소의 state와 같아야 받아 준다(CSRF 방지)
 * - oauth_signup: 처음 온 사람이 이름을 입력하는 동안 백엔드의 가입 토큰(10분)과 보여 줄 이메일·닉네임
 */

const OAUTH_STATE_COOKIE = "oauth_state";
const OAUTH_SIGNUP_COOKIE = "oauth_signup";
/* 탈퇴 유예 회원이 로그인하면 백엔드가 준 되돌리기 토큰(10분)을 담는다(#84). 주소에 토큰을 남기지 않으려고 쿠키에 둔다 */
const RESTORE_COOKIE = "withdrawal_restore";
const TEN_MINUTES = 60 * 10;

/** 백엔드 소셜 로그인 응답 (OAuthLoginResponse) */
export type OAuthLogin =
  | { signupRequired: false; tokens: Tokens }
  | { signupRequired: true; signupToken: string; email: string; nickname: string };

/**
 * link: 로그인이 아니라 로그인한 회원의 계정 연동(개인정보 수정 화면에서 시작).
 * userId: 연동을 시작한 회원. 돌아왔을 때 지금 로그인한 회원과 같을 때만 연동한다(공용 PC에서 다른 회원에 붙지 않게)
 */
type PendingState = { state: string; provider: SocialProviderId; next: string; link?: boolean; userId?: number };
export type PendingSignup = { signupToken: string; email: string; nickname: string; next: string };
/** purgeAt: 계정 삭제(개인정보 파기) 예정 일시. nickname: 되돌리기 창에서 부를 이름 */
export type PendingRestore = { restoreToken: string; purgeAt: string; nickname: string; next: string };

/* sameSite lax: 제공자에서 돌아오는 이동(최상위 GET)에도 쿠키가 실린다 */
const cookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: TEN_MINUTES,
} as const;

/** 제공자가 돌려보낼 주소. 제공자 앱에 등록한 주소와 글자까지 같아야 한다 */
export function callbackUrl(provider: SocialProviderId): string {
  return new URL(`/auth/callback/${provider}`, process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").toString();
}

export async function saveState(pending: PendingState) {
  (await cookies()).set(OAUTH_STATE_COOKIE, JSON.stringify(pending), cookieOptions);
}

/** 저장한 state를 꺼내고 지운다. 한 번만 쓸 수 있다 */
export async function takeState(): Promise<PendingState | undefined> {
  const store = await cookies();
  const value = store.get(OAUTH_STATE_COOKIE)?.value;
  store.delete(OAUTH_STATE_COOKIE);
  return parse<PendingState>(value);
}

/** 로그아웃·로그인할 때 남은 state를 버린다. 앞 사람이 시작한 연동이 다음 사람 계정으로 이어지지 않게 한다 */
export async function clearState() {
  (await cookies()).delete(OAUTH_STATE_COOKIE);
}

export async function saveSignup(pending: PendingSignup) {
  (await cookies()).set(OAUTH_SIGNUP_COOKIE, JSON.stringify(pending), cookieOptions);
}

export async function readSignup(): Promise<PendingSignup | undefined> {
  return parse<PendingSignup>((await cookies()).get(OAUTH_SIGNUP_COOKIE)?.value);
}

export async function clearSignup() {
  (await cookies()).delete(OAUTH_SIGNUP_COOKIE);
}

export async function saveRestore(pending: PendingRestore) {
  (await cookies()).set(RESTORE_COOKIE, JSON.stringify(pending), cookieOptions);
}

export async function readRestore(): Promise<PendingRestore | undefined> {
  return parse<PendingRestore>((await cookies()).get(RESTORE_COOKIE)?.value);
}

export async function clearRestore() {
  (await cookies()).delete(RESTORE_COOKIE);
}

/** 로그인이 403 WITHDRAWAL_PENDING이면 되돌리기 토큰을 쿠키에 두고 true. 로그인 화면이 탈퇴를 취소할지 창으로 묻는다 */
export async function holdRestore(error: { code: string; fields?: Record<string, string> }, next: string): Promise<boolean> {
  const restoreToken = error.fields?.restoreToken;
  if (error.code !== "WITHDRAWAL_PENDING" || !restoreToken) return false;
  await saveRestore({ restoreToken, purgeAt: error.fields?.purgeAt ?? "", nickname: error.fields?.nickname ?? "", next });
  return true;
}

function parse<T>(value: string | undefined): T | undefined {
  if (!value) return undefined;
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

/** 로그인 화면에 보일 소셜 로그인 실패 문구. 주소에는 키만 넣어 남이 만든 문구가 보이지 않게 한다 */
export const OAUTH_ERRORS = {
  oauth: "소셜 로그인에 실패했어요. 다시 시도해 주세요",
  suspended: "이용이 정지된 계정이에요",
  email: "확인된 이메일이 없는 계정이에요. 소셜 계정에서 이메일을 확인한 뒤 다시 시도해 주세요",
  expired: "가입 시간이 지났어요. 소셜 로그인을 다시 해 주세요",
  linkRequired: "이미 이메일로 가입한 계정이에요. 이메일로 로그인한 뒤 마이페이지에서 연동해 주세요",
  providerLinked: "같은 이메일 회원에 이 서비스의 다른 계정이 이미 연동돼 있어요. 연동된 계정으로 로그인해 주세요",
  restore: "되돌리기 시간이 지났어요. 다시 로그인해 주세요",
} as const;

export type OAuthErrorKey = keyof typeof OAUTH_ERRORS;

/** 백엔드 에러 코드를 로그인 화면 문구 키로 */
export function oauthErrorKey(code: string): OAuthErrorKey {
  if (code === "SUSPENDED") return "suspended";
  if (code === "OAUTH_EMAIL_REQUIRED") return "email";
  if (code === "INVALID_SIGNUP_TOKEN") return "expired";
  if (code === "EMAIL_ACCOUNT_EXISTS") return "linkRequired";
  if (code === "PROVIDER_ALREADY_LINKED") return "providerLinked";
  return "oauth";
}
