import { getDemoDataMode } from "@/demo/mode";
import { buildReports, readReviews, REPORT_KEYS, saveReview } from "@/demo/report";
import { type ListTab, type ReportTargetFilter } from "@/features/report/paths";
import type { ReportReview } from "@/features/report/types";
import { type Report } from "@/features/report/types";
import { assertAdmin } from "@/features/session/guard";
import { connection } from "next/server";
import "server-only";

/** 권한·시연 모드·처리 기록을 반영한 신고 목록. 회원 관리도 같은 원천을 읽는다. */
export async function loadReports() {
  await assertAdmin();
  const mode = await getDemoDataMode();
  if (mode === "slow") await new Promise((resolve) => setTimeout(resolve, 1500));
  await connection();
  const now = new Date();
  if (mode === "empty") return { now, reports: [] as Report[] };
  const reviews = await readReviews();
  const reports = buildReports(now).map((report) => report.review ? report : { ...report, review: reviews[report.id] });
  return { now, reports };
}

const byOldest = (a: { createdAt: string; }, b: { createdAt: string; }) => a.createdAt.localeCompare(b.createdAt);

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
): Promise<{ now: Date; reports: Report[]; }> {
  const { now, reports: every } = await loadReports();
  const reports = target === "all" ? every : every.filter((report) => report.targetType === target);
  if (tab === "pending") return { now, reports: reports.filter((report) => !report.review).sort(byOldest) };
  const done = reports.filter((report) => report.review);
  return { now, reports: done.sort((a, b) => b.review!.processedAt.localeCompare(a.review!.processedAt)) };
}

export async function getReport(reportKey: string): Promise<{ now: Date; report: Report | null; }> {
  const { now, reports } = await loadReports();
  return { now, report: reports.find((report) => report.id === reportKey) ?? null };
}

export async function saveReportReview(reportKey: string, review: ReportReview) {
  await assertAdmin();
  return saveReview(reportKey, review);
}
