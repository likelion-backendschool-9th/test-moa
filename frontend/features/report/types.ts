

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

const OVERDUE_MS = 72 * 60 * 60 * 1000;

/** 접수 뒤 72시간이 지났는지. 지급 대기 기간을 넘겼다는 표시이고 운영자 처리 기한은 아니다 */
export function isOverdue(report: Report, now: Date) {
  return now.getTime() - new Date(report.createdAt).getTime() > OVERDUE_MS;
}
