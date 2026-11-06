import { buildMyPageSummary } from "@/demo/member";
import { waitIfSlow } from "@/demo/mode";
import { addDemoSubscriptionPayment,FREE_PLAN,getDemoSubscriptionPayments,MAX_DEMO_PAYMENTS,monthlyRecruitUsed,SUBSCRIPTION_PLANS } from "@/demo/subscription";
import { creditDataFor } from "@/features/credit/api";
import { payableCredits } from "@/features/credit/types";
import { requireMember } from "@/features/session/guard";
import type { Role } from "@/features/session/session";
import type { Subscription,SubscriptionOverview } from "@/features/subscription/types";
import { connection } from "next/server";
import "server-only";


/** 구독 관리·구독 결제 화면 데이터. 운영자는 구독 대상이 아니라 subscription이 null이다 */
export async function getSubscriptionOverview(next = "/my/subscription"): Promise<SubscriptionOverview> {
  const session = await requireMember(next);
  await waitIfSlow();
  await connection();
  const now = new Date();
  const [subscription, { balance }] = await Promise.all([subscriptionFor(session.role, now), creditDataFor(session.role, now)]);
  const plan = subscription?.status === "active" ? SUBSCRIPTION_PLANS.find(({ id }) => id === subscription.planId) : undefined;
  return {
    subscription,
    freePlan: FREE_PLAN,
    plans: SUBSCRIPTION_PLANS,
    recruitQuota: {
      used: monthlyRecruitUsed(session.role),
      limit: (plan ?? FREE_PLAN).monthlyLimit,
      resetsAt: startOfNextMonthInSeoul(now),
    },
    payableCredits: payableCredits(balance),
    now: now.toISOString(),
  };
}


const SEOUL_OFFSET_MS = 9 * 60 * 60 * 1000;


/** 한국 시간 기준 다음 달 1일 0시 */
function startOfNextMonthInSeoul(now: Date) {
  const seoul = new Date(now.getTime() + SEOUL_OFFSET_MS);
  return new Date(Date.UTC(seoul.getUTCFullYear(), seoul.getUTCMonth() + 1, 1) - SEOUL_OFFSET_MS).toISOString();
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
