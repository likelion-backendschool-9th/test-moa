

/*
 * 마이페이지 요약. 개발자와 테스터는 한 계정이라 역할로 나누지 않는다.
 * 화면 분기는 데이터(구독 여부, 출금 가능 금액, 활동 유무)로만 한다.
 */

export type Subscription =
  | { status: "none" }
  /* planName은 서버가 준 플랜 이름(tier)이다. 플랜 새 버전이 나오면 구독의 planId는 지금 파는 플랜 목록에 없어서, 백엔드 모드는 이름으로 찾는다 */
  | { status: "active"; planId: string; planName?: string; expiresAt: string };

/** 백엔드 모드에서 결제를 막을 때 보여 주는 문구(결제 저장 API 연결은 #204) */
export const PAYMENT_NOT_READY = "아직 결제할 수 없어요";

/** 이 구독이 쓰는 상품인지. 이름을 아는 서버 값은 이름으로, 목업은 id로 비교한다 */
export function usesPlan(subscription: Subscription | null, plan: SubscriptionPlan): boolean {
  if (subscription?.status !== "active") return false;
  return subscription.planName !== undefined ? subscription.planName === plan.name : subscription.planId === plan.id;
}

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
  freePlan: FreePlan;
  plans: SubscriptionPlan[];
  /** 비로그인은 미구독으로 본다. 운영자는 null */
  subscription: Subscription | null;
  isGuest: boolean;
};

/** 무료와 구독 상품이 함께 갖는 혜택. 서버가 준 문구 목록이고, 비어 있으면 카드에 혜택 영역을 그리지 않는다 */
export type PlanTerms = {
  benefits: string[];
};

/** 무료 플랜. 이름과 혜택은 서버 값이다. 가격 표기("무료")와 카드 소개 문구는 화면이 정한다 */
export type FreePlan = PlanTerms & {
  name: string;
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
