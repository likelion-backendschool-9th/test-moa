import type { CreditBalance, CreditEntry } from "@/features/credit/types";
import type { Profile } from "@/features/member/types";

/*
 * 마이페이지 요약. 개발자와 테스터는 한 계정이라 역할로 나누지 않는다.
 * 화면 분기는 데이터(구독 여부, 출금 가능 금액, 활동 유무)로만 한다.
 */

export type Subscription = { status: "none" } | { status: "active"; planId: string; expiresAt: string };

const DAY_MS = 24 * 60 * 60 * 1000;

/** 지금 결제하면 정해지는 만료일. 구독 중이면 지금 만료일부터, 아니면 지금부터 기간만큼 늘어난다 */
export function renewedExpiry(subscription: Subscription, periodDays: number, now: Date): string {
  const startsAt = subscription.status === "active" ? Math.max(new Date(subscription.expiresAt).getTime(), now.getTime()) : now.getTime();
  return new Date(startsAt + periodDays * DAY_MS).toISOString();
}

/** 지금 할 일은 테스트 참여와 내 프로젝트에서만 나온다 */
export type TodoCategory = "participation" | "project";

export const TODO_CATEGORY_LABEL: Record<TodoCategory, string> = {
  participation: "테스트 참여",
  project: "내 프로젝트",
};

/** 지금 할 일 한 줄 */
export type Todo = {
  id: string;
  category: TodoCategory;
  title: string;
  /** 오른쪽에 붙는 값. 마감이 있으면 D-day, 없으면 금액·건수 */
  detail: string;
  href: string;
  /** 마감 시각. 있는 항목이 먼저, 가까운 순서로 보인다 */
  dueAt?: string;
};

export type ParticipationCounts = { applied: number; ongoing: number; completed: number };
export type ProjectCounts = { projects: number; recruiting: number; newFeedback: number };

export type Activity = {
  participation: ParticipationCounts;
  project: ProjectCounts;
};

export type MyPageSummary = {
  profile: Profile;
  credits: CreditBalance;
  /** 운영자처럼 구독 대상이 아니면 null */
  subscription: Subscription | null;
  todos: Todo[];
  /** 운영자처럼 서비스 이용 활동이 없으면 null */
  activity: Activity | null;
  /** 최신순 */
  recentCredits: CreditEntry[];
};

export type SubscriptionOverview = {
  /** 운영자처럼 구독 대상이 아니면 null */
  subscription: Subscription | null;
  freePlan: PlanTerms;
  plans: SubscriptionPlan[];
  recruitQuota: RecruitQuota;
  payableCredits: number;
  /** 남은 날 계산 기준 시각 */
  now: string;
};

/** 켜고 끄는 혜택. 문구로 비교한다 (spec.md 2장) */
export type BenefitKey = "selection" | "reward" | "chat" | "exposure";

/** 혜택 비교의 행. 월간 모집 인원만 숫자 한도로 비교한다 */
export const BENEFIT_ROWS: { key: BenefitKey | "monthlyLimit"; label: string }[] = [
  { key: "selection", label: "참여 확정 방식" },
  { key: "monthlyLimit", label: "월간 모집 인원" },
  { key: "reward", label: "테스터 보상" },
  { key: "chat", label: "1대1 채팅" },
  { key: "exposure", label: "모집 목록 노출" },
];

/** 무료와 구독 상품이 함께 갖는 혜택 조건 */
export type PlanTerms = {
  /** 한 달 동안 모집 글에 걸 수 있는 인원 합계 */
  monthlyLimit: number;
  benefits: Record<BenefitKey, string>;
};

/** 구독 상품. 지금은 하나지만 늘어날 수 있어 화면은 목록을 그린다 */
export type SubscriptionPlan = PlanTerms & {
  id: string;
  name: string;
  periodDays: number;
  /** 원 */
  cashPrice: number;
  /** 크레딧. 현금보다 우대 가격이다 */
  creditPrice: number;
};

/** 이번 달 모집 인원 사용량 */
export type RecruitQuota = {
  used: number;
  limit: number;
  /** 다시 채워지는 시각 (다음 달 1일) */
  resetsAt: string;
};

/** 구독이 만료되면 남는 것과 멈추는 것 (spec.md 4장 구독 만료) */
export const EXPIRY_KEEPS = ["받은 피드백과 채팅 기록 보기", "이미 참여가 확정된 테스터의 보상", "모집 글 등록과 지원 현황 확인"];
export const EXPIRY_STOPS = ["새 테스터 직접 선정", "채팅 메시지 보내기", "상단 구독 영역 노출", "분석"];
