import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getDemoDataMode } from "@/lib/demo";
import { getSession } from "@/lib/session";
import { buildCancellations, buildReports, buildWithdrawals, CANCELLATION_KEYS, REPORT_KEYS, WITHDRAWAL_KEYS } from "./mock";
import { readCancellationReviews, readReviews, readWithdrawalReviews } from "./reviews";
import {
  isOverdue,
  type AdminSummary,
  type CancellationRequest,
  type ListTab,
  type PendingItem,
  type Report,
  type ReportTargetFilter,
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

/** 데이터 함수와 Server Action 안의 검사. 화면에서 숨겨도 데이터는 따로 지켜야 한다 */
export async function assertAdmin() {
  if ((await getSession()).role !== "admin") throw new Error("운영자만 볼 수 있는 데이터예요");
}

/**
 * 권한·시연 모드를 확인하고 처리 기록을 덮은 요청 목록을 돌려준다.
 * 회원 관리(users.ts)도 이 함수로 신고를 읽어서, 신고 쪽 규칙이 바뀌어도 두 화면이 같은 결과를 보여 준다.
 */
export async function loadAll() {
  await assertAdmin();
  const mode = await getDemoDataMode();
  if (mode === "slow") await new Promise((resolve) => setTimeout(resolve, SLOW_DELAY_MS));
  /* 경과 시간은 요청 시각 기준이라 미리 렌더링하지 않는다 */
  await connection();
  const now = new Date();
  if (mode === "empty") {
    return { now, reports: [] as Report[], withdrawals: [] as WithdrawalRequest[], cancellations: [] as CancellationRequest[] };
  }
  /* 시연 중 처리한 결과를 목업 위에 덮는다 */
  const [reviews, withdrawalReviews, cancellationReviews] = await Promise.all([
    readReviews(),
    readWithdrawalReviews(),
    readCancellationReviews(),
  ]);
  const reports = buildReports(now).map((report) => (report.review ? report : { ...report, review: reviews[report.id] }));
  const withdrawals = buildWithdrawals(now).map((request) =>
    request.review ? request : { ...request, review: withdrawalReviews[request.id] },
  );
  const cancellations = buildCancellations(now).map((request) =>
    request.review ? request : { ...request, review: cancellationReviews[request.id] },
  );
  return { now, reports, withdrawals, cancellations };
}

/** 운영자 홈이 다루는 처리 전 요청 */
async function loadPending() {
  const all = await loadAll();
  return {
    ...all,
    reports: all.reports.filter((report) => !report.review),
    withdrawals: all.withdrawals.filter((request) => !request.review),
    cancellations: all.cancellations.filter((request) => !request.review),
  };
}

const byLatest = (a: { createdAt: string }, b: { createdAt: string }) => b.createdAt.localeCompare(a.createdAt);
const byOldest = (a: { createdAt: string }, b: { createdAt: string }) => a.createdAt.localeCompare(b.createdAt);

/** 영역별 처리 대기 건수 */
export async function getAdminSummary(): Promise<AdminSummary> {
  const { reports, withdrawals, cancellations } = await loadPending();
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
  const { now, reports, withdrawals, cancellations } = await loadPending();
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
  const { now, reports, withdrawals, cancellations } = await loadPending();
  return {
    now,
    reports: [...reports].sort(byLatest).slice(0, limit),
    withdrawals: [...withdrawals].sort(byLatest).slice(0, limit),
    cancellations: [...cancellations].sort(byLatest).slice(0, limit),
  };
}

/** 상세 주소의 신고 키가 있는 키인지. 쿠키를 읽지 않아서 Suspense 밖에서 404를 정할 때 쓴다 */
export function isReportKey(reportKey: string) {
  return REPORT_KEYS.includes(reportKey);
}

export function getReportKeys() {
  return [...REPORT_KEYS];
}

/** 검토 대기는 오래 기다린 순서로, 처리 완료는 최근 처리 순서로. 대상 종류로 거를 수 있다 */
export async function getReports(
  tab: ListTab,
  target: ReportTargetFilter = "all",
): Promise<{ now: Date; reports: Report[] }> {
  const { now, reports: every } = await loadAll();
  const reports = target === "all" ? every : every.filter((report) => report.targetType === target);
  if (tab === "pending") return { now, reports: reports.filter((report) => !report.review).sort(byOldest) };
  const done = reports.filter((report) => report.review);
  return { now, reports: done.sort((a, b) => b.review!.processedAt.localeCompare(a.review!.processedAt)) };
}

export async function getReport(reportKey: string): Promise<{ now: Date; report: Report | null }> {
  const { now, reports } = await loadAll();
  return { now, report: reports.find((report) => report.id === reportKey) ?? null };
}

/** 상세 주소의 출금 요청 키가 있는 키인지. isReportKey와 같은 용도다 */
export function isWithdrawalKey(withdrawalKey: string) {
  return WITHDRAWAL_KEYS.includes(withdrawalKey);
}

/** 처리 대기는 오래 기다린 순서로, 처리 완료는 최근 처리 순서로 */
export async function getWithdrawals(tab: ListTab): Promise<{ now: Date; withdrawals: WithdrawalRequest[] }> {
  const { now, withdrawals } = await loadAll();
  if (tab === "pending") return { now, withdrawals: withdrawals.filter((request) => !request.review).sort(byOldest) };
  const done = withdrawals.filter((request) => request.review);
  return { now, withdrawals: done.sort((a, b) => b.review!.processedAt.localeCompare(a.review!.processedAt)) };
}

export async function getWithdrawal(withdrawalKey: string): Promise<{ now: Date; withdrawal: WithdrawalRequest | null }> {
  const { now, withdrawals } = await loadAll();
  return { now, withdrawal: withdrawals.find((request) => request.id === withdrawalKey) ?? null };
}

/** 상세 주소의 모집 취소 요청 키가 있는 키인지. isReportKey와 같은 용도다 */
export function isCancellationKey(cancellationKey: string) {
  return CANCELLATION_KEYS.includes(cancellationKey);
}

export function getCancellationKeys() {
  return [...CANCELLATION_KEYS];
}

/** 처리 대기는 오래 기다린 순서로, 처리 완료는 최근 처리 순서로 */
export async function getCancellations(tab: ListTab): Promise<{ now: Date; cancellations: CancellationRequest[] }> {
  const { now, cancellations } = await loadAll();
  if (tab === "pending") return { now, cancellations: cancellations.filter((request) => !request.review).sort(byOldest) };
  const done = cancellations.filter((request) => request.review);
  return { now, cancellations: done.sort((a, b) => b.review!.processedAt.localeCompare(a.review!.processedAt)) };
}

export async function getCancellation(
  cancellationKey: string,
): Promise<{ now: Date; cancellation: CancellationRequest | null }> {
  const { now, cancellations } = await loadAll();
  return { now, cancellation: cancellations.find((request) => request.id === cancellationKey) ?? null };
}
