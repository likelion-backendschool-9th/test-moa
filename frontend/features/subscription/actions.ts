"use server";

import { getSession } from "@/features/session/session";
import { canPayForSubscription,getSubscriptionOverview,saveSubscriptionPayment } from "@/features/subscription/api";
import { renewedExpiry } from "@/features/subscription/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/*
 * 구독 결제. 지금은 목업이라 고른 상품과 결제 수단을 검사한 뒤 시연용 쿠키(lib/demo-subscription.ts)에 남긴다.
 * 실제 API를 붙일 때는 addDemoSubscriptionPayment 대신 결제를 요청한다.
 */

const PATH = "/my/subscription/checkout";

export type CheckoutFormState = { status: "idle" } | { status: "error"; error: string };

export async function payForSubscription(_prev: CheckoutFormState, formData: FormData): Promise<CheckoutFormState> {
  const { subscription, plans, payableCredits } = await getSubscriptionOverview(PATH);
  const session = await getSession();
  if (!subscription || session.role === "guest") return { status: "error", error: "운영자 계정은 구독할 수 없어요" };

  const plan = plans.find(({ id }) => id === formData.get("plan"));
  if (!plan) return { status: "error", error: "상품을 골라 주세요" };
  const method = formData.get("method");
  if (method !== "credit" && method !== "cash") return { status: "error", error: "결제 수단을 골라 주세요" };
  if (method === "credit" && payableCredits < plan.creditPrice) {
    return { status: "error", error: "구독 결제에 쓸 수 있는 크레딧이 모자라요. 현금 결제를 골라 주세요" };
  }
  if (!(await canPayForSubscription(session.role))) {
    return { status: "error", error: "시연용 결제 기록이 가득 차서 더 결제할 수 없어요" };
  }

  await saveSubscriptionPayment(session.role, {
    planId: plan.id,
    method,
    amount: method === "credit" ? plan.creditPrice : plan.cashPrice,
    expiresAt: renewedExpiry(subscription, plan.periodDays, new Date()),
  });
  /* 헤더 크레딧, 마이페이지 대시보드, 크레딧 내역이 모두 결제를 반영하게 한다 */
  revalidatePath("/", "layout");
  redirect("/my/subscription?notice=paid");
}
