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
import { readProviders, receiptFromServer, type PaymentReceipt, type PgApproval, type PgProvider, type PgReady } from "@/features/subscription/pg";
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
  const result = await fetchPlans();
  if (!result.ok) throw new Error(result.message);
  return result.plans;
}

/** readPlans와 같지만 실패하면 예외 대신 이유를 돌려준다. 저장 액션이 그 이유를 패널에 보여 준다 */
async function fetchPlans(): Promise<{ ok: true; plans: SubscriptionPlan[] } | { ok: false; message: string }> {
  const result = await backendFetch<PlanResponse[]>("/api/v1/plans", { withToken: false });
  if (!result.ok) return { ok: false, message: result.message };
  return {
    ok: true,
    plans: result.data.map(({ id, tier, periodDays, cashPrice, creditPrice, benefits }) => ({
      id: String(id),
      name: tier,
      periodDays,
      cashPrice,
      creditPrice,
      benefits,
    })),
  };
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

/** 결제 성공이면 서버가 만든 결제 id를 돌려준다(결제 완료 화면이 그 결제를 읽는다) */
export type SubscriptionPaymentResult = { ok: true; paymentId: string | null } | { ok: false; message: string };

function paymentIdOf(data: unknown): string | null {
  const id = typeof data === "object" && data !== null && "paymentId" in data ? (data as { paymentId: unknown }).paymentId : null;
  return typeof id === "number" && Number.isSafeInteger(id) ? String(id) : null;
}

/** 서버에 구독 결제를 요청한다. 5초 안의 중복·크레딧 부족·운영자 계정이면 서버가 거절하고, 그 이유 문구를 돌려준다 */
export async function requestSubscriptionPayment(planId: string, method: "credit" | "cash"): Promise<SubscriptionPaymentResult> {
  await requireMember("/my/subscription/checkout");
  const result = await backendFetch<unknown>("/api/v1/my/subscription/checkout", {
    method: "POST",
    body: { planId: Number(planId), method: method === "credit" ? "CREDIT" : "CASH" },
  });
  return result.ok ? { ok: true, paymentId: paymentIdOf(result.data) } : { ok: false, message: result.message };
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
  return result.ok ? { ok: true, paymentId: paymentIdOf(result.data) } : { ok: false, message: result.message };
}

/** 서버의 내 결제 이력(최신순). 내 결제만 나온다 */
async function readPayments(): Promise<PaymentReceipt[]> {
  const result = await backendFetch<Parameters<typeof receiptFromServer>[0][]>("/api/v1/my/subscription/payments");
  if (!result.ok) throw new Error(result.message);
  return result.data.map(receiptFromServer);
}

/**
 * 결제 완료 화면이 보여 줄 결제 한 건. 내 결제 이력에서 id로 찾는다(남의 결제 id는 찾지 못한다).
 * 목업이거나 이력에 없으면 null이다
 */
export async function getPaymentReceipt(paymentId: string): Promise<PaymentReceipt | null> {
  if (!isBackendAuth) return null;
  await requireMember("/my/subscription/checkout/complete");
  return (await readPayments()).find((payment) => payment.id === paymentId) ?? null;
}

/** 구독 화면의 결제 내역. 최신 결제부터 limit건과 전체 건수다. 목업에는 서버 결제가 없어 null이다 */
export async function getPaymentHistory(limit: number): Promise<{ items: PaymentReceipt[]; total: number } | null> {
  if (!isBackendAuth) return null;
  const payments = await readPayments();
  return { items: payments.slice(0, limit), total: payments.length };
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

/* ---------- 운영자 플랜 혜택 편집 (#257) ---------- */

export type AdminPlans = { freePlan: FreePlan; plans: SubscriptionPlan[] };

/** 편집 화면이 채울 현재 값. 무료 플랜과 지금 파는 구독 플랜이다 */
export async function getAdminPlans(): Promise<AdminPlans> {
  await assertAdmin();
  await connection();
  const [freePlan, plans] = await Promise.all([readFreePlan(), readPlans()]);
  return { freePlan, plans };
}

export type PlanSave = { ok: true } | { ok: false; message: string };

/** 무료 플랜의 이름과 혜택을 저장한다(서버가 없으면 만들고 있으면 고친다) */
export async function saveFreePlan(name: string, benefits: string[]): Promise<PlanSave> {
  await assertAdmin();
  const result = await backendFetch<unknown>("/api/v1/admin/plans/free", { method: "PUT", body: { tier: name, benefits } });
  return result.ok ? { ok: true } : { ok: false, message: result.message };
}

/**
 * 혜택을 고친 구독 플랜을 새 버전으로 등록한다. 편집 중에 판매 플랜이 바뀌었을 수 있어서 가격·기간은 양식 값이 아니라
 * 저장 시점의 서버 값(planId로 찾은 플랜)을 그대로 보낸다. 찾지 못하면 화면이 오래된 것이라 저장하지 않는다.
 * 서버가 version을 올린 새 행을 만들어서, 이미 구독한 회원의 조건은 그대로 남는다
 */
export async function registerPlanVersion(planId: string, benefits: string[]): Promise<PlanSave> {
  await assertAdmin();
  const current = await fetchPlans();
  if (!current.ok) return { ok: false, message: current.message };
  const plan = current.plans.find((candidate) => candidate.id === planId);
  if (!plan) return { ok: false, message: "지금 파는 플랜이 바뀌었어요. 화면을 새로고침해 주세요" };
  const { name, cashPrice, creditPrice, periodDays } = plan;
  const result = await backendFetch<unknown>("/api/v1/admin/plans", {
    method: "POST",
    body: { tier: name, cashPrice, creditPrice, periodDays, benefits },
  });
  return result.ok ? { ok: true } : { ok: false, message: result.message };
}
