import type { Recruitment } from "@/features/recruitment/types";

/**
 * 참여 상태. README의 흐름(지원 → 참여 확정 → 피드백 제출 → 72시간 신고 대기 또는 운영자 검토 → 지급)을 나눈 것
 */
export const PARTICIPATION_STATUSES = [
  "selectionPending",
  "notSelected",
  "beforeSubmit",
  "payoutPending",
  "underReview",
  "paid",
  "incomplete",
  "excluded",
] as const;
export type ParticipationStatus = (typeof PARTICIPATION_STATUSES)[number];

/** 행에 보이는 상태 문구. 운영 용어(신고, 제재)는 쓰지 않는다 */
export const STATUS_LABEL: Record<ParticipationStatus, string> = {
  selectionPending: "선정 대기",
  notSelected: "미선정",
  beforeSubmit: "피드백 제출 전",
  payoutPending: "지급 대기",
  underReview: "운영자 검토 중",
  paid: "지급 완료",
  incomplete: "기한 내 미제출",
  excluded: "보상 제외",
};

/** 참여 테스트 화면의 탭. URL ?tab= 값과 같다 */
export const PARTICIPATION_TABS = ["applied", "ongoing", "history"] as const;
export type ParticipationTab = (typeof PARTICIPATION_TABS)[number];

export const DEFAULT_TAB: ParticipationTab = "ongoing";

export const TAB_LABEL: Record<ParticipationTab, string> = {
  applied: "지원한 테스트",
  ongoing: "참여 중인 테스트",
  history: "참여했던 테스트",
};

/** 탭에 묶이는 상태. 배열 순서가 탭 안의 할 일 순서다 */
export const TAB_STATUSES: Record<ParticipationTab, ParticipationStatus[]> = {
  applied: ["selectionPending", "notSelected"],
  ongoing: ["beforeSubmit", "payoutPending", "underReview"],
  history: ["paid", "incomplete", "excluded"],
};

export function parseParticipationTab(value: string | string[] | undefined): ParticipationTab {
  const tab = Array.isArray(value) ? value[0] : value;
  return PARTICIPATION_TABS.find((item) => item === tab) ?? DEFAULT_TAB;
}

export function tabOf(status: ParticipationStatus): ParticipationTab {
  return PARTICIPATION_TABS.find((tab) => TAB_STATUSES[tab].includes(status)) ?? DEFAULT_TAB;
}

/** 테스터 한 명이 모집 건 하나에 지원·참여한 기록 */
export type Participation = {
  key: string;
  recruitmentSlug: string;
  status: ParticipationStatus;
  appliedAt: string;
  submittedAt?: string;
  paidAt?: string;
  /** 운영자 검토가 끝난 시각 (보상 제외) */
  reviewedAt?: string;
  /** 받은 크레딧. 지급 완료가 아니면 0 */
  earnedCredits: number;
};

/** 화면에 그릴 참여. 모집 마감일·제출 마감일·보상은 가리키는 모집 글의 값을 쓴다 */
export type ParticipationItem = Participation & { recruitment: Recruitment };

export type ParticipationCounts = Record<ParticipationTab, number>;

export type ParticipationSummary = {
  /** 제출할 피드백 수 */
  feedbackToSubmit: number;
  /** 지급 대기 중인 크레딧 합 */
  payoutPendingCredits: number;
};

const PAYOUT_WAIT_MS = 72 * 60 * 60 * 1000;

/** 제출 뒤 72시간 동안 신고가 없으면 지급한다 */
export function payoutAt(submittedAt: string) {
  return new Date(new Date(submittedAt).getTime() + PAYOUT_WAIT_MS).toISOString();
}

export function rewardOf(recruitment: Recruitment) {
  return recruitment.baseReward + (recruitment.extraReward ?? 0);
}

/** 상태마다 행에 보여 줄 날짜. 정렬 기준이기도 하다 */
export function keyDateOf(item: ParticipationItem): { label: string; at: string } {
  const { recruitment } = item;
  switch (item.status) {
    case "selectionPending":
    case "notSelected":
      return { label: "모집 마감", at: recruitment.recruitDeadline };
    case "beforeSubmit":
    case "incomplete":
      return { label: "제출 마감", at: recruitment.submitDeadline };
    case "payoutPending":
      return { label: "지급 예정", at: payoutAt(item.submittedAt ?? item.appliedAt) };
    case "underReview":
      return { label: "제출일", at: item.submittedAt ?? item.appliedAt };
    case "paid":
      return { label: "지급일", at: item.paidAt ?? item.appliedAt };
    case "excluded":
      return { label: "검토 완료", at: item.reviewedAt ?? item.appliedAt };
  }
}

/** 내 참여 상세 주소 */
export function participationPath(key: string) {
  return `/my/participations/${key}`;
}
