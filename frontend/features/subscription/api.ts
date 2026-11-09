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
import type { Subscription, SubscriptionIntro, SubscriptionOverview } from "@/features/subscription/types";
import { connection } from "next/server";
import "server-only";

/** 구독 관리·구독 결제 화면 데이터. 운영자는 구독 대상이 아니라 subscription이 null이다 */
export async function getSubscriptionOverview(next = "/my/subscription"): Promise<SubscriptionOverview> {
  const session = await requireMember(next);
  await waitIfSlow();
  await connection();
  const now = new Date();
  const [subscription, { balance }] = await Promise.all([subscriptionFor(session.role, now), creditDataFor(session.role, now)]);
  return {
    subscription,
    freePlan: FREE_PLAN,
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
  if (session.role === "guest") {
    return { freePlan: FREE_PLAN, plans: SUBSCRIPTION_PLANS, subscription: { status: "none" }, isGuest: true };
  }
  return {
    freePlan: FREE_PLAN,
    plans: SUBSCRIPTION_PLANS,
    subscription: await subscriptionFor(session.role, new Date()),
    isGuest: false,
  };
}

/**
 * 이 브라우저에서 시연용 구독 결제를 했으면 마지막 결제가 정한 만료일, 아니면 목업 구독. 운영자는 null.
 * 목업 만료일은 조회 시각 기준이라 결제 뒤에는 쓰지 않는다 (결제할 때 고정한 만료일이 줄어들며 만료된다)
 */
export async function subscriptionFor(role: Exclude<Role, "guest">, now: Date): Promise<Subscription | null> {
  const { subscription } = buildMyPageSummary(role, now);
  if (!subscription) return null;
  const last = (await getDemoSubscriptionPayments(role)).at(-1);
  if (!last) return subscription;
  return new Date(last.expiresAt) > now ? { status: "active", planId: last.planId, expiresAt: last.expiresAt } : { status: "none" };
}

export async function canPayForSubscription(role: Parameters<typeof getDemoSubscriptionPayments>[0]) {
  await requireMember("/my/subscription/checkout");
  return (await getDemoSubscriptionPayments(role)).length < MAX_DEMO_PAYMENTS;
}

export async function saveSubscriptionPayment(role: Parameters<typeof addDemoSubscriptionPayment>[0], payment: Parameters<typeof addDemoSubscriptionPayment>[1]) {
  await requireMember("/my/subscription/checkout");
  return addDemoSubscriptionPayment(role, payment);
}
