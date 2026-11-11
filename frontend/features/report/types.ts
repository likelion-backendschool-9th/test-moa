

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
  /** 증거 파일. 실제 로그인(백엔드)에만 있다 */
  evidences?: ReportEvidence[];
};

/** 증거 파일 주소. 공개 주소가 없어 Next가 로그인 토큰을 붙여 받아 온다(app/api/v1/reports/.../evidences) */
export function evidenceHref(reportId: string | number, evidenceId: number) {
  return `/api/v1/reports/${reportId}/evidences/${evidenceId}`;
}

/** "1.2MB", "830KB" */
export function formatFileSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)}MB` : `${Math.max(1, Math.round(bytes / 1024))}KB`;
}

const OVERDUE_MS = 72 * 60 * 60 * 1000;

/** 접수 뒤 72시간이 지났는지. 지급 대기 기간을 넘겼다는 표시이고 운영자 처리 기한은 아니다 */
export function isOverdue(report: Report, now: Date) {
  return now.getTime() - new Date(report.createdAt).getTime() > OVERDUE_MS;
}

/* ---- 실제 로그인(AUTH_MODE=backend): 백엔드 신고(#85) ---- */

/** 백엔드 신고 대상 종류 */
export type BackendReportTarget = "FEEDBACK" | "RECRUITMENT" | "USER" | "CHAT";

export const BACKEND_REPORT_TARGET_LABEL: Record<BackendReportTarget, string> = {
  FEEDBACK: "피드백",
  RECRUITMENT: "모집 글",
  USER: "회원",
  CHAT: "채팅",
};

/** 백엔드 신고 처리 상태 */
export type BackendReportStatus = "PENDING" | "REJECTED" | "ACCEPTED";

export const BACKEND_REPORT_STATUS_LABEL: Record<BackendReportStatus, string> = {
  PENDING: "검토 대기",
  REJECTED: "기각",
  ACCEPTED: "인정",
};

export type ReportEvidence = { id: number; originalName: string; contentType: string; size: number };

/* ---- 신고 접수(POST /api/v1/reports): 모집 글·채팅방 ---- */

/** 신고할 대상. 모집 글은 주소의 모집 키, 채팅은 방 키 */
export type ReportSubject = { kind: "recruitment"; recruitmentKey: string } | { kind: "chat"; roomKey: string };

export const REPORT_REASON_MAX = 1000;
export const EVIDENCE_MAX_COUNT = 5;
export const EVIDENCE_MAX_BYTES = 5 * 1024 * 1024;
export const EVIDENCE_TYPES = ["image/png", "image/jpeg", "image/webp", "application/pdf"];

/** 고른 증거 파일을 보내기 전에 확인한다. 문구는 백엔드(#85-S5)와 같다. 문제가 없으면 null */
export function checkEvidence(files: File[]): string | null {
  if (files.length > EVIDENCE_MAX_COUNT) return `증거 파일은 ${EVIDENCE_MAX_COUNT}장까지 올릴 수 있어요`;
  if (files.some((file) => !EVIDENCE_TYPES.includes(file.type))) return "PNG·JPG·WEBP·PDF 파일만 올릴 수 있어요";
  if (files.some((file) => file.size > EVIDENCE_MAX_BYTES)) return "파일은 한 장 5MB까지 올릴 수 있어요";
  return null;
}

export type ReportSubmitState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string; field?: "reason" | "files" };

/** 내 신고 한 건(GET /api/v1/reports/me) */
export type MyReport = {
  id: number;
  targetType: BackendReportTarget;
  status: BackendReportStatus;
  reason: string;
  createdAt: string;
  reviewedAt: string | null;
  evidences: ReportEvidence[];
};
