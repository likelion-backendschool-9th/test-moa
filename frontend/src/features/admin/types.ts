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

/** 관리 목록의 탭. 신고·출금(나중에 모집 취소도)이 같은 두 탭을 쓴다 */
export type ListTab = "pending" | "done";

/** 운영자의 출금 처리 결과. 테스터 출금 내역의 상태 이름과 맞춘다 */
export type WithdrawalDecision = "paid" | "rejected";

export const WITHDRAWAL_DECISION_LABEL: Record<WithdrawalDecision, string> = {
  paid: "지급 완료",
  rejected: "반려",
};

export function isWithdrawalDecision(value: unknown): value is WithdrawalDecision {
  return value === "paid" || value === "rejected";
}

/** 반려 사유. 문구는 테스터 출금 내역에 그대로 보인다. "기타"는 메모가 사유가 된다 */
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
export type WithdrawalFormError = "decision" | "reason" | "note" | "memo";

/** 출금 처리 Server Action의 응답. 처리되면 목록으로 이동해서 오류만 돌려준다 */
export type WithdrawalFormState = { error: WithdrawalFormError | null };

/** 출금 처리 기록. 처리 전 요청에는 없다. 반려에만 reason이 있다 */
export type WithdrawalReview = {
  decision: WithdrawalDecision;
  reason?: RejectReason;
  /** 반려 메모. 운영자 기록이고, 사유가 "기타"일 때만 회원에게 사유로 보인다 */
  memo: string;
  processedAt: string;
};

/** 회원에게 보이는 반려 사유 */
export function rejectReasonText(review: WithdrawalReview) {
  if (!review.reason) return "";
  return review.reason === "other" ? review.memo : REJECT_REASONS[review.reason];
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

/** 운영자의 모집 취소 처리 결과 */
export type CancellationDecision = "approved" | "rejected";

export const CANCELLATION_DECISION_LABEL: Record<CancellationDecision, string> = {
  approved: "승인",
  rejected: "반려",
};

export function isCancellationDecision(value: unknown): value is CancellationDecision {
  return value === "approved" || value === "rejected";
}

/** 모집 취소 반려 사유. 문구는 개발자에게 보인다. "기타"는 메모가 사유가 된다 */
export const CANCELLATION_REJECT_REASONS = {
  testing: "이미 테스트가 진행 중이에요",
  reason: "취소 사유가 부족해요",
  other: "기타",
} as const;

export type CancellationRejectReason = keyof typeof CANCELLATION_REJECT_REASONS;

export function isCancellationRejectReason(value: unknown): value is CancellationRejectReason {
  return typeof value === "string" && Object.hasOwn(CANCELLATION_REJECT_REASONS, value);
}

/** 모집 취소 처리 기록. 반려에만 reason이 있다. 메모는 운영자 기록이고 "기타"일 때만 개발자에게 사유로 보인다 */
export type CancellationReview = {
  decision: CancellationDecision;
  reason?: CancellationRejectReason;
  memo: string;
  processedAt: string;
};

/** 개발자에게 보이는 반려 사유 */
export function cancellationRejectText(review: CancellationReview) {
  if (!review.reason) return "";
  return review.reason === "other" ? review.memo : CANCELLATION_REJECT_REASONS[review.reason];
}

/** 모집 취소 처리 양식이 막힌 이유. 출금 처리 양식과 같다 */
export type CancellationFormError = WithdrawalFormError;
export type CancellationFormState = WithdrawalFormState;

/**
 * 모집 취소 요청. id가 상세 주소의 cancellationKey다.
 * 확정 테스터 수와 제출된 피드백 수는 요청할 때의 값이다. 보상은 테스트를 완료해야 지급되고
 * 취소는 테스트 전에 요청하므로, 승인해도 지급할 보상이 없다(docs/frontend-admin-cancellations.md).
 */
export type CancellationRequest = {
  id: string;
  recruitmentName: string;
  /** 모집 글 주소 /recruitments/:slug */
  recruitmentSlug: string;
  developerNickname: string;
  /** 개발자가 적은 취소 사유 */
  reason: string;
  /** 이미 참여가 확정된 테스터 수. 승인하면 이들의 참여도 함께 취소된다 */
  confirmedCount: number;
  /** 제출된 피드백 수. 1건 이상이면 테스트가 이미 시작된 것이다 */
  submittedFeedbackCount: number;
  createdAt: string;
  review?: CancellationReview;
};

/** 피드백이 제출됐으면 테스트가 이미 시작된 모집 건이다 */
export function hasTestingStarted(request: CancellationRequest) {
  return request.submittedFeedbackCount > 0;
}

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
