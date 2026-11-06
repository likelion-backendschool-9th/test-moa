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

/** 신고 대상 */
export type ReportTarget = "feedback" | "recruitment" | "user";

export const REPORT_TARGET_LABEL: Record<ReportTarget, string> = {
  feedback: "피드백",
  recruitment: "모집 글",
  user: "회원",
};

/** 신고 목록의 대상 필터. 주소(target)에 남고, 알 수 없는 값은 전체로 본다 */
export type ReportTargetFilter = ReportTarget | "all";

export function parseReportTargetFilter(value: unknown): ReportTargetFilter {
  return value === "feedback" || value === "recruitment" || value === "user" ? value : "all";
}

export function parseListTab(value: unknown): ListTab {
  return value === "done" ? "done" : "pending";
}

/** 신고 목록에서 보고 있던 상태 탭과 대상 필터. 상세로 갔다가 돌아올 때 되살린다 */
export type ReportListView = { tab: ListTab; target: ReportTargetFilter };

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

/** 운영자의 신고 처리 결과. 기각은 문제없음, 인정은 제재 이력에 반영 */
export type ReportDecision = "dismissed" | "upheld";

export const REPORT_DECISION_LABEL: Record<ReportDecision, string> = {
  dismissed: "기각",
  upheld: "인정",
};

export function isReportDecision(value: unknown): value is ReportDecision {
  return value === "dismissed" || value === "upheld";
}

/**
 * 처리 메모 최대 글자 수. 시연용 기록은 쿠키에 담기는데, 한글은 인코딩하면 한 글자가 9바이트라
 * 검토 대기 4건을 모두 이 길이로 처리해도 쿠키 한도(4096바이트) 안에 들어가게 정했다.
 */
export const REVIEW_MEMO_MAX_LENGTH = 80;

/** 신고 처리 기록. 처리 전 신고에는 없다 */
export type ReportReview = {
  decision: ReportDecision;
  memo: string;
  processedAt: string;
};

/** 신고. id가 상세 주소의 reportKey다 */
export type Report = {
  id: string;
  targetType: ReportTarget;
  /** 신고가 걸린 모집 건 */
  recruitmentName: string;
  recruitmentSlug: string;
  /** 사유 한 줄 */
  reason: string;
  /** 신고한 사람. 피드백은 개발자가, 모집 글은 테스터가, 회원은 누구나 신고한다 */
  reporterNickname: string;
  /** 신고 대상 테스터·회원. 모집 글 신고에는 없다 */
  targetNickname?: string;
  /** 신고 대상 회원의 키(`user-<번호>`). 회원 관리에서 제재 이력과 받은 신고를 모을 때 쓴다 */
  targetUserKey?: string;
  /** 신고된 피드백 원문. 피드백 신고에만 있고 상세에서만 보여 준다 */
  feedback?: string;
  createdAt: string;
  /** 72시간 지급 대기 중에 접수되어 크레딧 지급을 멈춘 신고 */
  holdsReward: boolean;
  review?: ReportReview;
};

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

/** 운영자 홈·목록에서 요청 한 건으로 가는 주소. 출금은 목록 모달(?open=), 신고는 상세다 */
export function adminRequestHref(kind: AdminRequestKind, id: string) {
  if (kind === "withdrawal") return withdrawalsHref({ open: id });
  return `${ADMIN_REQUEST_PATH[kind]}/${id}`;
}

/** 운영자의 출금 처리 결과. 테스터 출금 내역의 상태 이름과 맞춘다 */
export type WithdrawalDecision = "paid" | "rejected";

export const WITHDRAWAL_DECISION_LABEL: Record<WithdrawalDecision, string> = {
  paid: "지급 완료",
  rejected: "반려",
};

export function isWithdrawalDecision(value: unknown): value is WithdrawalDecision {
  return value === "paid" || value === "rejected";
}

/** 반려 사유. 문구는 테스터 출금 내역에 그대로 보인다. 메모는 사유와 상관없이 따로 보인다("기타"만 필수) */
export const REJECT_REASONS = {
  holder: "예금주 이름이 회원 정보와 달라요",
  account: "계좌번호를 확인할 수 없어요",
  other: "기타",
} as const;

export type RejectReason = keyof typeof REJECT_REASONS;

export function isRejectReason(value: unknown): value is RejectReason {
  return typeof value === "string" && Object.hasOwn(REJECT_REASONS, value);
}

/** 출금 처리 양식이 막힌 이유. 저장 공간 부족은 memo, 기타에 메모가 없으면 note */
export type RequestFormError = "decision" | "reason" | "note" | "memo";

/** 출금 처리 Server Action의 응답. 처리되면 목록으로 이동해서 오류만 돌려준다 */
export type RequestFormState = { error: RequestFormError | null };

/** 출금 처리 기록. 처리 전 요청에는 없다. 반려에만 reason이 있다 */
export type WithdrawalReview = {
  decision: WithdrawalDecision;
  reason?: RejectReason;
  /** 반려 메모. 사유와 상관없이 회원에게 그대로 보인다. "기타"만 필수다 */
  memo: string;
  processedAt: string;
};

/** 회원에게 보이는 반려 사유 */
export function rejectReasonText(review: WithdrawalReview) {
  if (!review.reason) return "";
  return REJECT_REASONS[review.reason];
}

/** 출금 요청. id가 상세 주소의 withdrawalKey다 */
export type WithdrawalRequest = {
  id: string;
  nickname: string;
  /** 가입 정보의 실명. 예금주와 비교한다 */
  memberName: string;
  /** 크레딧. 1크레딧 = 1원 */
  amount: number;
  bank: string;
  /** 숫자 10~14자리. 처리 대기 상세에서만 전체를 보여 준다 */
  accountNumber: string;
  accountHolder: string;
  createdAt: string;
  review?: WithdrawalReview;
};

/** 예금주가 회원 이름과 다른지. 알리기만 하고 처리를 막지는 않는다 */
export function isHolderMismatch(request: WithdrawalRequest) {
  return request.accountHolder !== request.memberName;
}

/** 처리가 끝난 계좌는 끝 4자리만 보여 준다 */
export function maskAccount(accountNumber: string) {
  return `****${accountNumber.slice(-4)}`;
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

const OVERDUE_MS = 72 * 60 * 60 * 1000;

/** 접수 뒤 72시간이 지났는지. 지급 대기 기간을 넘겼다는 표시이고 운영자 처리 기한은 아니다 */
export function isOverdue(report: Report, now: Date) {
  return now.getTime() - new Date(report.createdAt).getTime() > OVERDUE_MS;
}
