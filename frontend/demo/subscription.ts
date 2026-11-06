import type { PlanTerms, SubscriptionPlan } from "@/features/subscription/types";
import type { Role } from "@/features/session/session";
import { cookies } from "next/headers";
import "server-only";


/*
 * 시연용 구독 결제 기록. 실제 결제가 없어서 결제를 브라우저 쿠키 demo-subscription-<역할>에만 남긴다.
 * 구독 만료일(features/my), 크레딧 잔액·내역(features/credit), 헤더 크레딧(session.ts)이 이 기록을 함께 읽는다.
 * 쿠키라서 다른 브라우저·다른 시연 회원과 섞이지 않고, 병렬 E2E도 서로의 결제를 보지 않는다.
 * 실제 API를 붙이면 이 파일과 읽는 세 곳, 저장하는 한 곳(features/my/subscription-actions.ts)을 지운다.
 */

type MemberRole = Exclude<Role, "guest">;


export type PaymentMethod = "credit" | "cash";


export type DemoSubscriptionPayment = {
  id: string;
  planId: string;
  method: PaymentMethod;
  /** 크레딧 결제면 크레딧, 현금 결제면 원 */
  amount: number;
  paidAt: string;
  /** 이 결제로 정해진 만료일. 결제할 때 계산해 고정하므로, 시간이 지나면 남은 기간이 줄고 만료된다 */
  expiresAt: string;
};


const COOKIE_PREFIX = "demo-subscription-";

/* 지운 결제가 있으면 만료일과 크레딧 잔액이 함께 틀어져서, 오래된 기록을 지우지 않고 더 받지 않는다 */
export const MAX_DEMO_PAYMENTS = 10;

const DAY_MS = 24 * 60 * 60 * 1000;

/* 만료 뒤에도 잠시 남겨 둬서, 만료 직후 크레딧 차감 내역이 바로 사라지지 않게 한다 */
const KEEP_AFTER_EXPIRY_MS = 30 * DAY_MS;


const cookieName = (role: MemberRole) => `${COOKIE_PREFIX}${role}`;


function isPayment(value: unknown): value is DemoSubscriptionPayment {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.planId === "string" &&
    (item.method === "credit" || item.method === "cash") &&
    typeof item.amount === "number" &&
    typeof item.paidAt === "string" &&
    typeof item.expiresAt === "string"
  );
}


/** 이 브라우저에서 낸 구독 결제, 오래된 순. 쿠키 값이 깨졌거나 모양이 다르면 기록이 없는 것으로 본다 */
export async function getDemoSubscriptionPayments(role: MemberRole): Promise<DemoSubscriptionPayment[]> {
  const raw = (await cookies()).get(cookieName(role))?.value;
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isPayment) : [];
  } catch {
    return [];
  }
}


/** 크레딧으로 낸 구독 결제 합계 */
export async function getDemoSubscriptionCreditSpent(role: MemberRole): Promise<number> {
  return (await getDemoSubscriptionPayments(role))
    .filter((payment) => payment.method === "credit")
    .reduce((sum, payment) => sum + payment.amount, 0);
}


/**
 * Server Action에서만 부른다. 결제를 맨 뒤에 더한다.
 * 쿠키는 가장 늦은 만료일보다 오래 남겨서, 여러 번 연장한 기간이나 크레딧 차감 기록이 이용 기간보다 먼저 사라지지 않게 한다
 */
export async function addDemoSubscriptionPayment(role: MemberRole, payment: Omit<DemoSubscriptionPayment, "id" | "paidAt">) {
  const now = new Date();
  const stored = [...(await getDemoSubscriptionPayments(role)), { ...payment, id: `demo-${now.getTime()}`, paidAt: now.toISOString() }];
  const lastExpiry = Math.max(...stored.map((item) => new Date(item.expiresAt).getTime()));
  (await cookies()).set(cookieName(role), JSON.stringify(stored), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: Math.ceil((lastExpiry + KEEP_AFTER_EXPIRY_MS - now.getTime()) / 1000),
  });
}


/** 무료 조건. 한도는 기획에서 미정이라 임시값이다 */
const SUBSCRIPTION_DAYS_LEFT = 30;

export const FREE_PLAN: PlanTerms = {
  monthlyLimit: 10,
  benefits: {
    selection: "선착순 자동 확정",
    reward: "기본 보상",
    chat: "없음",
    exposure: "일반 목록",
  },
};


/** 구독 상품. 가격·기간·한도는 기획에서 미정이라 임시값이다 (가격은 spec.md 3장의 예시 값) */
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "basic",
    name: "구독",
    periodDays: SUBSCRIPTION_DAYS_LEFT,
    cashPrice: 10000,
    creditPrice: 9000,
    monthlyLimit: 30,
    benefits: {
      selection: "지원자 중 직접 선정",
      reward: "기본 + 추가 보상",
      chat: "선정한 테스터와 가능",
      exposure: "상단 구독 영역",
    },
  },
];


/** 이번 달 모집 글에 건 인원 합계. 구독 중인 시연 회원만 모집 중인 글이 있다 */
export function monthlyRecruitUsed(role: Role) {
  return role === "developer" ? 12 : 0;
}
