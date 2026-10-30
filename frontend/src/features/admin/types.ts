/** 운영자가 처리하는 요청 종류 */
export type AdminRequestKind = "report" | "withdrawal" | "cancellation";

export const ADMIN_REQUEST_LABEL: Record<AdminRequestKind, string> = {
  report: "신고",
  withdrawal: "출금",
  cancellation: "모집 취소",
};

export const ADMIN_REQUEST_PATH: Record<AdminRequestKind, string> = {
  report: "/admin/reports",
  withdrawal: "/admin/withdrawals",
  cancellation: "/admin/cancellations",
};

/** 신고 대상 */
export type ReportTarget = "feedback" | "recruitment" | "user";

export const REPORT_TARGET_LABEL: Record<ReportTarget, string> = {
  feedback: "피드백",
  recruitment: "모집 글",
  user: "회원",
};

/** 검토 전 신고 */
export type Report = {
  id: string;
  targetType: ReportTarget;
  /** 신고가 걸린 모집 건 이름 */
  recruitmentName: string;
  /** 사유 한 줄 */
  reason: string;
  createdAt: string;
  /** 72시간 지급 대기 중에 접수되어 크레딧 지급을 멈춘 신고 */
  holdsReward: boolean;
};

/** 처리 전 출금 요청 */
export type WithdrawalRequest = {
  id: string;
  nickname: string;
  /** 크레딧. 1크레딧 = 1원 */
  amount: number;
  createdAt: string;
};

/** 처리 전 모집 취소 요청 */
export type CancellationRequest = {
  id: string;
  recruitmentName: string;
  developerNickname: string;
  /** 이미 참여가 확정된 테스터 수. 이들의 보상은 취소돼도 유지한다 */
  confirmedCount: number;
  createdAt: string;
};

/** 세 종류를 합친 대기열 항목 */
export type PendingItem = {
  kind: AdminRequestKind;
  id: string;
  /** 줄에 보여 줄 대상 이름. 신고·모집 취소는 모집 건, 출금은 닉네임 */
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
  cancellationCount: number;
  /** 확정 테스터가 있는 모집 취소 요청 수 */
  cancellationWithTestersCount: number;
};

const OVERDUE_MS = 72 * 60 * 60 * 1000;

/** 접수 뒤 72시간이 지났는지. 지급 대기 기간을 넘겼다는 표시이고 운영자 처리 기한은 아니다 */
export function isOverdue(report: Report, now: Date) {
  return now.getTime() - new Date(report.createdAt).getTime() > OVERDUE_MS;
}
