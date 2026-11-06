import type { ReportTarget } from "@/features/report/types";

/** 신고 목록의 대상 필터. 주소(target)에 남고, 알 수 없는 값은 전체로 본다 */
export type ReportTargetFilter = ReportTarget | "all";

export function parseReportTargetFilter(value: unknown): ReportTargetFilter {
  return value === "feedback" || value === "recruitment" || value === "user" ? value : "all";
}

export function parseListTab(value: unknown): ListTab {
  return value === "done" ? "done" : "pending";
}

/** 신고 목록에서 보고 있던 상태 탭과 대상 필터. 상세로 갔다가 돌아올 때 되살린다 */
export type ReportListView = { tab: ListTab; target: ReportTargetFilter; };

function viewParams({ tab, target }: ReportListView, extra: Record<string, string>) {
  const params = new URLSearchParams();
  if (tab !== "pending") params.set("tab", tab);
  if (target !== "all") params.set("target", target);
  for (const [name, value] of Object.entries(extra)) params.set(name, value);
  const search = params.toString();
  return search ? `?${search}` : "";
}

/** 신고 목록 주소. 기본값(검토 대기, 전체)은 쓰지 않는다. extra는 처리 결과 문구 같은 일회성 값이다 */
export function reportsHref(view: ReportListView, extra: Record<string, string> = {}) {
  return `/admin/reports${viewParams(view, extra)}`;
}

/** 신고 상세 주소. 보던 탭·필터를 담아 두어서 "목록으로"와 처리 뒤에 같은 목록으로 돌아온다 */
export function reportDetailHref(reportKey: string, view: ReportListView, extra: Record<string, string> = {}) {
  return `/admin/reports/${reportKey}${viewParams(view, extra)}`;
}

/** 관리 목록의 탭. 신고·출금이 같은 두 탭을 쓴다 */
export type ListTab = "pending" | "done";
