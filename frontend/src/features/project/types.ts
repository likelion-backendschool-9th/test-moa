/*
 * 개발자 프로젝트 영역의 타입과 상수.
 * 서버와 클라이언트 컴포넌트가 함께 쓰므로 서버 전용 코드를 넣지 않는다.
 */
import type { Recruitment, SoftwareType } from "@/features/recruitment/types";

/** 프로젝트. 테스트받을 소프트웨어 하나 (GLOSSARY: 프로젝트) */
export type Project = {
  /** URL의 projectKey */
  key: string;
  name: string;
  /** 한 줄 소개 */
  summary: string;
  softwareType: SoftwareType;
  /** 테스터가 접속할 링크 */
  accessUrl: string;
  /** 상세 설명. 없으면 빈 문자열 */
  description: string;
  /** 화면 이미지. 첫 장이 대표 이미지다 */
  images: ProjectImage[];
  /**
   * 접속 링크 말고 더 알려 줄 링크. 이용 가이드, 저장소, 내려받을 파일(테스트 시나리오·설명서) 등.
   * 파일은 따로 올리지 않고 개발자가 열어 둔 내려받기 링크로 받는다.
   */
  links: ProjectLink[];
  createdAt: string;
  /** 이 프로젝트의 테스트 모집 건. slug를 recruitmentKey로 쓴다 */
  recruitments: Recruitment[];
};

/** 지원 상태: 지원, 확정, 거절, 참여 취소(테스터가 그만뒀거나 모집이 취소됨. 백엔드 RegisterStatus.CANCELLED) */
export type ApplicationStatus = "applied" | "confirmed" | "rejected" | "cancelled";

export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  applied: "지원",
  confirmed: "확정",
  rejected: "거절",
  cancelled: "참여 취소",
};

/** 모집 건에 들어온 지원 한 건. 테스터 개인정보는 닉네임만 둔다 */
export type Application = {
  id: string;
  testerNickname: string;
  status: ApplicationStatus;
  appliedAt: string;
};

/** 피드백 상태: 72시간 신고 대기, 신고됨, 지급 완료 */
export type FeedbackStatus = "waiting" | "reported" | "paid";

export const FEEDBACK_STATUS_LABEL: Record<FeedbackStatus, string> = {
  waiting: "신고 대기",
  reported: "신고됨",
  paid: "지급 완료",
};

/** 확정된 테스터가 제출한 피드백 한 건 */
export type Feedback = {
  id: string;
  testerNickname: string;
  /** 어느 테스트 항목에 대한 피드백인지. 기타 의견은 null (백엔드 Feedback.testItem) */
  testItemId: string | null;
  /** 피드백에 붙인 스크린샷 (백엔드 FeedbackImage) */
  images: ProjectImage[];
  /** 개발자가 도움이 된 피드백으로 추천했는지 */
  recommended: boolean;
  content: string;
  submittedAt: string;
  status: FeedbackStatus;
};

/** 모집 건 상태. 저장하지 않고 마감일과 인원으로 계산한다. 취소 요청이 승인되면 취소다 */
export type RecruitmentStatus = "recruiting" | "full" | "testing" | "closed" | "cancelled";

export const RECRUITMENT_STATUS_LABEL: Record<RecruitmentStatus, string> = {
  recruiting: "모집 중",
  full: "모집 완료",
  testing: "테스트 중",
  closed: "종료",
  cancelled: "취소",
};

/** 테스터에게 해 달라고 할 작업 하나 (백엔드 TestItem) */
export type TestItem = { id: string; title: string; description: string };

/** 모집 건에 붙는 내용. 홈의 Recruitment 타입은 홈 담당이라 여기에 따로 둔다 */
export type RecruitmentDetail = {
  /** 모집 조건: 필요한 경험·관심사·사용 환경 (README). 없으면 빈 문자열 */
  conditions: string;
  testItems: TestItem[];
};

/** 확정된 테스터의 피드백 제출 현황. 제출 마감까지 안 내면 미완료 (README: 보상 없이 미완료 처리) */
export type SubmissionStatus = "submitted" | "pending" | "incomplete";

export const SUBMISSION_STATUS_LABEL: Record<SubmissionStatus, string> = {
  submitted: "제출함",
  pending: "미제출",
  incomplete: "미완료",
};

/** 모집 취소 요청. 운영자가 승인하거나 반려한다 (docs/frontend-admin-cancellations.md) */
export type CancelRequest = {
  status: "pending" | "approved" | "rejected";
  reason: string;
  requestedAt: string;
  /** 반려 사유. 개발자에게 보인다 */
  rejectReason?: string;
};

export const CANCEL_REQUEST_LABEL: Record<CancelRequest["status"], string> = {
  pending: "처리 대기",
  approved: "승인",
  rejected: "반려",
};

/** README: 제출 후 72시간 동안 신고가 없으면 자동 지급 */
export const REPORT_WINDOW_HOURS = 72;

/* 아래 값은 기획에서 미정이라 임시로 정한 값이다 */
/** 기본 보상 크레딧 */
export const BASE_REWARD = 1000;
/** 구독 모집의 추가 보상 크레딧 */
export const EXTRA_REWARD = 300;
/** 무료·구독별 최대 모집 인원 */
export const MAX_CAPACITY = { free: 10, subscription: 30 } as const;

/** AI 분석 항목 하나. 근거가 된 피드백 수를 함께 둔다 */
export type AiFinding = {
  text: string;
  feedbackCount: number;
};

/** 모집 건 피드백을 AI가 정리한 결과. 지금은 시연용 샘플이다 */
export type AiSummary = {
  /** 한 줄 요약 */
  headline: string;
  /** 고칠 점 (버그·사용성). 해결 제안이 있으면 문제에 짝지어 둔다 */
  issues: Array<AiFinding & { suggestion?: string }>;
  /** 좋았던 점 */
  strengths: AiFinding[];
  /** 정리한 시각 */
  generatedAt: string;
  /** 시연용 샘플이면 true. 실제 AI를 붙이면 false */
  isSample: boolean;
};

/** AI 분석을 시작하는 최소 피드백 수. 기획에서 미정이라 임시값이다 */
export const AI_MIN_FEEDBACKS = 3;

export type ProjectImage = { url: string; name: string };
export type ProjectLink = { label: string; url: string };
/** 프로젝트 등록 폼의 이미지·링크 한도. 기획 확정 전 임시값이다 */
export const PROJECT_MEDIA_LIMIT = {
  images: { count: 5, bytes: 5 * 1024 * 1024, types: ["image/png", "image/jpeg", "image/webp"] },
  links: { count: 3, labelLength: 20 },
  descriptionLength: 1000,
} as const;

/** 모집 작성 폼과 취소 요청의 글자 수·개수 한도. 기획 확정 전 임시값이다 */
export const RECRUITMENT_LIMIT = {
  conditionsLength: 500,
  testItems: { min: 1, max: 10, titleLength: 50, descriptionLength: 300 },
  cancelReasonLength: 300,
} as const;

/** 폼 제출 결과. 오류가 있으면 입력값을 그대로 돌려줘 다시 채운다 */
export type FormState = {
  values: Record<string, string>;
  errors: Record<string, string>;
};

export const EMPTY_FORM_STATE: FormState = { values: {}, errors: {} };
