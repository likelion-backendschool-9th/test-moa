"use server";

import { redirect } from "next/navigation";
import { assertAdmin, getReport, isReportKey } from "./api";
import { saveReview } from "./reviews";
import { isReportDecision } from "./types";

const MEMO_MAX_LENGTH = 500;

/**
 * 신고 처리. Server Action은 화면 밖에서도 불릴 수 있어서 권한을 여기서 다시 확인한다.
 * 결과를 고르지 않으면 상세로 돌려보내 안내를 보여 주고, 처리하면 목록에서 결과 문구를 보여 준다.
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

  const memo = String(formData.get("memo") ?? "").trim().slice(0, MEMO_MAX_LENGTH);
  await saveReview(reportKey, { decision, memo, processedAt: new Date().toISOString() });
  redirect(`/admin/reports?processed=${decision}`);
}
