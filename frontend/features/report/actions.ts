"use server";

import { getReport, isReportKey, saveReportReview } from "@/features/report/api";
import { parseListTab, parseReportTargetFilter, reportDetailHref, reportsHref } from "@/features/report/paths";
import {
  checkEvidence,
  isReportDecision,
  REPORT_REASON_MAX,
  type ReportSubject,
  type ReportSubmitState,
  REVIEW_MEMO_MAX_LENGTH,
} from "@/features/report/types";
import { assertAdmin } from "@/features/session/guard";
import { getSession } from "@/features/session/session";
import { backendFetch, isBackendAuth } from "@/lib/backend";
import { redirect } from "next/navigation";

/**
 * 모집 글·채팅방 신고 접수(#85). 사유와 증거 파일(0~5장)을 백엔드 POST /api/v1/reports로 multipart 그대로 넘긴다.
 * 목업(AUTH_MODE 없음)은 저장하지 않고 접수한 것으로 보인다.
 */
export async function submitReport(subject: ReportSubject, _prev: ReportSubmitState, formData: FormData): Promise<ReportSubmitState> {
  if ((await getSession()).role === "guest") return { status: "error", message: "로그인한 뒤 신고할 수 있어요" };
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) return { status: "error", field: "reason", message: "신고 사유를 적어 주세요" };
  if (reason.length > REPORT_REASON_MAX) return { status: "error", field: "reason", message: "신고 사유는 1,000자까지 적을 수 있어요" };
  /* 파일을 고르지 않으면 브라우저가 빈 파일 하나를 보낸다 */
  const files = formData.getAll("files").filter((file): file is File => file instanceof File && file.size > 0);
  const fileError = checkEvidence(files);
  if (fileError) return { status: "error", field: "files", message: fileError };
  if (!isBackendAuth) return { status: "success" };

  const body = new FormData();
  if (subject.kind === "recruitment") {
    if (!/^\d+$/.test(subject.recruitmentKey)) return { status: "error", message: "신고할 모집 글을 찾지 못했어요" };
    body.set("targetType", "RECRUITMENT");
    body.set("targetId", subject.recruitmentKey);
  } else {
    body.set("targetType", "CHAT");
    body.set("roomKey", subject.roomKey);
  }
  body.set("reason", reason);
  for (const file of files) body.append("files", file);
  const result = await backendFetch("/api/v1/reports", { method: "POST", body, timeoutMs: 30_000 });
  if (result.ok) return { status: "success" };
  if (result.fields?.reason) return { status: "error", field: "reason", message: result.fields.reason };
  /* 자기 글(REPORT_SELF)·검토 중 중복(REPORT_DUPLICATED)·파일 규칙은 백엔드 문구를 그대로 보인다 */
  return { status: "error", message: result.status === 413 ? "파일은 한 장 5MB까지 올릴 수 있어요" : result.message };
}

/**
 * 신고 처리. Server Action은 화면 밖에서도 불릴 수 있어서 권한을 여기서 다시 확인한다.
 * 결과를 고르지 않았거나 기록을 저장하지 못하면 상세로 돌려보내 안내를 보여 주고,
 * 처리하면 목록에서 결과 문구를 보여 준다. 보상 보류가 있던 신고인지(held)도 함께 넘긴다.
 */
export async function processReport(formData: FormData) {
  await assertAdmin();
  const reportKey = String(formData.get("reportKey") ?? "");
  /* 보던 목록(탭·필터)을 되살려서, 같은 종류의 신고를 이어서 처리할 수 있게 한다 */
  const view = { tab: parseListTab(formData.get("tab")), target: parseReportTargetFilter(formData.get("target")) };
  if (!isReportKey(reportKey)) redirect(reportsHref(view));

  const decision = formData.get("decision");
  if (!isReportDecision(decision)) redirect(reportDetailHref(reportKey, view, { error: "decision" }));

  /* 이미 처리한 신고는 결과를 바꾸지 않는다 */
  const { report } = await getReport(reportKey);
  if (!report || report.review) redirect(reportDetailHref(reportKey, view));

  const memo = String(formData.get("memo") ?? "").trim().slice(0, REVIEW_MEMO_MAX_LENGTH);
  const saved = await saveReportReview(reportKey, { decision, memo, processedAt: new Date().toISOString() });
  /* 목업은 쿠키 저장 공간 부족, 실제 로그인은 백엔드 거절(먼저 처리된 신고 등) */
  if (!saved) redirect(reportDetailHref(reportKey, view, { error: isBackendAuth ? "failed" : "memo" }));
  redirect(reportsHref(view, report.holdsReward ? { processed: decision, held: "1" } : { processed: decision }));
}
