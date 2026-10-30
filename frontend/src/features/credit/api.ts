import "server-only";
import { connection } from "next/server";
import { requireMember } from "@/lib/auth";
import { waitIfSlow } from "@/lib/demo";
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
  return buildCreditData(session.role, new Date());
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
