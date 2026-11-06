"use server";

import { saveAdminWithdrawalReview,saveReportReview } from "./api";

import { redirect } from "next/navigation";
import { assertAdmin,getReport,getWithdrawal,isReportKey,isWithdrawalKey } from "./api";
import {
isRejectReason,
isReportDecision,
isWithdrawalDecision,
parseListTab,
parseReportTargetFilter,
reportDetailHref,
reportsHref,
REVIEW_MEMO_MAX_LENGTH,
withdrawalsHref,
type RequestFormState,
type WithdrawalReview,
} from "./types";

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

/**
 * 출금 처리. 신고 처리와 같은 이유로 권한을 다시 확인한다.
 * 반려는 사유가 있어야 하고, "기타"는 메모가 회원에게 보이는 사유가 되므로 메모도 있어야 한다.
 * 메모는 반려라면 사유와 관계없이 운영자 기록으로 남긴다.
 * 막히면 오류만 돌려주고 페이지를 옮기지 않아서, 고른 값과 메모가 화면에 그대로 남는다(useActionState).
 * 처리하면 목록에 요청 키를 넘기고, 목록은 그 요청이 실제로 처리됐는지 확인한 뒤 금액을 데이터에서 꺼낸다.
 */
export async function processWithdrawal(_prev: RequestFormState, formData: FormData): Promise<RequestFormState> {
  await assertAdmin();
  const withdrawalKey = String(formData.get("withdrawalKey") ?? "");
  if (!isWithdrawalKey(withdrawalKey)) redirect(withdrawalsHref());

  const decision = formData.get("decision");
  if (!isWithdrawalDecision(decision)) return { error: "decision" };
  let review: WithdrawalReview = { decision, memo: "", processedAt: new Date().toISOString() };
  if (decision === "rejected") {
    const reason = formData.get("reason");
    if (!isRejectReason(reason)) return { error: "reason" };
    const memo = String(formData.get("memo") ?? "").trim().slice(0, REVIEW_MEMO_MAX_LENGTH);
    if (reason === "other" && !memo) return { error: "note" };
    review = { ...review, reason, memo };
  }

  const tab = formData.get("tab") === "done" ? "done" : undefined;

  /* 이미 처리한 요청은 결과를 바꾸지 않는다. 새로 불러와 결과 모달을 보여 준다 */
  const { withdrawal } = await getWithdrawal(withdrawalKey);
  if (!withdrawal || withdrawal.review) redirect(withdrawalsHref({ tab, open: withdrawalKey }));

  if (!(await saveAdminWithdrawalReview(withdrawalKey, review))) return { error: "memo" };
  redirect(withdrawalsHref({ tab, processed: withdrawalKey }));
}
