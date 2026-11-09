

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

export type SubscriptionOverview = {
  /** 운영자처럼 구독 대상이 아니면 null */
  subscription: Subscription | null;
  plans: SubscriptionPlan[];
  payableCredits: number;
  /** 남은 날 계산 기준 시각 */
  now: string;
};

/** 공개 구독 소개(`/subscription`). 비로그인도 읽을 수 있다 */
export type SubscriptionIntro = {
  freePlan: PlanTerms;
  plans: SubscriptionPlan[];
  /** 비로그인은 미구독으로 본다. 운영자는 null */
  subscription: Subscription | null;
  isGuest: boolean;
};

/** 켜고 끄는 혜택. 문구로 비교한다 (spec.md 2장) */
export type BenefitKey = "selection" | "reward" | "chat" | "exposure" | "analytics";

/** 카드에 보여 줄 혜택의 순서 */
export const BENEFIT_KEYS: BenefitKey[] = ["selection", "reward", "chat", "exposure", "analytics"];

/** 무료와 구독 상품이 함께 갖는 혜택 조건 */
export type PlanTerms = {
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

/** 구독이 만료되면 남는 것과 멈추는 것 (spec.md 4장 구독 만료) */
export const EXPIRY_KEEPS = ["받은 피드백과 채팅 기록 보기", "이미 참여가 확정된 테스터의 보상", "모집 글 등록과 지원 현황 확인"];

export const EXPIRY_STOPS = ["새 테스터 직접 선정", "채팅 메시지 보내기", "상단 구독 영역 노출", "분석"];
