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
import { assertAdmin, requireMember } from "@/features/session/guard";
import { getSession, type Role } from "@/features/session/session";
import { readProviders, type PgApproval, type PgProvider, type PgReady } from "@/features/subscription/pg";
import type { CheckoutPeriod, FreePlan, MemberSubscription, MemberSubscriptionLookup, Subscription, SubscriptionIntro, SubscriptionOverview, SubscriptionPlan } from "@/features/subscription/types";
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

/**
 * 결제 화면의 이용 기간과 지금 쓸 수 있는 현금 결제 대행사. 플랜마다 서버가 계산한 시작·끝이다(구독 중이면 지금 만료일부터 이어진다).
 * 목업에는 서버 값이 없어 null이고, 그때는 화면이 직접 계산하고 결제 대행사 칸을 보이지 않는다
 */
export async function getCheckoutInfo(plans: SubscriptionPlan[]): Promise<CheckoutInfo | null> {
  if (!isBackendAuth) return null;
  const results = await Promise.all(
    plans.map(async ({ id }) => {
      const result = await backendFetch<{ period: CheckoutPeriod | null; providers?: unknown }>(`/api/v1/my/subscription/checkout?planId=${encodeURIComponent(id)}`);
      if (!result.ok) throw new Error(result.message);
      return [id, result.data] as const;
    }),
  );
  const periods = Object.fromEntries(
    results.flatMap(([id, data]) => (data.period ? [[id, data.period] as const] : [])),
  ) as Record<string, CheckoutPeriod>;
  /* 결제 대행사는 플랜과 상관없는 값이라 첫 응답에서 읽는다 */
  return { periods, providers: readProviders(results[0]?.[1].providers) };
}

export type CheckoutInfo = { periods: Record<string, CheckoutPeriod>; providers: PgProvider[] };

export type SubscriptionPaymentResult = { ok: true } | { ok: false; message: string };

/** 서버에 구독 결제를 요청한다. 5초 안의 중복·크레딧 부족·운영자 계정이면 서버가 거절하고, 그 이유 문구를 돌려준다 */
export async function requestSubscriptionPayment(planId: string, method: "credit" | "cash"): Promise<SubscriptionPaymentResult> {
  await requireMember("/my/subscription/checkout");
  const result = await backendFetch<unknown>("/api/v1/my/subscription/checkout", {
    method: "POST",
    body: { planId: Number(planId), method: method === "credit" ? "CREDIT" : "CASH" },
  });
  return result.ok ? { ok: true } : { ok: false, message: result.message };
}

export type CashReadyResult = { ok: true; ready: PgReady } | { ok: false; message: string };

/** 현금 결제 준비. 서버가 금액을 정하고 시도를 저장해 결제창 정보를 준다. 키가 없는 대행사·5초 안의 중복·운영자 계정이면 서버가 거절한다 */
export async function requestCashPaymentReady(planId: string, provider: PgProvider): Promise<CashReadyResult> {
  await requireMember("/my/subscription/checkout");
  const result = await backendFetch<PgReady>("/api/v1/my/subscription/checkout/ready", {
    method: "POST",
    body: { planId: Number(planId), provider },
  });
  return result.ok ? { ok: true, ready: result.data } : { ok: false, message: result.message };
}

/** 결제창에서 돌아온 값으로 서버에 승인을 요청한다. 거절하면 그 이유 문구를 돌려준다(이미 승인했거나 만료된 결제 등) */
export async function approveCashPayment(approval: PgApproval): Promise<SubscriptionPaymentResult> {
  await requireMember("/my/subscription/checkout");
  const result = await backendFetch<unknown>("/api/v1/my/subscription/checkout/approve", { method: "POST", body: approval });
  return result.ok ? { ok: true } : { ok: false, message: result.message };
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

/* ---------- 운영자 구독 부여·해제 (#204) ---------- */

const ADMIN_SUBSCRIPTIONS = "/api/v1/admin/subscriptions";

type MemberSubscriptionResponse = {
  nickname: string;
  email: string;
  eligible: boolean;
  active: boolean | null;
  plan: string | null;
  endAt: string | null;
  remainingDays: number | null;
};

const toMemberSubscription = (data: MemberSubscriptionResponse): MemberSubscription => ({
  nickname: data.nickname,
  email: data.email,
  eligible: data.eligible,
  active: data.active === true,
  plan: data.plan,
  endAt: data.endAt,
  remainingDays: data.remainingDays,
});

export type MemberSubscriptionChange = { ok: true; member: MemberSubscription } | { ok: false; message: string };

/** 이메일로 회원의 구독 상태를 본다. 가입하지 않은 이메일은 not-found다 */
export async function findMemberSubscription(email: string): Promise<MemberSubscriptionLookup> {
  await assertAdmin();
  const result = await backendFetch<MemberSubscriptionResponse>(`${ADMIN_SUBSCRIPTIONS}?email=${encodeURIComponent(email)}`);
  if (result.ok) return { status: "found", member: toMemberSubscription(result.data) };
  if (result.status === 404) return { status: "not-found" };
  throw new Error(result.message);
}

/** 결제 없이 구독을 준다. 지금 파는 첫 플랜으로 준다(운영자 화면은 플랜 하나를 가정한다) */
export async function grantMemberSubscription(email: string): Promise<MemberSubscriptionChange> {
  await assertAdmin();
  const [plan] = await readPlans();
  if (!plan) return { ok: false, message: "지금 파는 구독 플랜이 없어요" };
  const result = await backendFetch<MemberSubscriptionResponse>(ADMIN_SUBSCRIPTIONS, {
    method: "POST",
    body: { email, planId: Number(plan.id) },
  });
  return result.ok ? { ok: true, member: toMemberSubscription(result.data) } : { ok: false, message: result.message };
}

/** 끝나지 않은 구독을 모두 뺀다 */
export async function revokeMemberSubscription(email: string): Promise<MemberSubscriptionChange> {
  await assertAdmin();
  const result = await backendFetch<MemberSubscriptionResponse>(`${ADMIN_SUBSCRIPTIONS}?email=${encodeURIComponent(email)}`, {
    method: "DELETE",
  });
  return result.ok ? { ok: true, member: toMemberSubscription(result.data) } : { ok: false, message: result.message };
}
