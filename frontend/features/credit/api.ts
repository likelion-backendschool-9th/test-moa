import { buildCreditData,type CreditData,getDemoWithdrawals } from "@/demo/credit";
import { waitIfSlow } from "@/demo/mode";
import { type DemoSubscriptionPayment,getDemoSubscriptionPayments } from "@/demo/subscription";
import { requireMember } from "@/features/session/guard";
import type { Role } from "@/features/session/session";
import { connection } from "next/server";
import "server-only";
import type { CreditBalance,CreditEntry,LedgerType,Withdrawal } from "./types";

/*
 * 크레딧 데이터 접근. 지금은 목업을 돌려준다.
 * 실제 API를 붙일 때는 이 파일의 함수 본문만 바꾸고 시그니처는 유지한다.
 * 모든 함수는 비로그인이면 next 경로를 붙여 로그인으로 보낸다.
 */

async function load(next: string): Promise<CreditData> {
  const session = await requireMember(next);
  await waitIfSlow();
  /* 날짜는 요청 시각 기준이라 미리 렌더링하지 않는다 */
  await connection();
  return creditDataFor(session.role, new Date());
}

/**
 * 목업에 이 브라우저의 시연용 출금 신청과 크레딧 구독 결제를 더한 값. 신청 금액은 처리 중이라 잠긴다.
 * 마이페이지 대시보드도 같은 값을 보여 주려고 이 함수를 쓴다 (세션 확인은 부르는 쪽에서)
 */
export async function creditDataFor(role: Exclude<Role, "guest">, now: Date): Promise<CreditData> {
  const data = buildCreditData(role, now);
  const [requested, payments] = await Promise.all([getDemoWithdrawals(role), getDemoSubscriptionPayments(role)]);
  const locked = requested.reduce((sum, item) => sum + item.amount, 0);
  const paidWithCredits = payments.filter((payment) => payment.method === "credit");
  return {
    ...data,
    balance: payForSubscriptions({ ...data.balance, pendingWithdrawal: data.balance.pendingWithdrawal + locked }, paidWithCredits),
    ledger: [...paidWithCredits.map(toLedgerEntry).reverse(), ...data.ledger],
    withdrawals: [...requested, ...data.withdrawals],
  };
}

/** 이벤트 크레딧(가입 크레딧 등)은 구독 결제에만 쓰여서 먼저 쓰고, 모자란 만큼 적립 크레딧에서 뺀다 */
function payForSubscriptions(balance: CreditBalance, payments: DemoSubscriptionPayment[]): CreditBalance {
  return payments.reduce((current, { amount }) => {
    const fromSignup = Math.min(current.signup, amount);
    return { ...current, signup: current.signup - fromSignup, earned: current.earned - (amount - fromSignup) };
  }, balance);
}

const toLedgerEntry = (payment: DemoSubscriptionPayment): CreditEntry => ({
  id: payment.id,
  label: "구독 결제",
  amount: -payment.amount,
  occurredAt: payment.paidAt,
});

export async function getCreditBalance(next: string): Promise<CreditBalance> {
  return (await load(next)).balance;
}

/** 크레딧 내역, 최신순. in은 늘어난 기록, out은 줄어든 기록만 */
export async function getCreditLedger(next: string, type: LedgerType = "all", limit?: number): Promise<CreditEntry[]> {
  const { ledger } = await load(next);
  const filtered = ledger.filter((entry) => type === "all" || (type === "in" ? entry.amount > 0 : entry.amount < 0));
  return limit === undefined ? filtered : filtered.slice(0, limit);
}

/** 출금 요청, 최신순 */
export async function getWithdrawals(next: string): Promise<Withdrawal[]> {
  return (await load(next)).withdrawals;
}


import { addDemoWithdrawal } from "@/demo/credit";

export async function saveWithdrawalRequest(request: Parameters<typeof addDemoWithdrawal>[1]) {
  const session = await requireMember("/my/credits/withdrawals");
  return addDemoWithdrawal(session.role, request);
}
