"use server";

import { getReport, isReportKey, saveReportReview } from "@/features/report/api";
import { parseListTab, parseReportTargetFilter, reportDetailHref, reportsHref } from "@/features/report/paths";
import { isReportDecision, REVIEW_MEMO_MAX_LENGTH } from "@/features/report/types";
import { assertAdmin } from "@/features/session/guard";
import { redirect } from "next/navigation";

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
  if (!saved) redirect(reportDetailHref(reportKey, view, { error: "memo" }));
  redirect(reportsHref(view, report.holdsReward ? { processed: decision, held: "1" } : { processed: decision }));
}
