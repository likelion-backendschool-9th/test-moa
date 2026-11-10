"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { findRoleByCredentials, getMyUserId, isEmailTaken, isNicknameTaken } from "@/features/member/api";
import { restrictionNotice } from "@/features/auth/restriction";
import { backendFetch, clearTokens, getRefreshToken, isBackendAuth, saveTokens, type Tokens } from "@/lib/backend";
import type { FormState } from "@/lib/form";
import { safeNextPath } from "@/lib/next-path";
import { DEMO_ROLE_COOKIE, type Role } from "@/features/session/session";
import { validateEmail, validateName, validateNewPassword, validateNickname } from "@/features/member/validation";
import { callbackUrl, clearRestore, clearSignup, clearState, holdRestore, readRestore, readSignup, saveState } from "@/features/auth/oauth";
import {
  type LoginField,
  type SignupField,
  SOCIAL_PROVIDERS,
  type SocialSignupField,
  withNext,
} from "@/features/auth/types";

/*
 * 로그인·로그아웃·회원가입. 목업이라 시연 회원 역할로 demo-role 쿠키를 바꾸는 것이 곧 로그인이다.
 * 실제 인증을 붙일 때는 signIn과 계정 확인 부분만 바꾼다.
 */

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** 시연 전환기(DemoSwitcher)와 같은 쿠키 속성. 전환기가 덮어써야 해서 httpOnly는 쓰지 않는다 */
async function setRole(role: Role) {
  (await cookies()).set(DEMO_ROLE_COOKIE, role, { path: "/", maxAge: ONE_YEAR_SECONDS, sameSite: "lax" });
}

/** 역할을 바꾸고 돌아갈 경로로 보낸다 */
async function signIn(role: Exclude<Role, "guest">, next: FormDataEntryValue | null): Promise<never> {
  await setRole(role);
  redirect(safeNextPath(next));
}

/**
 * 로그아웃. 끝나면 홈으로 간다.
 * 실제 로그인: 백엔드에서 refresh 토큰을 버린 뒤 토큰 쿠키를 지운다. 백엔드가 꺼져 있어도 쿠키는 지운다.
 * 목업: 쿠키가 없으면 테스터로 보기 때문에 지우지 않고 guest를 넣는다
 */
export async function logout(): Promise<void> {
  if (isBackendAuth) {
    const refreshToken = await getRefreshToken();
    if (refreshToken) await backendFetch("/api/auth/logout", { method: "POST", body: { refreshToken }, withToken: false });
    await clearTokens();
    await clearState();
  } else {
    await setRole("guest");
  }
  redirect("/");
}

const text = (formData: FormData, name: string) => String(formData.get(name) ?? "");

/** 이메일 로그인. 어느 쪽이 틀렸는지는 알리지 않는다 */
export async function login(_prev: FormState<LoginField>, formData: FormData): Promise<FormState<LoginField>> {
  const email = text(formData, "email").trim();
  const password = text(formData, "password");

  const errors: Partial<Record<LoginField, string>> = {};
  const emailError = validateEmail(email);
  if (emailError) errors.email = emailError;
  if (!password) errors.password = "비밀번호를 입력해 주세요";
  if (Object.keys(errors).length > 0) return { status: "error", errors };

  if (isBackendAuth) {
    const result = await backendFetch<Tokens>("/api/auth/login", { method: "POST", body: { email, password }, withToken: false });
    /* 탈퇴 유예 계정은 되돌릴지 묻는다(#84). 틀린 계정·정지 계정·서버 오류는 백엔드 문구를 그대로 보여 준다 */
    if (!result.ok && (await holdRestore(result, safeNextPath(formData.get("next"))))) redirect("/login?restore=1");
    /* 운영자가 로그인을 막았으면 해제일과 사유를 함께 알린다(#86) */
    if (!result.ok && result.code === "RESTRICTED") return { status: "error", errors: { form: restrictionNotice(result.fields) } };
    if (!result.ok) return { status: "error", errors: { form: result.message } };
    await saveTokens(result.data);
    await clearState();
    redirect(safeNextPath(formData.get("next")));
  }

  const role = findRoleByCredentials(email, password);
  if (!role) return { status: "error", errors: { form: "이메일 또는 비밀번호가 맞지 않아요" } };
  return signIn(role, formData.get("next"));
}

/**
 * 탈퇴 되돌리기(#84). 로그인에서 받아 둔 되돌리기 토큰으로 탈퇴 유예를 풀고 로그인한다.
 * 토큰이 없거나 시간이 지났으면 로그인 화면에 안내한다
 */
export async function restoreAccount(): Promise<void> {
  const pending = await readRestore();
  if (!isBackendAuth || !pending) redirect("/login?error=restore");
  const result = await backendFetch<Tokens>("/api/auth/restore", {
    method: "POST",
    body: { restoreToken: pending.restoreToken },
    withToken: false,
  });
  await clearRestore();
  if (!result.ok) redirect("/login?error=restore");
  await saveTokens(result.data);
  redirect(pending.next);
}

/**
 * 소셜 로그인. 목록에 있는 제공자만 받는다.
 * 실제 로그인: 무작위 state를 쿠키에 두고 제공자 동의 화면으로 보낸다. 돌아오면 /auth/callback/[provider]가 이어 받는다.
 * 목업: 테스터 시연 계정으로 로그인한다
 */
export async function socialLogin(formData: FormData): Promise<void> {
  const provider = SOCIAL_PROVIDERS.find(({ id }) => id === formData.get("provider"))?.id;
  if (!provider) redirect("/login");
  if (!isBackendAuth) await signIn("tester", formData.get("next"));

  const next = safeNextPath(formData.get("next"));
  const state = crypto.randomUUID();
  const query = new URLSearchParams({ redirectUri: callbackUrl(provider), state });
  const result = await backendFetch<string>(`/api/auth/oauth/${provider}/authorize-url?${query}`, { withToken: false });
  if (!result.ok) redirect(withNext("/login", next, { error: "oauth" }));
  await saveState({ state, provider, next });
  redirect(result.data);
}

/**
 * 로그인한 회원의 소셜 계정 연동(#84). 로그인과 같은 동의 화면을 거치고, 돌아오면 콜백이 연동 API를 부른다.
 * 결과는 개인정보 수정 화면 주소의 linked·accountError로 보인다. 목업에는 연동이 없다
 */
export async function linkSocialAccount(formData: FormData): Promise<void> {
  const back = "/my/profile/edit";
  const provider = SOCIAL_PROVIDERS.find(({ id }) => id === formData.get("provider"))?.id;
  if (!provider || !isBackendAuth) redirect(back);
  const userId = await getMyUserId();
  if (userId === null) redirect(withNext("/login", back));
  const state = crypto.randomUUID();
  const query = new URLSearchParams({ redirectUri: callbackUrl(provider), state });
  const result = await backendFetch<string>(`/api/auth/oauth/${provider}/authorize-url?${query}`, { withToken: false });
  if (!result.ok) redirect(`${back}?accountError=oauth`);
  await saveState({ state, provider, next: back, link: true, userId });
  redirect(result.data);
}

/**
 * 소셜 가입의 이름 입력. 이름은 출금 예금주 확인에 써서 이메일 가입처럼 필수다. 성공하면 로그인한 채 돌아갈 곳으로 간다.
 * 실제 로그인: 쿠키의 가입 토큰(10분)과 이름으로 백엔드에 가입한다. 목업: 테스터 시연 계정으로 로그인한다
 */
export async function socialSignup(_prev: FormState<SocialSignupField>, formData: FormData): Promise<FormState<SocialSignupField>> {
  const name = text(formData, "name").trim();
  const errors: Partial<Record<SocialSignupField, string>> = {};
  const nameError = validateName(name);
  if (nameError) errors.name = nameError;
  if (formData.get("terms") !== "on" || formData.get("privacy") !== "on") {
    errors.agreements = "이용약관과 개인정보처리방침에 동의해 주세요";
  }
  if (Object.keys(errors).length > 0) return { status: "error", errors };

  if (!isBackendAuth) return signIn("tester", formData.get("next"));

  const pending = await readSignup();
  if (!pending) redirect("/login?error=expired");
  const result = await backendFetch<Tokens>("/api/auth/oauth/signup", {
    method: "POST",
    body: { signupToken: pending.signupToken, name },
    withToken: false,
  });
  if (!result.ok) {
    if (result.fields?.name) return { status: "error", errors: { name: result.fields.name } };
    if (result.code === "INVALID_SIGNUP_TOKEN") redirect("/login?error=expired");
    return { status: "error", errors: { form: result.message } };
  }
  await clearSignup();
  await saveTokens(result.data);
  redirect(pending.next);
}

/**
 * 회원가입. 성공하면 로그인 화면으로 보낸다.
 * 실제 로그인이면 백엔드에 회원을 만들고 중복은 백엔드가 확인한다. 목업이면 데이터를 만들지 않는다
 */
export async function signup(_prev: FormState<SignupField>, formData: FormData): Promise<FormState<SignupField>> {
  const name = text(formData, "name").trim();
  const nickname = text(formData, "nickname").trim();
  const email = text(formData, "email").trim();
  const password = text(formData, "password");
  const confirm = text(formData, "confirm");

  const errors: Partial<Record<SignupField, string>> = {};
  const nameError = validateName(name);
  if (nameError) errors.name = nameError;
  const nicknameError = validateNickname(nickname);
  if (nicknameError) errors.nickname = nicknameError;
  else if (!isBackendAuth && isNicknameTaken(nickname)) errors.nickname = "이미 쓰고 있는 닉네임이에요";
  const emailError = validateEmail(email);
  if (emailError) errors.email = emailError;
  else if (!isBackendAuth && isEmailTaken(email)) errors.email = "이미 가입한 이메일이에요";
  const passwordError = validateNewPassword(password, "비밀번호를 입력해 주세요");
  if (passwordError) errors.password = passwordError;
  if (!confirm) errors.confirm = "비밀번호를 한 번 더 입력해 주세요";
  else if (password && confirm !== password) errors.confirm = "비밀번호가 서로 달라요";
  if (formData.get("terms") !== "on" || formData.get("privacy") !== "on") {
    errors.agreements = "이용약관과 개인정보처리방침에 동의해 주세요";
  }
  if (Object.keys(errors).length > 0) return { status: "error", errors };

  if (isBackendAuth) {
    const result = await backendFetch("/api/auth/signup", { method: "POST", body: { name, nickname, email, password }, withToken: false });
    if (!result.ok) return { status: "error", errors: signupErrors(result.code, result.message, result.fields) };
  }

  redirect(withNext("/login", safeNextPath(formData.get("next")), { joined: "1" }));
}

/** 백엔드 가입 실패를 칸별 오류로 바꾼다. 중복은 그 칸 아래에, 칸이 없는 오류는 폼 위에 보인다 */
function signupErrors(code: string, message: string, fields?: Record<string, string>): Partial<Record<SignupField | "form", string>> {
  if (code === "EMAIL_TAKEN") return { email: message };
  if (code === "NICKNAME_TAKEN") return { nickname: message };
  if (fields && Object.keys(fields).length > 0) return fields;
  return { form: message };
}
