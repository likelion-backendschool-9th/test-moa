"use server";

import { getSession } from "@/features/session/session";
import {
  canPayForSubscription,
  getSubscriptionOverview,
  grantMemberSubscription,
  requestCashPaymentReady,
  requestSubscriptionPayment,
  revokeMemberSubscription,
  saveSubscriptionPayment,
} from "@/features/subscription/api";
import { completePath, isMobileUserAgent, isPgProvider, kakaoRedirectUrl, tossWindowFrom, type TossWindow } from "@/features/subscription/pg";
import { parseMemberEmail, renewedExpiry } from "@/features/subscription/types";
import { isBackendAuth } from "@/lib/backend";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

/*
 * 구독 결제. 고른 상품과 결제 수단을 검사한 뒤, 백엔드 모드(AUTH_MODE=backend)에서는 서버에 결제를 요청하고(서버가 거절하면 그 이유를 보여 준다)
 * 아니면 시연용 쿠키(demo/subscription.ts)에 남긴다. 백엔드 모드의 현금은 결제 준비 뒤 카카오페이·토스 결제창으로 간다(#249).
 */

const PATH = "/my/subscription/checkout";

/* toss는 서버가 결제 준비를 마쳤으니 브라우저가 토스 결제창을 열라는 뜻이다 */
export type CheckoutFormState = { status: "idle" } | { status: "error"; error: string } | { status: "toss"; window: TossWindow };

export async function payForSubscription(_prev: CheckoutFormState, formData: FormData): Promise<CheckoutFormState> {
  const { subscription, plans, payableCredits } = await getSubscriptionOverview(PATH);
  const session = await getSession();

  const plan = plans.find(({ id }) => id === formData.get("plan"));
  if (!plan) return { status: "error", error: "상품을 골라 주세요" };
  const method = formData.get("method");
  if (method !== "credit" && method !== "cash") return { status: "error", error: "결제 수단을 골라 주세요" };

  if (isBackendAuth && method === "cash") {
    /* 현금은 카카오페이·토스 결제창을 거친다. 서버가 금액을 정하고, 승인은 결제창에서 돌아온 뒤 result 페이지가 부른다 */
    const provider = formData.get("provider");
    if (!isPgProvider(provider)) return { status: "error", error: "결제 대행사를 골라 주세요" };
    const prepared = await requestCashPaymentReady(plan.id, provider);
    if (!prepared.ok) return { status: "error", error: prepared.message };
    if (provider === "KAKAO_PAY") {
      const url = kakaoRedirectUrl(prepared.ready, isMobileUserAgent((await headers()).get("user-agent")));
      if (!url) return { status: "error", error: "결제창을 열지 못했어요. 잠시 후 다시 시도해 주세요" };
      redirect(url);
    }
    const window = tossWindowFrom(prepared.ready);
    if (!window) return { status: "error", error: "결제창을 열지 못했어요. 잠시 후 다시 시도해 주세요" };
    return { status: "toss", window };
  }

  if (isBackendAuth) {
    /* 운영자 계정, 크레딧 부족, 5초 안의 재결제는 서버가 거절하고 그 이유를 보여 준다. 화면이 미리 막지 않는다 */
    const paid = await requestSubscriptionPayment(plan.id, method);
    if (!paid.ok) return { status: "error", error: paid.message };
    /* 크레딧 결제만 여기서 끝난다(현금은 위에서 결제창으로 간다). 헤더·마이페이지·구독 화면이 서버의 새 구독 상태를 읽게 한다 */
    revalidatePath("/", "layout");
    redirect(completePath(paid.paymentId));
  }

  /* 목업은 서버가 없어서 여기서 검사한다 */
  if (!subscription || session.role === "guest") return { status: "error", error: "운영자 계정은 구독할 수 없어요" };
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

/* ---------- 운영자 구독 부여·해제 (#204) ---------- */

export type MemberSubscriptionFormState = { status: "idle" } | { status: "done"; message: string } | { status: "error"; error: string };

/** 운영자 화면의 "구독 주기"·"구독 빼기". 어느 쪽인지는 누른 버튼의 intent 값이 정한다. 시연·확인용이라 결제는 남지 않는다 */
export async function changeMemberSubscription(_prev: MemberSubscriptionFormState, formData: FormData): Promise<MemberSubscriptionFormState> {
  const email = parseMemberEmail(formData.get("email")?.toString());
  if (!email) return { status: "error", error: "이메일을 입력해 주세요" };
  const intent = formData.get("intent");
  if (intent !== "grant" && intent !== "revoke") return { status: "error", error: "처리 방법을 알 수 없어요" };

  const result = intent === "grant" ? await grantMemberSubscription(email) : await revokeMemberSubscription(email);
  if (!result.ok) return { status: "error", error: result.message };
  /* 같은 주소의 검색 결과(구독 상태)가 새 값으로 다시 그려지게 한다 */
  revalidatePath("/admin/subscriptions");
  return { status: "done", message: intent === "grant" ? "구독했어요" : "구독을 뺐어요" };
}
