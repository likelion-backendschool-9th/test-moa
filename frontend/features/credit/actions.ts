"use server";

import {
  getCreditBalance,
  getAdminWithdrawal as getWithdrawal,
  isWithdrawalKey,
  saveAdminWithdrawalReview,
  saveWithdrawalRequest,
  submitServerWithdrawal,
} from "@/features/credit/api";
import { withdrawalsHref } from "@/features/credit/paths";
import {
  BANKS,
  cashableCredits,
  isRejectReason,
  isWithdrawalDecision,
  REVIEW_MEMO_MAX_LENGTH,
  type RequestFormState,
  type WithdrawalReview,
} from "@/features/credit/types";
import { assertAdmin, requireMember } from "@/features/session/guard";
import { isBackendAuth } from "@/lib/backend";
import { formatWon } from "@/lib/format";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/*
 * 출금 신청. 입력을 검사한 뒤 `AUTH_MODE=backend`에서는 서버에 신청하고(#206), 아니면 시연용 쿠키(demo/credit.ts)에 남긴다.
 */

const PATH = "/my/credits/withdrawals";

export type WithdrawalField = "amount" | "bank" | "account" | "holder";

export type WithdrawalFormState =
  | { status: "idle" }
  | { status: "error"; errors: Partial<Record<WithdrawalField | "form", string>> }
  | { status: "success"; message: string; submittedAt: number };

const ACCOUNT_PATTERN = /^\d{10,14}$/;

/** 서버 요청 필드 이름 → 화면 칸 */
const SERVER_FIELD: Record<string, WithdrawalField> = {
  amount: "amount",
  bank: "bank",
  accountNumber: "account",
  accountHolder: "holder",
};

function serverErrors({ message, fields }: { message: string; fields?: Record<string, string> }) {
  const errors: Partial<Record<WithdrawalField | "form", string>> = {};
  for (const [name, text] of Object.entries(fields ?? {})) {
    const field = SERVER_FIELD[name];
    if (field) errors[field] = text;
  }
  if (Object.keys(errors).length === 0) errors.form = message;
  return errors;
}

export async function requestWithdrawal(_prev: WithdrawalFormState, formData: FormData): Promise<WithdrawalFormState> {
  await requireMember(PATH);
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
  if (isBackendAuth) {
    /* 화면의 검사를 지나도 서버가 거절할 수 있다(다른 창에서 잔액이 바뀐 경우 등). 칸별 문구가 있으면 그 칸에, 아니면 폼 위에 보인다 */
    const result = await submitServerWithdrawal({ amount, bank, accountNumber: account, accountHolder: holder });
    if (!result.ok) return { status: "error", errors: serverErrors(result) };
  } else {
    await saveWithdrawalRequest({ amount, bank, account });
  }
  /* 출금 내역, 크레딧 잔액, 마이페이지 대시보드가 새 잠금 금액을 보여 주게 한다 */
  revalidatePath("/my", "layout");
  return {
    status: "success",
    message: `${formatWon(amount)} 출금을 신청했어요. 운영자가 확인한 뒤 지급해요.`,
    submittedAt: Date.now(),
  };
}

/**
 * 출금 처리. 신고 처리와 같은 이유로 권한을 다시 확인한다.
 * 반려는 사유가 있어야 하고, "기타"는 메모도 있어야 한다.
 * 메모는 반려라면 사유와 관계없이 회원에게 그대로 보이는 메모로 남긴다.
 * 막히면 오류만 돌려주고 페이지를 옮기지 않아서, 고른 값과 메모가 화면에 그대로 남는다(useActionState).
 * 처리하면 목록에 요청 키를 넘기고, 목록은 그 요청이 실제로 처리됐는지 확인한 뒤 금액을 데이터에서 꺼낸다.
 */
export async function processWithdrawal(_prev: RequestFormState, formData: FormData): Promise<RequestFormState> {
  await assertAdmin();
  const withdrawalKey = String(formData.get("withdrawalKey") ?? "");
  if (!isWithdrawalKey(withdrawalKey)) redirect(withdrawalsHref());

  const decision = formData.get("decision");
  if (!isWithdrawalDecision(decision)) return { error: "decision" };
  let review: WithdrawalReview = { decision, memo: "", processedAt: new Date().toISOString() };
  if (decision === "rejected") {
    const reason = formData.get("reason");
    if (!isRejectReason(reason)) return { error: "reason" };
    const memo = String(formData.get("memo") ?? "").trim().slice(0, REVIEW_MEMO_MAX_LENGTH);
    if (reason === "other" && !memo) return { error: "note" };
    review = { ...review, reason, memo };
  }

  const tab = formData.get("tab") === "done" ? "done" : undefined;

  /* 이미 처리한 요청은 결과를 바꾸지 않는다. 새로 불러와 결과 모달을 보여 준다 */
  const { withdrawal } = await getWithdrawal(withdrawalKey);
  if (!withdrawal || withdrawal.review) redirect(withdrawalsHref({ tab, open: withdrawalKey }));

  if (!(await saveAdminWithdrawalReview(withdrawalKey, review))) return { error: "memo" };
  redirect(withdrawalsHref({ tab, processed: withdrawalKey }));
}
