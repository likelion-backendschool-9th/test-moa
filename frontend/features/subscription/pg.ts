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

/** 결제가 끝난 직후 보낼 곳. 결제 id를 알면 결제 완료 화면(방금 결제했다는 표시 포함), 모르면 구독 화면이다 */
export function completePath(paymentId: string | null): string {
  return paymentId ? `/my/subscription/checkout/complete?payment=${paymentId}&paid=1` : "/my/subscription?notice=paid";
}

/** 결제 내역에서 한 건을 볼 때 가는 곳. 같은 결제 화면이지만 방금 결제했다는 표시는 없다 */
export function receiptPath(paymentId: string): string {
  return `/my/subscription/checkout/complete?payment=${paymentId}`;
}

/** 결제 직후에 온 것이면 "결제가 완료됐어요", 내역에서 들어왔으면 "결제 내역"으로 보인다 */
export function isJustPaid(value: string | string[] | undefined): boolean {
  return one(value) === "1";
}

/* ---------- 결제 팝업 (#252) ---------- */

/**
 * PC에서 결제창을 여는 팝업의 창 이름 앞부분. 결제창을 거쳐 돌아온 팝업이 자기가 결제 팝업인지 알아보는 데 쓴다.
 * 창 이름은 팝업을 열 때마다 새로 만들어서, 같은 결제 화면을 연 다른 탭의 팝업과 구분되고 결과가 시작한 탭에만 간다
 */
export const POPUP_NAME = "moa-pay";

export function newPopupName(): string {
  return `${POPUP_NAME}-${crypto.randomUUID()}`;
}

export function isPopupName(name: unknown): name is string {
  return typeof name === "string" && name.startsWith(`${POPUP_NAME}-`) && name.length > POPUP_NAME.length + 1;
}

/** 팝업창 크기. 카카오페이 PC 결제창은 작은 팝업을 전제로 한 화면이라 좁고, 토스 자체창은 조금 더 넓게 연다 */
const POPUP_SIZE: Record<PgProvider, { width: number; height: number }> = {
  KAKAO_PAY: { width: 430, height: 620 },
  TOSS_PAY: { width: 480, height: 700 },
};

type WindowFrame = { screenX: number; screenY: number; outerWidth: number; outerHeight: number };

/** `window.open`에 줄 창 설정. 팝업이 원래 창의 가운데에 열리게 위치를 계산하고, 화면 밖으로 나가지 않게 0 이상으로 둔다 */
export function popupFeatures(provider: PgProvider, frame: WindowFrame): string {
  const { width, height } = POPUP_SIZE[provider];
  const left = Math.max(0, Math.round(frame.screenX + (frame.outerWidth - width) / 2));
  const top = Math.max(0, Math.round(frame.screenY + (frame.outerHeight - height) / 2));
  return `popup,width=${width},height=${height},left=${left},top=${top}`;
}

/** 결제 팝업이 원래 창에 알릴 수 있는 곳. 결제 화면 아래 주소만 받아서 다른 주소로 보내는 데 쓰이지 않게 한다 */
export function isPopupReturnPath(value: unknown): value is string {
  return typeof value === "string" && /^\/my\/subscription\/checkout(\/[a-z]+)?(\?[^#]*)?$/.test(value);
}

/**
 * 원래 창이 결제 팝업에 넘겨 주는 토스 결제창 값인지 본다. 값은 쿼리가 아니라 원래 창이 직접 보내므로 주소로 바꿔치기할 수 없고,
 * 여기서는 모양만 본다(빠진 값이 있거나 금액이 정수·양수가 아니면 결제창을 열지 않는다)
 */
export function isTossWindow(value: unknown): value is TossWindow {
  if (typeof value !== "object" || value === null) return false;
  const window = value as Record<string, unknown>;
  for (const key of ["orderId", "orderName", "clientKey", "customerKey", "successUrl", "failUrl"]) {
    if (typeof window[key] !== "string" || window[key] === "") return false;
  }
  return Number.isInteger(window.amount) && (window.amount as number) > 0;
}

/**
 * 결제 팝업이 보낸 메시지에서 원래 창이 이동할 주소를 꺼낸다. 이 창이 연 팝업(창 이름이 같음)이 보낸 결제 화면 아래 주소만 받고, 아니면 null이다.
 * 다른 탭의 팝업이 같은 통로로 보낸 결과나 직접 보낸 메시지는 받지 않는다
 */
export function popupReturnHref(ownName: string | null, data: unknown, type: string): string | null {
  if (!ownName || typeof data !== "object" || data === null) return null;
  const message = data as Record<string, unknown>;
  if (message.type !== type || message.name !== ownName) return null;
  return isPopupReturnPath(message.href) ? message.href : null;
}
