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
  createdAt: string;
  /** 이 프로젝트의 테스트 모집 건. slug를 recruitmentKey로 쓴다 */
  recruitments: Recruitment[];
};

/** 지원 상태: 지원, 확정, 거절 */
export type ApplicationStatus = "applied" | "confirmed" | "rejected";

export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  applied: "지원",
  confirmed: "확정",
  rejected: "거절",
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
  content: string;
  submittedAt: string;
  status: FeedbackStatus;
};

/** 모집 건 상태. 저장하지 않고 마감일과 인원으로 계산한다 */
export type RecruitmentStatus = "recruiting" | "full" | "testing" | "closed";

export const RECRUITMENT_STATUS_LABEL: Record<RecruitmentStatus, string> = {
  recruiting: "모집 중",
  full: "모집 완료",
  testing: "테스트 중",
  closed: "종료",
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

/** 폼 제출 결과. 오류가 있으면 입력값을 그대로 돌려줘 다시 채운다 */
export type FormState = {
  values: Record<string, string>;
  errors: Record<string, string>;
};

export const EMPTY_FORM_STATE: FormState = { values: {}, errors: {} };
