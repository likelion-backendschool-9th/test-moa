import "server-only";
import { connection } from "next/server";
import { requireMember } from "@/lib/auth";
import { waitIfSlow } from "@/lib/demo";
import type { Role } from "@/lib/session";
import { getDemoWithdrawals } from "./demo-requests";
import { buildCreditData, type CreditData } from "./mock";
import type { CreditBalance, CreditEntry, LedgerType, Withdrawal } from "./types";

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
 * 목업에 이 브라우저의 시연용 출금 신청을 더한 값. 신청 금액은 처리 중이라 잠긴다.
 * 마이페이지 대시보드도 같은 값을 보여 주려고 이 함수를 쓴다 (세션 확인은 부르는 쪽에서)
 */
export async function creditDataFor(role: Exclude<Role, "guest">, now: Date): Promise<CreditData> {
  const data = buildCreditData(role, now);
  const requested = await getDemoWithdrawals(role);
  const locked = requested.reduce((sum, item) => sum + item.amount, 0);
  return {
    ...data,
    balance: { ...data.balance, pendingWithdrawal: data.balance.pendingWithdrawal + locked },
    withdrawals: [...requested, ...data.withdrawals],
  };
}

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
