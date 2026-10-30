import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getDemoDataMode } from "@/lib/demo";
import { getSession } from "@/lib/session";
import { buildCancellations, buildReports, buildWithdrawals } from "./mock";
import {
  isOverdue,
  type AdminSummary,
  type CancellationRequest,
  type PendingItem,
  type Report,
  type WithdrawalRequest,
} from "./types";

/*
 * 운영자 데이터 접근. 지금은 목업을 돌려준다.
 * 권한 검사는 layout이 아니라 여기서 한다. layout은 페이지 이동 때 다시 그려지지 않는다.
 * 실제 API를 붙일 때는 함수 본문만 바꾸고 시그니처는 유지한다.
 */

const SLOW_DELAY_MS = 1500;

/**
 * 운영자 페이지 입구에서 부른다. 비로그인이면 로그인으로 보내고(next에 path),
 * 운영자가 아니면 false를 돌려줘서 페이지가 권한 없음 화면을 보여 주게 한다.
 */
export async function requireAdmin(path: string): Promise<boolean> {
  const session = await getSession();
  if (session.role === "guest") redirect(`/login?next=${encodeURIComponent(path)}`);
  return session.role === "admin";
}

/** 데이터 함수 안의 검사. 화면에서 숨겨도 데이터는 따로 지켜야 한다 */
async function assertAdmin() {
  if ((await getSession()).role !== "admin") throw new Error("운영자만 볼 수 있는 데이터예요");
}

async function loadAll() {
  await assertAdmin();
  const mode = await getDemoDataMode();
  if (mode === "slow") await new Promise((resolve) => setTimeout(resolve, SLOW_DELAY_MS));
  /* 경과 시간은 요청 시각 기준이라 미리 렌더링하지 않는다 */
  await connection();
  const now = new Date();
  if (mode === "empty") {
    return { now, reports: [] as Report[], withdrawals: [] as WithdrawalRequest[], cancellations: [] as CancellationRequest[] };
  }
  return { now, reports: buildReports(now), withdrawals: buildWithdrawals(now), cancellations: buildCancellations(now) };
}

const byLatest = (a: { createdAt: string }, b: { createdAt: string }) => b.createdAt.localeCompare(a.createdAt);
const byOldest = (a: { createdAt: string }, b: { createdAt: string }) => a.createdAt.localeCompare(b.createdAt);

/** 영역별 처리 대기 건수 */
export async function getAdminSummary(): Promise<AdminSummary> {
  const { reports, withdrawals, cancellations } = await loadAll();
  return {
    reportCount: reports.length,
    heldRewardCount: reports.filter((report) => report.holdsReward).length,
    withdrawalCount: withdrawals.length,
    withdrawalAmount: withdrawals.reduce((sum, item) => sum + item.amount, 0),
    cancellationCount: cancellations.length,
    cancellationWithTestersCount: cancellations.filter((item) => item.confirmedCount > 0).length,
  };
}

/** 세 종류를 합쳐 접수가 오래된 순서로 */
export async function getOldestPending(limit = 5): Promise<{ now: Date; items: PendingItem[] }> {
  const { now, reports, withdrawals, cancellations } = await loadAll();
  const items: PendingItem[] = [
    ...reports.map((item) => ({
      kind: "report" as const,
      id: item.id,
      title: item.recruitmentName,
      createdAt: item.createdAt,
      overdue: isOverdue(item, now),
    })),
    ...withdrawals.map((item) => ({ kind: "withdrawal" as const, id: item.id, title: item.nickname, createdAt: item.createdAt, overdue: false })),
    ...cancellations.map((item) => ({
      kind: "cancellation" as const,
      id: item.id,
      title: item.recruitmentName,
      createdAt: item.createdAt,
      overdue: false,
    })),
  ];
  return { now, items: items.sort(byOldest).slice(0, limit) };
}

/** 영역별 최근 접수 */
export async function getRecentRequests(limit = 3) {
  const { now, reports, withdrawals, cancellations } = await loadAll();
  return {
    now,
    reports: [...reports].sort(byLatest).slice(0, limit),
    withdrawals: [...withdrawals].sort(byLatest).slice(0, limit),
    cancellations: [...cancellations].sort(byLatest).slice(0, limit),
  };
}
