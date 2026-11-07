import { type AdminSummary, type PendingItem } from "@/app/(site)/admin/_lib/paths";
import { isOverdue } from "@/features/report/types";
import "server-only";

import { getAdminWithdrawals } from "@/features/credit/api";
import { getReports } from "@/features/report/api";

/** 각 도메인이 권한·처리 상태를 확인한 결과만 묶는다. */
async function loadPending() {
  const [{ now, reports }, { withdrawals }] = await Promise.all([getReports("pending"), getAdminWithdrawals("pending")]);
  return { now, reports, withdrawals };
}

const byLatest = (a: { createdAt: string }, b: { createdAt: string }) => b.createdAt.localeCompare(a.createdAt);

const byOldest = (a: { createdAt: string }, b: { createdAt: string }) => a.createdAt.localeCompare(b.createdAt);

/** 영역별 처리 대기 건수 */
export async function getAdminSummary(): Promise<AdminSummary> {
  const { reports, withdrawals } = await loadPending();
  return {
    reportCount: reports.length,
    heldRewardCount: reports.filter((report) => report.holdsReward).length,
    withdrawalCount: withdrawals.length,
    withdrawalAmount: withdrawals.reduce((sum, item) => sum + item.amount, 0),
  };
}

/** 두 종류를 합쳐 접수가 오래된 순서로 */
export async function getOldestPending(limit = 5): Promise<{ now: Date; items: PendingItem[] }> {
  const { now, reports, withdrawals } = await loadPending();
  const items: PendingItem[] = [
    ...reports.map((item) => ({
      kind: "report" as const,
      id: item.id,
      title: item.recruitmentName,
      createdAt: item.createdAt,
      overdue: isOverdue(item, now),
    })),
    ...withdrawals.map((item) => ({ kind: "withdrawal" as const, id: item.id, title: item.nickname, createdAt: item.createdAt, overdue: false })),
  ];
  return { now, items: items.sort(byOldest).slice(0, limit) };
}

/** 영역별 최근 접수 */
export async function getRecentRequests(limit = 3) {
  const { now, reports, withdrawals } = await loadPending();
  return {
    now,
    reports: [...reports].sort(byLatest).slice(0, limit),
    withdrawals: [...withdrawals].sort(byLatest).slice(0, limit),
  };
}
