import { getDemoDataMode } from "@/demo/mode";
import { buildReports, readReviews, REPORT_KEYS, saveReview } from "@/demo/report";
import { type ListTab, type ReportTargetFilter } from "@/features/report/paths";
import type { ReportReview } from "@/features/report/types";
import { type Report } from "@/features/report/types";
import { assertAdmin } from "@/features/session/guard";
import type { MyReport } from "@/features/report/types";
import { type AdminReportResponse, backendTarget, toReport } from "@/features/report/backend-map";
import { backendFetch, isBackendAuth } from "@/lib/backend";
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

const byOldest = (a: { createdAt: string }, b: { createdAt: string }) => a.createdAt.localeCompare(b.createdAt);

/** 상세 주소의 신고 키가 있는 키인지. 쿠키를 읽지 않아서 Suspense 밖에서 404를 정할 때 쓴다. 실제 로그인은 신고 id(숫자) */
export function isReportKey(reportKey: string) {
  return isBackendAuth ? /^[1-9][0-9]{0,18}$/.test(reportKey) : REPORT_KEYS.includes(reportKey);
}

export function getReportKeys() {
  return [...REPORT_KEYS];
}

/** 검토 대기는 오래 기다린 순서로, 처리 완료는 최근 처리 순서로. 대상 종류로 거를 수 있다 */
export async function getReports(
  tab: ListTab,
  target: ReportTargetFilter = "all",
): Promise<{ now: Date; reports: Report[] }> {
  if (isBackendAuth) return getBackendReports(tab, target);
  const { now, reports: every } = await loadReports();
  const reports = target === "all" ? every : every.filter((report) => report.targetType === target);
  if (tab === "pending") return { now, reports: reports.filter((report) => !report.review).sort(byOldest) };
  const done = reports.filter((report) => report.review);
  return { now, reports: done.sort((a, b) => b.review!.processedAt.localeCompare(a.review!.processedAt)) };
}

export async function getReport(reportKey: string): Promise<{ now: Date; report: Report | null }> {
  if (isBackendAuth) return getBackendReport(reportKey);
  const { now, reports } = await loadReports();
  return { now, report: reports.find((report) => report.id === reportKey) ?? null };
}

export async function saveReportReview(reportKey: string, review: ReportReview) {
  await assertAdmin();
  if (isBackendAuth) {
    /* 백엔드에는 처리 메모가 없어서 결과만 보낸다. 이미 처리한 신고(409)는 실패로 본다 */
    const result = await backendFetch(`/api/v1/admin/reports/${reportKey}/review`, {
      method: "POST",
      body: { result: review.decision === "upheld" ? "ACCEPTED" : "REJECTED" },
    });
    return result.ok;
  }
  return saveReview(reportKey, review);
}

/* ---- 실제 로그인(AUTH_MODE=backend): 운영자 신고(#85) ---- */

async function getBackendReports(tab: ListTab, target: ReportTargetFilter): Promise<{ now: Date; reports: Report[] }> {
  await assertAdmin();
  await connection();
  const query = new URLSearchParams({ status: tab === "done" ? "DONE" : "PENDING" });
  const type = backendTarget(target);
  if (type) query.set("targetType", type);
  const result = await backendFetch<AdminReportResponse[]>(`/api/v1/admin/reports?${query}`);
  /* 백엔드 장애를 "신고 없음"으로 보이면 운영자가 대기 신고를 놓친다. 실패는 오류 화면으로 올린다 */
  if (!result.ok) throw new Error(`신고 목록을 읽지 못했어요: ${result.code}`);
  return { now: new Date(), reports: result.data.map(toReport) };
}

async function getBackendReport(reportKey: string): Promise<{ now: Date; report: Report | null }> {
  await assertAdmin();
  await connection();
  const result = await backendFetch<AdminReportResponse>(`/api/v1/admin/reports/${reportKey}`);
  /* 없는 신고(404)만 "찾을 수 없어요"로 보이고, 그 밖의 실패는 오류 화면으로 올린다 */
  if (!result.ok && result.status !== 404) throw new Error(`신고를 읽지 못했어요: ${result.code}`);
  return { now: new Date(), report: result.ok ? toReport(result.data) : null };
}

/* ---- 실제 로그인(AUTH_MODE=backend) ---- */

/** 내가 한 신고, 최신순(#85). 실제 로그인에서만 부른다 */
export async function getMyReports(): Promise<MyReport[]> {
  const result = await backendFetch<MyReport[]>("/api/v1/reports/me");
  /* 장애를 "신고한 적 없음"으로 보이지 않게 실패는 오류 화면으로 올린다 */
  if (!result.ok) throw new Error(`내 신고를 읽지 못했어요: ${result.code}`);
  return result.data;
}
