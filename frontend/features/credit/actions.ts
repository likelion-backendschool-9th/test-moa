"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth";
import { formatWon } from "@/lib/format";
import { getCreditBalance } from "./api";
import { addDemoWithdrawal } from "./demo-requests";
import { BANKS, cashableCredits } from "./types";

/*
 * 출금 신청. 지금은 목업이라 입력을 검사한 뒤 시연용 쿠키(demo-requests.ts)에 남긴다.
 * 실제 API를 붙일 때는 addDemoWithdrawal 대신 요청을 저장한다.
 */

const PATH = "/my/credits/withdrawals";

export type WithdrawalField = "amount" | "bank" | "account" | "holder";

export type WithdrawalFormState =
  | { status: "idle" }
  | { status: "error"; errors: Partial<Record<WithdrawalField | "form", string>> }
  | { status: "success"; message: string; submittedAt: number };

const ACCOUNT_PATTERN = /^\d{10,14}$/;

export async function requestWithdrawal(_prev: WithdrawalFormState, formData: FormData): Promise<WithdrawalFormState> {
  const session = await requireMember(PATH);
  const cashable = cashableCredits(await getCreditBalance(PATH));
  if (cashable <= 0) return { status: "error", errors: { form: "출금할 수 있는 크레딧이 없어요" } };

  const amountText = String(formData.get("amount") ?? "").trim();
  const bank = String(formData.get("bank") ?? "");
  const account = String(formData.get("account") ?? "").trim();
  const holder = String(formData.get("holder") ?? "").trim();

  const errors: Partial<Record<WithdrawalField, string>> = {};
  const amount = Number(amountText);
  if (!amountText) errors.amount = "금액을 입력해 주세요";
  else if (!/^\d+$/.test(amountText)) errors.amount = "숫자만 입력해 주세요";
  else if (amount < 1) errors.amount = "1 크레딧 이상 입력해 주세요";
  else if (amount > cashable) errors.amount = `출금 가능한 크레딧(${cashable.toLocaleString("ko-KR")})보다 많아요`;

  if (!BANKS.some((name) => name === bank)) errors.bank = "은행을 골라 주세요";
  if (!account) errors.account = "계좌번호를 입력해 주세요";
  else if (!ACCOUNT_PATTERN.test(account)) errors.account = "계좌번호는 숫자 10~14자리예요";
  if (!holder) errors.holder = "예금주를 입력해 주세요";

  if (Object.keys(errors).length > 0) return { status: "error", errors };
  await addDemoWithdrawal(session.role, { amount, bank, account });
  /* 출금 내역, 크레딧 잔액, 마이페이지 대시보드가 새 잠금 금액을 보여 주게 한다 */
  revalidatePath("/my", "layout");
  return {
    status: "success",
    message: `${formatWon(amount)} 출금을 신청했어요. 운영자가 확인한 뒤 지급해요.`,
    submittedAt: Date.now(),
  };
}
