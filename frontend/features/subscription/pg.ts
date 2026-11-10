/*
 * 구독 현금 결제(카카오페이·토스페이)의 화면 쪽 값과 계산 (#249).
 * 서버 호출은 api.ts가 하고, 여기에는 서버 없이 확인할 수 있는 계산만 둔다.
 */

export type PgProvider = "KAKAO_PAY" | "TOSS_PAY";

export const PG_PROVIDERS: readonly PgProvider[] = ["KAKAO_PAY", "TOSS_PAY"];

export const PG_LABEL: Record<PgProvider, string> = {
  KAKAO_PAY: "카카오페이",
  TOSS_PAY: "토스페이",
};

export function isPgProvider(value: unknown): value is PgProvider {
  return value === "KAKAO_PAY" || value === "TOSS_PAY";
}

/** 서버가 준 결제 대행사 목록에서 알 수 있는 값만 남긴다 */
export function readProviders(value: unknown): PgProvider[] {
  return Array.isArray(value) ? value.filter(isPgProvider) : [];
}

/** 모바일 브라우저면 카카오페이 모바일 결제창 주소를 쓴다 */
export function isMobileUserAgent(userAgent: string | null | undefined): boolean {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent ?? "");
}

/** 결제 준비 응답. 카카오페이는 결제창 주소, 토스는 브라우저가 결제창을 여는 값이 채워진다 */
export type PgReady = {
  orderId: string;
  provider: PgProvider;
  amount: number;
  orderName: string;
  redirectUrl?: string;
  mobileRedirectUrl?: string;
  clientKey?: string;
  customerKey?: string;
  successUrl?: string;
  failUrl?: string;
};

/** 결제 준비 응답에서 이동할 결제창 주소. 모바일이고 모바일 주소가 있으면 그것을 쓴다 */
export function kakaoRedirectUrl(ready: Pick<PgReady, "redirectUrl" | "mobileRedirectUrl">, mobile: boolean): string | null {
  return (mobile ? ready.mobileRedirectUrl : undefined) ?? ready.redirectUrl ?? null;
}

/** 토스 결제창을 열 값. 하나라도 빠지면 결제창을 열 수 없다 */
export type TossWindow = {
  orderId: string;
  amount: number;
  orderName: string;
  clientKey: string;
  customerKey: string;
  successUrl: string;
  failUrl: string;
};

export function tossWindowFrom(ready: PgReady): TossWindow | null {
  const { clientKey, customerKey, successUrl, failUrl } = ready;
  if (!clientKey || !customerKey || !successUrl || !failUrl) return null;
  return { orderId: ready.orderId, amount: ready.amount, orderName: ready.orderName, clientKey, customerKey, successUrl, failUrl };
}

/** 승인 요청 본문. 서버는 시도의 결제 대행사로 어느 값을 쓸지 정한다 */
export type PgApproval = { orderId: string; pgToken?: string; paymentKey?: string; amount?: number };

type Query = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  return first ? first : undefined;
}

/**
 * 결제창에서 돌아온 주소의 쿼리를 승인 요청 값으로 바꾼다.
 * 카카오페이는 orderId와 pg_token, 토스는 orderId·paymentKey·amount가 있어야 하고, 아니면 null(승인할 수 없음)이다
 */
export function approvalFromQuery(query: Query): PgApproval | null {
  const orderId = one(query.orderId);
  if (!orderId) return null;
  const pgToken = one(query.pg_token);
  if (pgToken) return { orderId, pgToken };
  const paymentKey = one(query.paymentKey);
  const amount = Number(one(query.amount));
  if (paymentKey && Number.isInteger(amount) && amount > 0) return { orderId, paymentKey, amount };
  return null;
}

/** 결제창에서 취소하거나 실패해 결제 화면으로 돌아왔을 때 폼 위에 보일 안내. 알 수 없는 값은 보이지 않는다 */
export function pgNotice(value: string | string[] | undefined): string | null {
  switch (one(value)) {
    case "cancel":
      return "결제를 취소했어요";
    case "fail":
      return "결제하지 못했어요. 다시 시도해 주세요";
    default:
      return null;
  }
}

/** 결제 완료 화면이 보여 주는 결제 한 건. 서버의 결제 이력 한 줄을 화면 값으로 바꾼 것이다 */
export type PaymentReceipt = {
  id: string;
  plan: string;
  method: "CASH" | "CREDIT";
  provider: PgProvider | null;
  amount: number;
  paidAt: string;
  period: { startAt: string; endAt: string };
};

type ServerPayment = {
  paymentId: number;
  plan: string;
  method: "CASH" | "CREDIT";
  provider?: string | null;
  amount: number;
  paidAt: string;
  period: { startAt: string; endAt: string };
};

export function receiptFromServer(payment: ServerPayment): PaymentReceipt {
  return {
    id: String(payment.paymentId),
    plan: payment.plan,
    method: payment.method,
    provider: isPgProvider(payment.provider) ? payment.provider : null,
    amount: payment.amount,
    paidAt: payment.paidAt,
    period: payment.period,
  };
}

/** 결제 수단 문구. 크레딧, 카카오페이·토스페이, PG 연동 전의 현금 결제는 "현금"이다 */
export function receiptMethodLabel({ method, provider }: Pick<PaymentReceipt, "method" | "provider">): string {
  if (method === "CREDIT") return "크레딧";
  return provider ? PG_LABEL[provider] : "현금";
}

/** 서버 결제 id가 될 수 있는 숫자만 받는다(0으로 시작하지 않는 18자리 이하). 아니면 서버에 묻지 않는다 */
export function parsePaymentId(value: string | string[] | undefined): string | null {
  const id = one(value);
  return id && /^[1-9]\d{0,17}$/.test(id) ? id : null;
}

/** 결제가 끝난 뒤 보낼 곳. 결제 id를 알면 결제 완료 화면, 모르면 구독 화면이다 */
export function completePath(paymentId: string | null): string {
  return paymentId ? `/my/subscription/checkout/complete?payment=${paymentId}` : "/my/subscription?notice=paid";
}
