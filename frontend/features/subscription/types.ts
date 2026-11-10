

/*
 * 마이페이지 요약. 개발자와 테스터는 한 계정이라 역할로 나누지 않는다.
 * 화면 분기는 데이터(구독 여부, 출금 가능 금액, 활동 유무)로만 한다.
 */

export type Subscription =
  | { status: "none" }
  /* planName은 서버가 준 플랜 이름(tier)이다. 플랜 새 버전이 나오면 구독의 planId는 지금 파는 플랜 목록에 없어서, 백엔드 모드는 이름으로 찾는다 */
  | { status: "active"; planId: string; planName?: string; expiresAt: string };

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

/** 운영자가 보는 회원의 구독 상태(#204). 운영자 계정은 구독 대상이 아니라 eligible이 false다 */
export type MemberSubscription = {
  nickname: string;
  email: string;
  eligible: boolean;
  active: boolean;
  /** 지금 구독 중인 상품 이름. 미구독이면 null */
  plan: string | null;
  endAt: string | null;
  remainingDays: number | null;
};

/** 이메일로 회원을 찾은 결과 */
export type MemberSubscriptionLookup = { status: "found"; member: MemberSubscription } | { status: "not-found" };

/** 이메일 검색창의 길이 한도. 이메일 칸(백엔드)의 한도와 맞춘다 */
export const MEMBER_EMAIL_MAX_LENGTH = 254;

/** 주소의 email을 검색어로 다듬는다. 문자열이 아니거나 비면 빈 문자열이다 */
export function parseMemberEmail(value: string | string[] | undefined): string {
  return typeof value === "string" ? value.trim().slice(0, MEMBER_EMAIL_MAX_LENGTH) : "";
}

/** 이번 결제로 생기는 이용 기간. 시각은 서버가 준 오프셋 포함 문자열이다 */
export type CheckoutPeriod = { startAt: string; endAt: string };

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

/* ---------- 운영자 플랜 혜택 편집 (#257) ---------- */

/** 서버(`PlanCreateRequest`·`FreePlanUpdateRequest`)의 상한과 맞춘다 */
export const PLAN_NAME_MAX_LENGTH = 255;
export const BENEFIT_MAX_COUNT = 10;
export const BENEFIT_MAX_LENGTH = 100;

export type BenefitsParse = { ok: true; benefits: string[] } | { ok: false; message: string };

/**
 * 한 줄에 혜택 하나인 입력을 목록으로 바꾼다. 앞뒤 공백을 지우고 빈 줄은 뺀다.
 * 서버는 혜택을 쉼표로 이어 저장해서 쉼표가 든 문구는 거절한다
 */
export function parseBenefits(text: string): BenefitsParse {
  const benefits = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (benefits.length > BENEFIT_MAX_COUNT) return { ok: false, message: `혜택은 ${BENEFIT_MAX_COUNT}개까지 쓸 수 있어요` };
  if (benefits.some((benefit) => benefit.length > BENEFIT_MAX_LENGTH)) return { ok: false, message: `혜택 문구는 ${BENEFIT_MAX_LENGTH}자까지 쓸 수 있어요` };
  if (benefits.some((benefit) => benefit.includes(",") || benefit.includes("，"))) return { ok: false, message: "혜택 문구에는 쉼표를 쓸 수 없어요" };
  return { ok: true, benefits };
}
