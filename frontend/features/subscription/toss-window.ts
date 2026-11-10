import type { TossWindow } from "@/features/subscription/pg";

/**
 * 토스페이 결제창을 연다(자체창 직접 열기). 성공하면 토스가 successUrl로 이동시켜서 이 함수는 돌아오지 않는다.
 * 돌아오면 사용자가 창을 닫았거나 열지 못한 것이라 화면에 보일 문구를 돌려준다.
 * target이 self면 결제창을 지금 창에서 열고(결제 팝업 안), 아니면 토스 기본 방식으로 연다
 */
export async function openTossWindow(window: TossWindow, target: "self" | "default" = "default"): Promise<string> {
  try {
    const { loadTossPayments } = await import("@tosspayments/tosspayments-sdk");
    const toss = await loadTossPayments(window.clientKey);
    await toss.payment({ customerKey: window.customerKey }).requestPayment({
      method: "CARD",
      amount: { currency: "KRW", value: window.amount },
      orderId: window.orderId,
      orderName: window.orderName,
      successUrl: window.successUrl,
      failUrl: window.failUrl,
      card: { flowMode: "DIRECT", easyPay: "토스페이" },
      ...(target === "self" ? { windowTarget: "self" as const } : {}),
    });
    return "";
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code: unknown }).code) : "";
    return code === "USER_CANCEL" || code === "PAY_PROCESS_CANCELED" ? "결제를 취소했어요" : "결제창을 열지 못했어요. 잠시 후 다시 시도해 주세요";
  }
}
