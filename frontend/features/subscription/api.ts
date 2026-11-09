import { buildMyPageSummary } from "@/demo/member";
import { waitIfSlow } from "@/demo/mode";
import {
  addDemoSubscriptionPayment,
  FREE_PLAN,
  getDemoSubscriptionPayments,
  MAX_DEMO_PAYMENTS,
  SUBSCRIPTION_PLANS,
} from "@/demo/subscription";
import { creditDataFor } from "@/features/credit/api";
import { payableCredits } from "@/features/credit/types";
import { requireMember } from "@/features/session/guard";
import { getSession, type Role } from "@/features/session/session";
import type { FreePlan, Subscription, SubscriptionIntro, SubscriptionOverview, SubscriptionPlan } from "@/features/subscription/types";
import { backendFetch, isBackendAuth } from "@/lib/backend";
import { connection } from "next/server";
import "server-only";

/** 구독 관리·구독 결제 화면 데이터. 운영자는 구독 대상이 아니라 subscription이 null이다 */
export async function getSubscriptionOverview(next = "/my/subscription"): Promise<SubscriptionOverview> {
  const session = await requireMember(next);
  await waitIfSlow();
  await connection();
  const now = new Date();
  if (isBackendAuth) {
    const [subscription, plans, credits] = await Promise.all([subscriptionFor(session.role, now), readPlans(), readPayableCredits()]);
    return { subscription, plans, payableCredits: credits, now: now.toISOString() };
  }
  const [subscription, { balance }] = await Promise.all([subscriptionFor(session.role, now), creditDataFor(session.role, now)]);
  return {
    subscription,
    plans: SUBSCRIPTION_PLANS,
    payableCredits: payableCredits(balance),
    now: now.toISOString(),
  };
}

/** 공개 구독 소개. 로그인 없이 상품·무료 조건을 읽고, 회원이면 구독 상태도 붙인다 */
export async function getSubscriptionIntro(): Promise<SubscriptionIntro> {
  const session = await getSession();
  await waitIfSlow();
  await connection();
  const catalog = isBackendAuth ? Promise.all([readFreePlan(), readPlans()]) : Promise.resolve([FREE_PLAN, SUBSCRIPTION_PLANS] as const);
  if (session.role === "guest") {
    const [freePlan, plans] = await catalog;
    return { freePlan, plans, subscription: { status: "none" }, isGuest: true };
  }
  /* 상품과 내 구독 상태는 서로 독립이라 함께 기다린다 */
  const [[freePlan, plans], subscription] = await Promise.all([catalog, subscriptionForGlance(session.role, new Date())]);
  return { freePlan, plans, subscription, isGuest: false };
}

type PlanResponse = {
  id: number;
  tier: string;
  cashPrice: number;
  creditPrice: number;
  periodDays: number;
  benefits: string[];
};

/** 지금 파는 구독 플랜. 로그인이 필요 없어 토큰을 붙이지 않는다(로그아웃·정지로 막힌 회원도 소개를 읽는다) */
async function readPlans(): Promise<SubscriptionPlan[]> {
  const result = await backendFetch<PlanResponse[]>("/api/v1/plans", { withToken: false });
  if (!result.ok) throw new Error(result.message);
  return result.data.map(({ id, tier, periodDays, cashPrice, creditPrice, benefits }) => ({
    id: String(id),
    name: tier,
    periodDays,
    cashPrice,
    creditPrice,
    benefits,
  }));
}

/** 무료 플랜의 이름과 혜택. 서버에 값이 없으면 이름 FREE와 빈 혜택이 온다 */
async function readFreePlan(): Promise<FreePlan> {
  const result = await backendFetch<{ tier: string; benefits: string[] }>("/api/v1/plans/free", { withToken: false });
  if (!result.ok) throw new Error(result.message);
  return { name: result.data.tier, benefits: result.data.benefits };
}

/** 구독 결제에 쓸 수 있는 크레딧(이벤트 + 적립, 출금 처리 중 제외) */
async function readPayableCredits(): Promise<number> {
  const result = await backendFetch<{ eligible: boolean; payableCredits: number | null }>("/api/v1/my/subscription/payable-credits");
  if (!result.ok) throw new Error(result.message);
  return result.data.payableCredits ?? 0;
}

/** 내 구독 상태. 운영자는 구독 대상이 아니라 null */
async function readSubscription(): Promise<Subscription | null> {
  const result = await backendFetch<{ eligible: boolean; active: boolean | null; planId: number | null; plan: string | null; endAt: string | null }>(
    "/api/v1/my/subscription/status",
  );
  if (!result.ok) throw new Error(result.message);
  const { eligible, active, planId, plan, endAt } = result.data;
  if (!eligible) return null;
  return active && planId !== null && plan !== null && endAt !== null
    ? { status: "active", planId: String(planId), planName: plan, expiresAt: endAt }
    : { status: "none" };
}

/**
 * 이 브라우저에서 시연용 구독 결제를 했으면 마지막 결제가 정한 만료일, 아니면 목업 구독. 운영자는 null.
 * 목업 만료일은 조회 시각 기준이라 결제 뒤에는 쓰지 않는다 (결제할 때 고정한 만료일이 줄어들며 만료된다)
 * 백엔드 모드(`AUTH_MODE=backend`)에서는 서버 값을 읽고, role과 now는 목업에서만 쓴다
 */
export async function subscriptionFor(role: Exclude<Role, "guest">, now: Date): Promise<Subscription | null> {
  if (isBackendAuth) return readSubscription();
  const { subscription } = buildMyPageSummary(role, now);
  if (!subscription) return null;
  const last = (await getDemoSubscriptionPayments(role)).at(-1);
  if (!last) return subscription;
  return new Date(last.expiresAt) > now ? { status: "active", planId: last.planId, expiresAt: last.expiresAt } : { status: "none" };
}

/**
 * 구독 관리가 아닌 화면(마이페이지 요약, 공개 구독 소개)이 쓰는 구독 상태.
 * 서버 조회가 실패해도(토큰 만료 등) 화면 전체를 오류로 만들지 않고 미구독으로 본다. 구독 관리·결제 화면은 subscriptionFor로 오류를 그대로 낸다
 */
export async function subscriptionForGlance(role: Exclude<Role, "guest">, now: Date): Promise<Subscription | null> {
  try {
    return await subscriptionFor(role, now);
  } catch {
    return { status: "none" };
  }
}

export async function canPayForSubscription(role: Parameters<typeof getDemoSubscriptionPayments>[0]) {
  await requireMember("/my/subscription/checkout");
  return (await getDemoSubscriptionPayments(role)).length < MAX_DEMO_PAYMENTS;
}

export async function saveSubscriptionPayment(role: Parameters<typeof addDemoSubscriptionPayment>[0], payment: Parameters<typeof addDemoSubscriptionPayment>[1]) {
  await requireMember("/my/subscription/checkout");
  return addDemoSubscriptionPayment(role, payment);
}
