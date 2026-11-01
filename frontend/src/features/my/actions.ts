"use server";

import { getProfile, isCurrentPassword, isNicknameTaken } from "./api";

/*
 * 개인정보 수정. 지금은 목업이라 입력만 검사하고 데이터는 바꾸지 않는다.
 * 실제 API를 붙일 때는 검사 뒤 저장하는 부분만 더한다.
 */

const PATH = "/my/profile/edit";

export type FormState<Field extends string> =
  | { status: "idle" }
  | { status: "error"; errors: Partial<Record<Field | "form", string>> }
  | { status: "success"; message: string; submittedAt: number };

export type ProfileField = "name" | "nickname";
export type PasswordField = "current" | "next" | "confirm";

const NAME_MAX = 20;
const NICKNAME_PATTERN = /^[가-힣a-zA-Z0-9]{2,12}$/;
const PASSWORD_PATTERN = /^(?=.*[a-zA-Z])(?=.*\d).{8,64}$/;

export async function updateProfile(_prev: FormState<ProfileField>, formData: FormData): Promise<FormState<ProfileField>> {
  const profile = await getProfile(PATH);
  const name = String(formData.get("name") ?? "").trim();
  const nickname = String(formData.get("nickname") ?? "").trim();

  const errors: Partial<Record<ProfileField, string>> = {};
  if (!name) errors.name = "이름을 입력해 주세요";
  else if (name.length > NAME_MAX) errors.name = `이름은 ${NAME_MAX}자까지 쓸 수 있어요`;
  if (!nickname) errors.nickname = "닉네임을 입력해 주세요";
  else if (!NICKNAME_PATTERN.test(nickname)) errors.nickname = "닉네임은 한글·영문·숫자 2~12자예요";
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
  if (!next) errors.next = "새 비밀번호를 입력해 주세요";
  else if (!PASSWORD_PATTERN.test(next)) errors.next = "영문과 숫자를 섞어 8자 이상 써 주세요";
  else if (isCurrentPassword(next)) errors.next = "지금 쓰는 비밀번호와 달라야 해요";
  if (!confirm) errors.confirm = "새 비밀번호를 한 번 더 입력해 주세요";
  else if (next && confirm !== next) errors.confirm = "새 비밀번호가 서로 달라요";

  if (Object.keys(errors).length > 0) return { status: "error", errors };
  return { status: "success", message: "비밀번호를 바꿨어요", submittedAt: Date.now() };
}
