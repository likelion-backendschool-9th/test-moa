


export function parseListTab(value: unknown): ListTab {
  return value === "done" ? "done" : "pending";
}


/** 관리 목록의 탭. 신고·출금이 같은 두 탭을 쓴다 */
export type ListTab = "pending" | "done";


/** 출금 목록 주소. 기본 탭(처리 대기)과 빈 값은 쓰지 않는다. open은 모달로 연 요청 키다 */
export function withdrawalsHref(options: { tab?: ListTab; open?: string; processed?: string } = {}) {
  const params = new URLSearchParams();
  if (options.tab === "done") params.set("tab", "done");
  if (options.open) params.set("open", options.open);
  if (options.processed) params.set("processed", options.processed);
  const search = params.toString();
  return search ? `/admin/withdrawals?${search}` : "/admin/withdrawals";
}
