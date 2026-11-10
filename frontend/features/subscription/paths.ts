/** 운영자 플랜 관리(`/admin/plans`)의 탭 */
export type PlanTab = "benefits" | "subscriptions";

export const PLAN_TABS: { tab: PlanTab; label: string }[] = [
  { tab: "benefits", label: "혜택" },
  { tab: "subscriptions", label: "회원 구독" },
];

/** 주소의 tab을 탭으로 바꾼다. 모르는 값이면 첫 탭(혜택)이다 */
export function parsePlanTab(value: string | string[] | undefined): PlanTab {
  return value === "subscriptions" ? "subscriptions" : "benefits";
}

/** 탭 주소. 첫 탭은 tab 없이 쓰고, 회원 구독은 검색한 이메일을 붙일 수 있다 */
export function planTabHref(tab: PlanTab, email = ""): string {
  if (tab === "benefits") return "/admin/plans";
  return email ? `/admin/plans?tab=subscriptions&email=${encodeURIComponent(email)}` : "/admin/plans?tab=subscriptions";
}
