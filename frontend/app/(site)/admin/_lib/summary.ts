import { cache } from "react";
import { unstable_rethrow } from "next/navigation";
import { type AdminSummary, type PendingItem } from "@/app/(site)/admin/_lib/paths";
import { isOverdue } from "@/features/report/types";
import "server-only";

import { getAdminWithdrawals } from "@/features/credit/api";
import type { WithdrawalRequest } from "@/features/credit/types";
import { getReports } from "@/features/report/api";

/**
 * 출금 대기 목록. 읽지 못하면 null이다. 운영자 홈은 출금 API 하나가 실패해도 신고 집계와 목록이 열려야 해서 여기서만 실패를 받는다.
 * 페이지 이동·동적 렌더링 같은 Next의 제어 흐름 오류는 삼키지 않고 다시 던진다
 */
async function loadWithdrawals(): Promise<WithdrawalRequest[] | null> {
  try {
    return (await getAdminWithdrawals("pending")).withdrawals;
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
}

/**
 * 각 도메인이 권한·처리 상태를 확인한 결과만 묶는다.
 * 요약·가장 오래된 건·최근 건이 한 요청 안에서 같은 목록을 쓰도록 요청마다 한 번만 읽는다(출금 대기 응답에는 계좌 전체가 들어 있다)
 */
const loadPending = cache(async () => {
  const [{ now, reports }, withdrawals] = await Promise.all([getReports("pending"), loadWithdrawals()]);
  return { now, reports, withdrawals };
});

const byLatest = (a: { createdAt: string }, b: { createdAt: string }) => b.createdAt.localeCompare(a.createdAt);

const byOldest = (a: { createdAt: string }, b: { createdAt: string }) => a.createdAt.localeCompare(b.createdAt);

/** 영역별 처리 대기 건수 */
export async function getAdminSummary(): Promise<AdminSummary> {
  const { reports, withdrawals } = await loadPending();
  return {
    reportCount: reports.length,
    heldRewardCount: reports.filter((report) => report.holdsReward).length,
    withdrawalCount: withdrawals?.length ?? null,
    withdrawalAmount: (withdrawals ?? []).reduce((sum, item) => sum + item.amount, 0),
  };
}

/** 두 종류를 합쳐 접수가 오래된 순서로 */
export async function getOldestPending(limit = 5): Promise<{ now: Date; items: PendingItem[]; withdrawalsUnavailable: boolean }> {
  const { now, reports, withdrawals } = await loadPending();
  const items: PendingItem[] = [
    ...reports.map((item) => ({
      kind: "report" as const,
      id: item.id,
      title: item.recruitmentName,
      createdAt: item.createdAt,
      overdue: isOverdue(item, now),
    })),
    ...(withdrawals ?? []).map((item) => ({ kind: "withdrawal" as const, id: item.id, title: item.nickname, createdAt: item.createdAt, overdue: false })),
  ];
  return { now, items: items.sort(byOldest).slice(0, limit), withdrawalsUnavailable: withdrawals === null };
}

/** 영역별 최근 접수 */
export async function getRecentRequests(limit = 3) {
  const { now, reports, withdrawals } = await loadPending();
  return {
    now,
    reports: [...reports].sort(byLatest).slice(0, limit),
    withdrawals: withdrawals && [...withdrawals].sort(byLatest).slice(0, limit),
  };
}
