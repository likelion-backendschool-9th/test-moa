"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { findRoleByCredentials, isEmailTaken, isNicknameTaken } from "@/features/member/api";
import type { FormState } from "@/lib/form";
import { safeNextPath } from "@/lib/next-path";
import { DEMO_ROLE_COOKIE, type Role } from "@/lib/session";
import { validateEmail, validateName, validateNewPassword, validateNickname } from "@/lib/validation";
import { type LoginField, type SignupField, SOCIAL_PROVIDERS, withNext } from "./types";

/*
 * 로그인·회원가입. 목업이라 시연 회원 역할로 demo-role 쿠키를 바꾸는 것이 곧 로그인이다.
 * 실제 인증을 붙일 때는 signIn과 계정 확인 부분만 바꾼다.
 */

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** 시연 전환기(DemoSwitcher)와 같은 속성으로 쿠키를 넣고 돌아갈 경로로 보낸다. 전환기가 덮어써야 해서 httpOnly는 쓰지 않는다 */
async function signIn(role: Exclude<Role, "guest">, next: FormDataEntryValue | null): Promise<never> {
  (await cookies()).set(DEMO_ROLE_COOKIE, role, { path: "/", maxAge: ONE_YEAR_SECONDS, sameSite: "lax" });
  redirect(safeNextPath(next));
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

  const role = findRoleByCredentials(email, password);
  if (!role) return { status: "error", errors: { form: "이메일 또는 비밀번호가 맞지 않아요" } };
  return signIn(role, formData.get("next"));
}

/** 소셜 로그인 목업. 목록에 있는 제공자만 받고, 테스터 시연 계정으로 로그인한다 */
export async function socialLogin(formData: FormData): Promise<void> {
  const provider = formData.get("provider");
  if (!SOCIAL_PROVIDERS.some(({ id }) => id === provider)) redirect("/login");
  await signIn("tester", formData.get("next"));
}

/** 회원가입. 목업이라 데이터는 만들지 않고, 성공하면 로그인 화면으로 보낸다 */
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
  else if (isNicknameTaken(nickname)) errors.nickname = "이미 쓰고 있는 닉네임이에요";
  const emailError = validateEmail(email);
  if (emailError) errors.email = emailError;
  else if (isEmailTaken(email)) errors.email = "이미 가입한 이메일이에요";
  const passwordError = validateNewPassword(password, "비밀번호를 입력해 주세요");
  if (passwordError) errors.password = passwordError;
  if (!confirm) errors.confirm = "비밀번호를 한 번 더 입력해 주세요";
  else if (password && confirm !== password) errors.confirm = "비밀번호가 서로 달라요";
  if (formData.get("terms") !== "on" || formData.get("privacy") !== "on") {
    errors.agreements = "이용약관과 개인정보처리방침에 동의해 주세요";
  }
  if (Object.keys(errors).length > 0) return { status: "error", errors };

  redirect(withNext("/login", safeNextPath(formData.get("next")), { joined: "1" }));
}
