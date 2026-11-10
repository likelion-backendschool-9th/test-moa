"use server";

import { redirect } from "next/navigation";
import { getProfile, isCurrentPassword, isNicknameTaken, unlinkAccount } from "@/features/member/api";
import { isBackendAuth } from "@/lib/backend";
import { validateName, validateNewPassword, validateNickname } from "@/features/member/validation";
import type { FormState } from "@/lib/form";

/*
 * 개인정보 수정. 지금은 목업이라 입력만 검사하고 데이터는 바꾸지 않는다.
 * 실제 API를 붙일 때는 검사 뒤 저장하는 부분만 더한다.
 */

const PATH = "/my/profile/edit";

export type ProfileField = "name" | "nickname";
export type PasswordField = "current" | "next" | "confirm";

export async function updateProfile(_prev: FormState<ProfileField>, formData: FormData): Promise<FormState<ProfileField>> {
  const profile = await getProfile(PATH);
  const name = String(formData.get("name") ?? "").trim();
  const nickname = String(formData.get("nickname") ?? "").trim();

  const errors: Partial<Record<ProfileField, string>> = {};
  const nameError = validateName(name);
  if (nameError) errors.name = nameError;
  const nicknameError = validateNickname(nickname);
  if (nicknameError) errors.nickname = nicknameError;
  else if (isNicknameTaken(nickname, profile.nickname)) errors.nickname = "이미 쓰고 있는 닉네임이에요";

  if (Object.keys(errors).length > 0) return { status: "error", errors };
  if (name === profile.name && nickname === profile.nickname) {
    return { status: "error", errors: { form: "바뀐 내용이 없어요" } };
  }
  return { status: "success", message: "개인정보를 저장했어요", submittedAt: Date.now() };
}

export async function changePassword(_prev: FormState<PasswordField>, formData: FormData): Promise<FormState<PasswordField>> {
  await getProfile(PATH);
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const errors: Partial<Record<PasswordField, string>> = {};
  if (!current) errors.current = "현재 비밀번호를 입력해 주세요";
  else if (!isCurrentPassword(current)) errors.current = "현재 비밀번호가 맞지 않아요";
  const nextError = validateNewPassword(next, "새 비밀번호를 입력해 주세요");
  if (nextError) errors.next = nextError;
  else if (isCurrentPassword(next)) errors.next = "지금 쓰는 비밀번호와 달라야 해요";
  if (!confirm) errors.confirm = "새 비밀번호를 한 번 더 입력해 주세요";
  else if (next && confirm !== next) errors.confirm = "새 비밀번호가 서로 달라요";

  if (Object.keys(errors).length > 0) return { status: "error", errors };
  return { status: "success", message: "비밀번호를 바꿨어요", submittedAt: Date.now() };
}

/** 소셜 계정 연동 해제(#84). 결과는 개인정보 수정 화면 주소의 unlinked·accountError로 보인다. 목업에는 연동이 없다 */
export async function unlinkSocialAccount(formData: FormData): Promise<void> {
  await getProfile(PATH);
  const provider = String(formData.get("provider") ?? "");
  if (!isBackendAuth || (provider !== "google" && provider !== "github")) redirect(PATH);
  const result = await unlinkAccount(provider);
  redirect(result.ok ? `${PATH}?unlinked=${provider}` : `${PATH}?accountError=${result.code}`);
}
