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
import { backendFetch, backendFetchOnce, isBackendAuth } from "@/lib/backend";
import {
  balanceFromServer,
  type CreditBalance,
  type CreditEntry,
  entryFromServer,
  type LedgerType,
  type ServerCreditBalance,
  type ServerCreditLedger,
  type ServerWithdrawal,
  type Withdrawal,
  type WithdrawalReview,
  withdrawalFromServer,
} from "@/features/credit/types";
import { type WithdrawalRequest } from "@/features/credit/types";
import { assertAdmin, requireMember } from "@/features/session/guard";
import type { Role } from "@/features/session/session";
import { connection } from "next/server";
import "server-only";

/*
 * 크레딧 데이터 접근. `AUTH_MODE=backend`에서는 잔액과 내역을 서버에서 읽고(#205), 아니면 목업을 돌려준다.
 * 출금 요청도 서버 값이다(#206). 운영자 출금 처리는 아직 목업이다(#207).
 * 모든 함수는 비로그인이면 next 경로를 붙여 로그인으로 보낸다.
 */

async function load(next: string): Promise<CreditData> {
  const session = await requireMember(next);
  await waitIfSlow();
  /* 날짜는 요청 시각 기준이라 미리 렌더링하지 않는다 */
  await connection();
  return creditDataFor(session.role, new Date());
}

/** 서버의 내 크레딧 잔액. 읽지 못하면 오류로 멈춘다. 헤더도 같은 API를 읽어서 한 요청에서 한 번만 부른다 */
async function readBalance(): Promise<CreditBalance> {
  const result = await backendFetchOnce<ServerCreditBalance>("/api/v1/my/credits");
  if (!result.ok) throw new Error(result.message);
  return balanceFromServer(result.data);
}

/** 서버의 내 출금 내역, 최신순 */
async function readWithdrawals(): Promise<Withdrawal[]> {
  const result = await backendFetch<ServerWithdrawal[]>("/api/v1/my/credits/withdrawals");
  if (!result.ok) throw new Error(result.message);
  return result.data.map(withdrawalFromServer);
}

/** 출금 신청의 결과. 서버가 거절하면 문구와, 입력 형식 오류면 칸별 문구를 돌려준다 */
export type WithdrawalSubmitResult = { ok: true } | { ok: false; message: string; fields?: Record<string, string> };

/** 서버에 출금을 신청한다. 신청한 금액은 서버가 적립에서 처리 중으로 옮긴다 */
export async function submitServerWithdrawal(request: {
  amount: number;
  bank: string;
  accountNumber: string;
  accountHolder: string;
}): Promise<WithdrawalSubmitResult> {
  const result = await backendFetch<unknown>("/api/v1/my/credits/withdrawals", { method: "POST", body: request });
  return result.ok ? { ok: true } : { ok: false, message: result.message, fields: result.fields };
}

/** 서버의 내 크레딧 내역, 최신순. limit을 주면 서버가 앞에서부터 그 개수만 준다(1~100) */
async function readLedger(type: LedgerType, limit?: number): Promise<CreditEntry[]> {
  const query = limit === undefined ? `type=${type}` : `type=${type}&limit=${limit}`;
  const result = await backendFetch<ServerCreditLedger[]>(`/api/v1/my/credits/ledger?${query}`);
  if (!result.ok) throw new Error(result.message);
  return result.data.map(entryFromServer);
}

/**
 * 목업에 이 브라우저의 시연용 출금 신청과 크레딧 구독 결제를 더한 값. 신청 금액은 처리 중이라 잠긴다.
 * 마이페이지 대시보드도 같은 값을 보여 주려고 이 함수를 쓴다 (세션 확인은 부르는 쪽에서)
 * ledgerLimit은 백엔드 모드에서만 서버에 넘긴다. 목업은 전부 돌려주고 부르는 쪽이 자른다
 */
export async function creditDataFor(role: Exclude<Role, "guest">, now: Date, ledgerLimit?: number): Promise<CreditData> {
  const data = buildCreditData(role, now);
  if (isBackendAuth) {
    /*
     * 잔액과 내역만 서버에서 읽는다(마이페이지가 쓰는 값). 출금 요청은 출금 화면에서 getWithdrawals가 따로 읽으므로
     * 여기서는 비워 둔다. 같이 읽으면 출금 API 하나만 실패해도 마이페이지까지 멈춘다
     */
    const [balance, ledger] = await Promise.all([readBalance(), readLedger("all", ledgerLimit)]);
    return { ...data, balance, ledger, withdrawals: [] };
  }
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

/** 크레딧 잔액. 백엔드 모드에서는 잔액 API 하나만 읽는다(내역은 getCreditLedger가 따로 읽는다) */
export async function getCreditBalance(next: string): Promise<CreditBalance> {
  if (isBackendAuth) {
    await requireMember(next);
    await connection();
    return readBalance();
  }
  return (await load(next)).balance;
}

/** 크레딧 내역, 최신순. in은 늘어난 기록, out은 줄어든 기록만 */
export async function getCreditLedger(next: string, type: LedgerType = "all", limit?: number): Promise<CreditEntry[]> {
  if (isBackendAuth) {
    await requireMember(next);
    await connection();
    return readLedger(type, limit);
  }
  const { ledger } = await load(next);
  const filtered = ledger.filter((entry) => type === "all" || (type === "in" ? entry.amount > 0 : entry.amount < 0));
  return limit === undefined ? filtered : filtered.slice(0, limit);
}

/** 출금 요청, 최신순. 백엔드 모드에서는 출금 내역 API 하나만 읽는다 */
export async function getWithdrawals(next: string): Promise<Withdrawal[]> {
  if (isBackendAuth) {
    await requireMember(next);
    await connection();
    return readWithdrawals();
  }
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
