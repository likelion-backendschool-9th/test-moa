import {
  addDemoWithdrawal,
  buildCreditData,
  buildWithdrawals,
  type CreditData,
  getDemoWithdrawals,
  readWithdrawalReviews,
  saveWithdrawalReview,
  WITHDRAWAL_KEYS,
} from "@/demo/credit";
import { getDemoDataMode, waitIfSlow } from "@/demo/mode";
import { type DemoSubscriptionPayment, getDemoSubscriptionPayments } from "@/demo/subscription";
import { type ListTab } from "@/features/credit/paths";
import type { CreditBalance, CreditEntry, LedgerType, Withdrawal, WithdrawalReview } from "@/features/credit/types";
import { type WithdrawalRequest } from "@/features/credit/types";
import { assertAdmin, requireMember } from "@/features/session/guard";
import type { Role } from "@/features/session/session";
import { connection } from "next/server";
import "server-only";

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

export async function saveWithdrawalRequest(request: Parameters<typeof addDemoWithdrawal>[1]) {
  const session = await requireMember("/my/credits/withdrawals");
  return addDemoWithdrawal(session.role, request);
}

export { DEMO_ADMIN_WITHDRAWALS_COOKIE } from "@/demo/credit";

/** 운영자 출금 목록. 일반 회원의 출금 신청 조회와 구분한다. */
async function loadAdminWithdrawals() {
  await assertAdmin();
  const mode = await getDemoDataMode();
  if (mode === "slow") await new Promise((resolve) => setTimeout(resolve, 1500));
  await connection();
  const now = new Date();
  if (mode === "empty") return { now, withdrawals: [] as WithdrawalRequest[] };
  const reviews = await readWithdrawalReviews();
  const withdrawals = buildWithdrawals(now).map((request) => request.review ? request : { ...request, review: reviews[request.id] });
  return { now, withdrawals };
}

const byOldest = (a: { createdAt: string }, b: { createdAt: string }) => a.createdAt.localeCompare(b.createdAt);

/** 상세 주소의 출금 요청 키가 있는 키인지. isReportKey와 같은 용도다 */
export function isWithdrawalKey(withdrawalKey: string) {
  return WITHDRAWAL_KEYS.includes(withdrawalKey);
}

/** 처리 대기는 오래 기다린 순서로, 처리 완료는 최근 처리 순서로 */
export async function getAdminWithdrawals(tab: ListTab): Promise<{ now: Date; withdrawals: WithdrawalRequest[] }> {
  const { now, withdrawals } = await loadAdminWithdrawals();
  if (tab === "pending") return { now, withdrawals: withdrawals.filter((request) => !request.review).sort(byOldest) };
  const done = withdrawals.filter((request) => request.review);
  return { now, withdrawals: done.sort((a, b) => b.review!.processedAt.localeCompare(a.review!.processedAt)) };
}

export async function getAdminWithdrawal(withdrawalKey: string): Promise<{ now: Date; withdrawal: WithdrawalRequest | null }> {
  const { now, withdrawals } = await loadAdminWithdrawals();
  return { now, withdrawal: withdrawals.find((request) => request.id === withdrawalKey) ?? null };
}

export async function saveAdminWithdrawalReview(withdrawalKey: string, review: WithdrawalReview) {
  await assertAdmin();
  return saveWithdrawalReview(withdrawalKey, review);
}
