"use server";

import { redirect } from "next/navigation";
import { assertAdmin, getReport, isReportKey } from "./api";
import { saveReview } from "./reviews";
import { isReportDecision, REVIEW_MEMO_MAX_LENGTH } from "./types";

/**
 * 신고 처리. Server Action은 화면 밖에서도 불릴 수 있어서 권한을 여기서 다시 확인한다.
 * 결과를 고르지 않았거나 기록을 저장하지 못하면 상세로 돌려보내 안내를 보여 주고,
 * 처리하면 목록에서 결과 문구를 보여 준다. 보상 보류가 있던 신고인지(held)도 함께 넘긴다.
 */
export async function processReport(formData: FormData) {
  await assertAdmin();
  const reportKey = String(formData.get("reportKey") ?? "");
  if (!isReportKey(reportKey)) redirect("/admin/reports");

  const detailPath = `/admin/reports/${reportKey}`;
  const decision = formData.get("decision");
  if (!isReportDecision(decision)) redirect(`${detailPath}?error=decision`);

  /* 이미 처리한 신고는 결과를 바꾸지 않는다 */
  const { report } = await getReport(reportKey);
  if (!report || report.review) redirect(detailPath);

  const memo = String(formData.get("memo") ?? "").trim().slice(0, REVIEW_MEMO_MAX_LENGTH);
  const saved = await saveReview(reportKey, { decision, memo, processedAt: new Date().toISOString() });
  if (!saved) redirect(`${detailPath}?error=memo`);
  redirect(`/admin/reports?processed=${decision}${report.holdsReward ? "&held=1" : ""}`);
}
