

import { withdrawalsHref } from "@/features/credit/paths";
/** 운영자가 처리하는 요청 종류 */
export type AdminRequestKind = "report" | "withdrawal";


export const ADMIN_REQUEST_LABEL: Record<AdminRequestKind, string> = {
  report: "신고",
  withdrawal: "출금",
};


export const ADMIN_REQUEST_PATH: Record<AdminRequestKind, string> = {
  report: "/admin/reports",
  withdrawal: "/admin/withdrawals",
};


/** 운영자 홈·목록에서 요청 한 건으로 가는 주소. 출금은 목록 모달(?open=), 신고는 상세다 */
export function adminRequestHref(kind: AdminRequestKind, id: string) {
  if (kind === "withdrawal") return withdrawalsHref({ open: id });
  return `${ADMIN_REQUEST_PATH[kind]}/${id}`;
}


/** 두 종류를 합친 대기열 항목 */
export type PendingItem = {
  kind: AdminRequestKind;
  id: string;
  /** 줄에 보여 줄 대상 이름. 신고는 모집 건, 출금은 닉네임 */
  title: string;
  createdAt: string;
  /** 72시간이 지나도록 검토되지 않은 신고 */
  overdue: boolean;
};


export type AdminSummary = {
  reportCount: number;
  heldRewardCount: number;
  withdrawalCount: number;
  withdrawalAmount: number;
};
