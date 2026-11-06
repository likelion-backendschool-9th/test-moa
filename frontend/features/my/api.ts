import { buildMyPageSummary } from "@/demo/member";
import { waitIfSlow } from "@/demo/mode";
import { FREE_PLAN,getDemoSubscriptionPayments,monthlyRecruitUsed,SUBSCRIPTION_PLANS } from "@/demo/subscription";
import { creditDataFor } from "@/features/credit/api";
import { payableCredits } from "@/features/credit/types";
import { getMemberProfile } from "@/features/member/api";
import type { Profile } from "@/features/member/types";
import { requireMember } from "@/features/session/guard";
import type { Role } from "@/features/session/session";
import { formatDday } from "@/lib/format";
import { connection } from "next/server";
import "server-only";
import type { MyPageSummary,Subscription,SubscriptionOverview,Todo } from "./types";

/*
 * 마이페이지 데이터 접근. 지금은 목업을 돌려준다.
 * 실제 API를 붙일 때는 이 파일의 함수 본문만 바꾸고 시그니처는 유지한다.
 */

const RECENT_CREDITS = 5;

/** 로그인한 회원의 마이페이지 요약. 비로그인이면 로그인으로 보낸다 */
export async function getMyPageSummary(): Promise<MyPageSummary> {
  const session = await requireMember("/my");
  await waitIfSlow();
  /* 구독 만료일은 요청 시각 기준이라 미리 렌더링하지 않는다 */
  await connection();
  const now = new Date();
  const summary = buildMyPageSummary(session.role, now);
  const [credit, subscription] = await Promise.all([creditDataFor(session.role, now), subscriptionFor(session.role, now)]);
  return {
    ...summary,
    subscription,
    profile: getMemberProfile(session.role),
    todos: sortTodos(summary.todos, now),
    credits: credit.balance,
    recentCredits: credit.ledger.slice(0, RECENT_CREDITS),
  };
}

/** 개인정보 수정에 채울 현재 회원 정보. 비로그인이면 로그인으로 보낸다 */
export async function getProfile(next: string): Promise<Profile> {
  const session = await requireMember(next);
  await waitIfSlow();
  return getMemberProfile(session.role);
}

const TODO_LIMIT = 5;

/** 마감이 있는 할 일이 먼저, 가까운 순서. 마감 항목의 detail은 D-day로 채운다 */
function sortTodos(todos: Todo[], now: Date): Todo[] {
  const withDue = todos.filter((todo) => todo.dueAt).sort((a, b) => a.dueAt!.localeCompare(b.dueAt!));
  const rest = todos.filter((todo) => !todo.dueAt);
  return [...withDue, ...rest]
    .slice(0, TODO_LIMIT)
    .map((todo) => (todo.dueAt ? { ...todo, detail: formatDday(todo.dueAt, now) } : todo));
}

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
async function subscriptionFor(role: Exclude<Role, "guest">, now: Date): Promise<Subscription | null> {
  const { subscription } = buildMyPageSummary(role, now);
  if (!subscription) return null;
  const last = (await getDemoSubscriptionPayments(role)).at(-1);
  if (!last) return subscription;
  return new Date(last.expiresAt) > now ? { status: "active", planId: last.planId, expiresAt: last.expiresAt } : { status: "none" };
}


import { addDemoSubscriptionPayment,MAX_DEMO_PAYMENTS } from "@/demo/subscription";

export async function canPayForSubscription(role: Parameters<typeof getDemoSubscriptionPayments>[0]) {
  await requireMember("/my/subscription/checkout");
  return (await getDemoSubscriptionPayments(role)).length < MAX_DEMO_PAYMENTS;
}

export async function saveSubscriptionPayment(role: Parameters<typeof addDemoSubscriptionPayment>[0], payment: Parameters<typeof addDemoSubscriptionPayment>[1]) {
  await requireMember("/my/subscription/checkout");
  return addDemoSubscriptionPayment(role, payment);
}
