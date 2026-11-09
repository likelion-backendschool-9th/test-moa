import type { TestItem } from "@/features/recruitment/types";
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
  "cancelled",
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
  cancelled: "참여 취소",
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
  history: ["paid", "incomplete", "excluded", "cancelled"],
};

export function parseParticipationTab(value: string | string[] | undefined): ParticipationTab {
  const tab = Array.isArray(value) ? value[0] : value;
  return PARTICIPATION_TABS.find((item) => item === tab) ?? DEFAULT_TAB;
}

/** 목록 보기 방식. 리스트는 한 줄 행, 그리드는 넓은 화면에서 3열 카드다 */
export const PARTICIPATION_VIEWS = ["list", "grid"] as const;
export type ParticipationView = (typeof PARTICIPATION_VIEWS)[number];

export const VIEW_LABEL: Record<ParticipationView, string> = {
  list: "리스트",
  grid: "그리드",
};

export function parseParticipationView(value: unknown): ParticipationView {
  return PARTICIPATION_VIEWS.find((view) => view === value) ?? "list";
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
  /** 참여가 취소된 시각 */
  cancelledAt?: string;
  /** 테스트할 서비스 주소. 참여가 확정되면 있다 */
  accessUrl?: string;
  /** 받은 크레딧. 지급 완료가 아니면 0 */
  earnedCredits: number;
  /** 테스터가 해 볼 작업. 항목마다 피드백을 쓴다 */
  testItems: FeedbackTestItem[];
  /** 제출한 항목별 피드백. 제출 전이거나 미제출이면 비어 있다 */
  feedbacks: FeedbackEntry[];
};

/** 피드백을 쓸 테스트 항목 (백엔드 TestItem) */
export type FeedbackTestItem = Pick<TestItem, "id" | "title" | "description" | "required">;

/** 제출한 피드백 한 건 (백엔드 Feedback). 항목마다 한 건이다 */
export type FeedbackEntry = {
  /** 기타 의견은 null (백엔드 Feedback.testItem) */
  testItemId: string | null;
  content: string;
  /** 첨부한 이미지 이름. 시연용이라 파일은 없다 */
  imageNames: string[];
};

/** 칸마다 적용하는 최대 글자 수. 기획에서 미정이다. 시연용 저장 한도는 칸을 모두 합쳐 따로 확인한다(demo/participation.ts) */
export const FEEDBACK_MAX_LENGTH = 500;

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
    case "cancelled":
      return { label: "취소일", at: item.cancelledAt ?? item.appliedAt };
  }
}
