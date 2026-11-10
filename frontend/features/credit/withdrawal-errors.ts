import type { WithdrawalField } from "@/features/credit/actions";

/** 서버 요청 필드 이름 → 화면 칸 */
const SERVER_FIELD: Record<string, WithdrawalField> = {
  amount: "amount",
  bank: "bank",
  accountNumber: "account",
  accountHolder: "holder",
};

type ServerFailure = { message: string; fields?: Record<string, string> };

/**
 * 서버가 출금 신청을 거절한 이유를 화면 칸별 문구로 나눈다.
 * 칸별 오류(`fields`)는 맞는 칸 아래에 보인다. 서버 요청 필드가 화면 칸에 없으면 그 칸이 준 문구를 이어 붙여 폼 위쪽에 보인다
 * (서버의 최상위 message는 "입력값을 확인해 주세요" 같은 일반 안내라서 실제 문구가 사라지지 않게). 맞는 칸도 없고 문구도 없으면 message를 폼 위쪽에 보인다
 */
export function withdrawalErrorsFromServer({ message, fields }: ServerFailure): Partial<Record<WithdrawalField | "form", string>> {
  const errors: Partial<Record<WithdrawalField | "form", string>> = {};
  const unmatched: string[] = [];
  for (const [name, text] of Object.entries(fields ?? {})) {
    /* `toString` 같은 객체 기본 키가 칸으로 잘못 맞지 않게 자기 키만 본다 */
    if (Object.hasOwn(SERVER_FIELD, name)) errors[SERVER_FIELD[name]] = text;
    else if (text) unmatched.push(text);
  }
  if (unmatched.length > 0) errors.form = unmatched.join(" ");
  else if (Object.keys(errors).length === 0) errors.form = message;
  return errors;
}
