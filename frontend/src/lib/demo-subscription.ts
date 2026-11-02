import "server-only";
import { cookies } from "next/headers";
import type { Role } from "./session";

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
  /** 결제로 늘어나는 날 수. 상품 기간이 바뀌어도 이미 낸 결제는 그대로 계산한다 */
  periodDays: number;
  paidAt: string;
};

const COOKIE_PREFIX = "demo-subscription-";
/* 지운 결제가 있으면 만료일과 크레딧 잔액이 함께 틀어져서, 오래된 기록을 지우지 않고 더 받지 않는다 */
export const MAX_DEMO_PAYMENTS = 10;
const MAX_AGE_SECONDS = 90 * 24 * 60 * 60;

const cookieName = (role: MemberRole) => `${COOKIE_PREFIX}${role}`;

function isPayment(value: unknown): value is DemoSubscriptionPayment {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.planId === "string" &&
    (item.method === "credit" || item.method === "cash") &&
    typeof item.amount === "number" &&
    typeof item.periodDays === "number" &&
    typeof item.paidAt === "string"
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

/** Server Action에서만 부른다. 결제를 맨 뒤에 더한다 */
export async function addDemoSubscriptionPayment(role: MemberRole, payment: Omit<DemoSubscriptionPayment, "id" | "paidAt">) {
  const now = new Date();
  const stored = [...(await getDemoSubscriptionPayments(role)), { ...payment, id: `demo-${now.getTime()}`, paidAt: now.toISOString() }];
  (await cookies()).set(cookieName(role), JSON.stringify(stored), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: MAX_AGE_SECONDS,
  });
}
