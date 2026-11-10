"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  getLeaveNotice,
  getProfile,
  isCurrentPassword,
  isNicknameTaken,
  savePassword,
  saveProfile,
  unlinkAccount,
  withdrawAccount,
} from "@/features/member/api";
import { LEAVE_CONFIRM_TEXT, LEAVE_PENDING_WITHDRAWAL } from "@/features/member/types";
import { DEMO_ROLE_COOKIE } from "@/features/session/session";
import { clearTokens } from "@/lib/backend";
import { isBackendAuth } from "@/lib/backend";
import { validateName, validateNewPassword, validateNickname } from "@/features/member/validation";
import type { FormState } from "@/lib/form";

/*
 * 개인정보 수정. 입력을 검사한 뒤 저장한다.
 * - 목업: 데이터는 바꾸지 않고 성공 문구만 보인다
 * - 실제 로그인(AUTH_MODE=backend): 백엔드에 저장하고, 백엔드의 칸별 문구를 그 칸 아래에 보인다
 */

const PATH = "/my/profile/edit";

export type ProfileField = "name" | "nickname";
export type PasswordField = "current" | "next" | "confirm";
export type LeaveField = "password" | "confirmText";

export async function updateProfile(_prev: FormState<ProfileField>, formData: FormData): Promise<FormState<ProfileField>> {
  const profile = await getProfile(PATH);
  const name = String(formData.get("name") ?? "").trim();
  const nickname = String(formData.get("nickname") ?? "").trim();

  const errors: Partial<Record<ProfileField, string>> = {};
  const nameError = validateName(name);
  if (nameError) errors.name = nameError;
  const nicknameError = validateNickname(nickname);
  if (nicknameError) errors.nickname = nicknameError;
  else if (!isBackendAuth && isNicknameTaken(nickname, profile.nickname)) errors.nickname = "이미 쓰고 있는 닉네임이에요";

  if (Object.keys(errors).length > 0) return { status: "error", errors };
  if (name === profile.name && nickname === profile.nickname) {
    return { status: "error", errors: { form: "바뀐 내용이 없어요" } };
  }
  if (isBackendAuth) {
    const result = await saveProfile(name, nickname);
    if (!result.ok) return { status: "error", errors: pick(result.fields, { name: "name", nickname: "nickname" }, result.message) };
  }
  return { status: "success", message: "개인정보를 저장했어요", submittedAt: Date.now() };
}

/**
 * 비밀번호 변경. 소셜로만 가입해 비밀번호가 없는 회원(실제 로그인)은 현재 비밀번호 없이 만든다.
 * 실제 로그인에서는 현재 비밀번호 확인과 "지금과 같은 비밀번호" 검사를 백엔드가 한다
 */
export async function changePassword(_prev: FormState<PasswordField>, formData: FormData): Promise<FormState<PasswordField>> {
  const profile = await getProfile(PATH);
  const hasPassword = profile.hasPassword !== false;
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  /* 다른 탭에서 비밀번호를 만들어 이 화면에 현재 비밀번호 칸이 없으면, 칸 아래 오류가 숨지 않게 폼 위에 알린다 */
  if (hasPassword && !formData.has("current")) return { status: "error", errors: { form: "비밀번호가 이미 있어요. 새로고침한 뒤 다시 시도해 주세요" } };

  const errors: Partial<Record<PasswordField, string>> = {};
  if (hasPassword && !current) errors.current = "현재 비밀번호를 입력해 주세요";
  else if (!isBackendAuth && !isCurrentPassword(current)) errors.current = "현재 비밀번호가 맞지 않아요";
  const nextError = validateNewPassword(next, "새 비밀번호를 입력해 주세요");
  if (nextError) errors.next = nextError;
  else if (!isBackendAuth && isCurrentPassword(next)) errors.next = "지금 쓰는 비밀번호와 달라야 해요";
  if (!confirm) errors.confirm = "새 비밀번호를 한 번 더 입력해 주세요";
  else if (next && confirm !== next) errors.confirm = "새 비밀번호가 서로 달라요";

  if (Object.keys(errors).length > 0) return { status: "error", errors };
  if (isBackendAuth) {
    const result = await savePassword(hasPassword ? current : undefined, next);
    if (!result.ok) {
      return { status: "error", errors: pick(result.fields, { currentPassword: "current", newPassword: "next" }, result.message) };
    }
    /* 비밀번호를 처음 만들면 비밀번호 칸·탈퇴 창·계정 카드가 "비밀번호 있음"으로 바뀌어야 해서 마이페이지를 다시 읽게 한다 */
    if (!hasPassword) revalidatePath("/my", "layout");
    return {
      status: "success",
      message: hasPassword ? "비밀번호를 바꿨어요. 다른 기기에서는 다시 로그인해야 해요" : "비밀번호를 만들었어요. 이제 이메일로도 로그인할 수 있어요",
      submittedAt: Date.now(),
    };
  }
  return { status: "success", message: "비밀번호를 바꿨어요", submittedAt: Date.now() };
}

/** 소셜 계정 연동 해제(#84). 결과는 개인정보 수정 화면 주소의 unlinked·unlinkError로 보인다. 목업에는 연동이 없다 */
export async function unlinkSocialAccount(formData: FormData): Promise<void> {
  await getProfile(PATH);
  const provider = String(formData.get("provider") ?? "");
  if (!isBackendAuth || (provider !== "google" && provider !== "github")) redirect(PATH);
  const result = await unlinkAccount(provider);
  redirect(result.ok ? `${PATH}?unlinked=${provider}` : `${PATH}?unlinkError=${result.code}`);
}

/**
 * 회원 탈퇴(#84). 비밀번호(소셜로만 가입했으면 확인 문구)를 확인하고 탈퇴한 뒤 로그인 화면에 안내를 보인다.
 * - 실제 로그인: 백엔드가 30일 탈퇴 유예로 바꾸고 모든 기기의 로그인을 끊는다. 여기서는 토큰 쿠키를 지운다
 * - 목업: 데이터는 지우지 않고 로그아웃만 한다
 */
export async function leaveAccount(_prev: FormState<LeaveField>, formData: FormData): Promise<FormState<LeaveField>> {
  const notice = await getLeaveNotice(PATH);
  if (notice.pendingWithdrawal > 0) return { status: "error", errors: { form: LEAVE_PENDING_WITHDRAWAL } };

  const password = String(formData.get("password") ?? "");
  const confirmText = String(formData.get("confirmText") ?? "").trim();
  /* 화면이 비밀번호를 만들기 전 상태(확인 문구 칸)로 남아 있으면 숨은 칸 오류 대신 폼 위에 알린다 */
  if (notice.hasPassword && !formData.has("password")) return { status: "error", errors: { form: "비밀번호가 이미 있어요. 새로고침한 뒤 다시 시도해 주세요" } };
  if (notice.hasPassword && !password) return { status: "error", errors: { password: "비밀번호를 입력해 주세요" } };
  if (!notice.hasPassword && confirmText !== LEAVE_CONFIRM_TEXT) {
    return { status: "error", errors: { confirmText: `'${LEAVE_CONFIRM_TEXT}'를 그대로 입력해 주세요` } };
  }

  if (isBackendAuth) {
    const result = await withdrawAccount(notice.hasPassword ? { password } : { confirmText });
    if (!result.ok) {
      if (result.code === "CASHOUT_IN_PROGRESS") return { status: "error", errors: { form: LEAVE_PENDING_WITHDRAWAL } };
      return { status: "error", errors: pick(result.fields, { password: "password", confirmText: "confirmText" }, result.message) };
    }
    await clearTokens();
  } else {
    if (!isCurrentPassword(password)) return { status: "error", errors: { password: "비밀번호가 맞지 않아요" } };
    /* 목업 로그아웃: auth/actions의 logout과 같은 쿠키 속성으로 guest를 넣는다 */
    (await cookies()).set(DEMO_ROLE_COOKIE, "guest", { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  }
  redirect("/login?left=1");
}

/** 백엔드 칸 이름을 화면 칸 이름으로 바꾼다. 맞는 칸이 없으면 폼 위 문구로 보인다 */
function pick<F extends string>(
  fields: Record<string, string> | undefined,
  names: Record<string, F>,
  message: string,
): Partial<Record<F | "form", string>> {
  const errors: Partial<Record<F | "form", string>> = {};
  for (const [backend, field] of Object.entries(names)) if (fields?.[backend]) errors[field] = fields[backend];
  if (Object.keys(errors).length === 0) errors.form = message;
  return errors;
}
