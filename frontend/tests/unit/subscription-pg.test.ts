import { expect, test } from "@playwright/test";
import {
  approvalFromQuery,
  completePath,
  isJustPaid,
  isMobileUserAgent,
  isPopupName,
  isPopupReturnPath,
  isTossWindow,
  newPopupName,
  kakaoRedirectUrl,
  parsePaymentId,
  pgNotice,
  popupFeatures,
  popupReturnHref,
  readProviders,
  receiptFromServer,
  receiptPath,
  receiptMethodLabel,
  tossWindowFrom,
  type PgReady,
} from "@/features/subscription/pg";

test("#249-S21 카카오페이 돌아온 쿼리는 주문번호와 pg_token으로 승인 요청이 된다", () => {
  expect(approvalFromQuery({ orderId: "MOA1", pg_token: "tok" })).toEqual({ orderId: "MOA1", pgToken: "tok" });
  /* 같은 이름이 여러 번 와도 첫 값을 쓴다 */
  expect(approvalFromQuery({ orderId: ["MOA1", "MOA2"], pg_token: ["tok", "x"] })).toEqual({ orderId: "MOA1", pgToken: "tok" });
});

test("#249-S21 토스 돌아온 쿼리는 주문번호·paymentKey·금액(정수)으로 승인 요청이 된다", () => {
  expect(approvalFromQuery({ orderId: "MOA1", paymentKey: "PK1", amount: "10000", paymentType: "NORMAL" }))
    .toEqual({ orderId: "MOA1", paymentKey: "PK1", amount: 10000 });
});

test("#249-S21 필요한 값이 빠졌거나 이상하면 승인할 수 없음(null)이다", () => {
  expect(approvalFromQuery({})).toBeNull();
  expect(approvalFromQuery({ pg_token: "tok" })).toBeNull();
  expect(approvalFromQuery({ orderId: "MOA1" })).toBeNull();
  expect(approvalFromQuery({ orderId: "MOA1", paymentKey: "PK1" })).toBeNull();
  expect(approvalFromQuery({ orderId: "MOA1", amount: "10000" })).toBeNull();
  for (const amount of ["abc", "0", "-5", "1.5", ""]) {
    expect(approvalFromQuery({ orderId: "MOA1", paymentKey: "PK1", amount }), amount).toBeNull();
  }
});

test("#249-S21 모바일 브라우저는 모바일 결제창 주소를 쓰고 없으면 PC 주소를 쓴다", () => {
  expect(isMobileUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148")).toBe(true);
  expect(isMobileUserAgent("Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile Safari/537.36")).toBe(true);
  expect(isMobileUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120 Safari/537.36")).toBe(false);
  expect(isMobileUserAgent(null)).toBe(false);

  const both = { redirectUrl: "https://pc.example/pay", mobileRedirectUrl: "https://m.example/pay" };
  expect(kakaoRedirectUrl(both, true)).toBe("https://m.example/pay");
  expect(kakaoRedirectUrl(both, false)).toBe("https://pc.example/pay");
  expect(kakaoRedirectUrl({ redirectUrl: "https://pc.example/pay" }, true)).toBe("https://pc.example/pay");
  expect(kakaoRedirectUrl({}, false)).toBeNull();
});

test("#249-S21 토스 결제창은 준비 값이 모두 있을 때만 열 수 있다", () => {
  const ready: PgReady = {
    orderId: "MOA1", provider: "TOSS_PAY", amount: 10000, orderName: "PRO",
    clientKey: "test_ck_x", customerKey: "moa-abc", successUrl: "http://localhost:3005/my/subscription/checkout/result",
    failUrl: "http://localhost:3005/my/subscription/checkout?pg=fail",
  };
  expect(tossWindowFrom(ready)).toEqual({
    orderId: "MOA1", amount: 10000, orderName: "PRO", clientKey: "test_ck_x", customerKey: "moa-abc",
    successUrl: ready.successUrl, failUrl: ready.failUrl,
  });
  for (const missing of ["clientKey", "customerKey", "successUrl", "failUrl"] as const) {
    expect(tossWindowFrom({ ...ready, [missing]: undefined }), missing).toBeNull();
  }
});

test("#249-S21 서버가 준 결제 대행사 목록에서 알 수 있는 값만 남긴다", () => {
  expect(readProviders(["KAKAO_PAY", "TOSS_PAY"])).toEqual(["KAKAO_PAY", "TOSS_PAY"]);
  expect(readProviders(["TOSS_PAY", "PAYCO", 1, null])).toEqual(["TOSS_PAY"]);
  expect(readProviders(undefined)).toEqual([]);
  expect(readProviders("TOSS_PAY")).toEqual([]);
});

test("#249-S21 취소·실패로 돌아오면 안내를 보이고 알 수 없는 값은 보이지 않는다", () => {
  expect(pgNotice("cancel")).toBe("결제를 취소했어요");
  expect(pgNotice("fail")).toBe("결제하지 못했어요. 다시 시도해 주세요");
  expect(pgNotice(["cancel", "fail"])).toBe("결제를 취소했어요");
  expect(pgNotice("approved")).toBeNull();
  expect(pgNotice(undefined)).toBeNull();
});

test("#249-S23 결제 완료 화면의 결제 id는 서버 id가 될 수 있는 숫자만 받는다", () => {
  for (const id of ["1", "42", "999999999999999999"]) expect(parsePaymentId(id), id).toBe(id);
  expect(parsePaymentId(["7", "8"])).toBe("7");
  for (const id of ["", "abc", "0", "007", "-1", "1.5", "1e3", "9999999999999999999", " 7"]) {
    expect(parsePaymentId(id), id).toBeNull();
  }
  expect(parsePaymentId(undefined)).toBeNull();
});

test("#249-S23 결제가 끝나면 결제 id가 있을 때만 결제 완료 화면으로 보낸다", () => {
  expect(completePath("42")).toBe("/my/subscription/checkout/complete?payment=42&paid=1");
  expect(completePath(null)).toBe("/my/subscription?notice=paid");
});

test("#249-S23 결제 완료 화면은 결제 수단을 크레딧·카카오페이·토스페이로 말하고 예전 현금 결제는 현금이라 한다", () => {
  const base = { paymentId: 5, plan: "PRO", amount: 10000, paidAt: "2026-11-10T08:30:00Z", period: { startAt: "2026-11-10T08:30:00Z", endAt: "2026-12-10T08:30:00Z" } };
  const credit = receiptFromServer({ ...base, method: "CREDIT", provider: null, amount: 9000 });
  const kakao = receiptFromServer({ ...base, method: "CASH", provider: "KAKAO_PAY" });
  const toss = receiptFromServer({ ...base, method: "CASH", provider: "TOSS_PAY" });
  const legacy = receiptFromServer({ ...base, method: "CASH" });
  expect([credit, kakao, toss, legacy].map(receiptMethodLabel)).toEqual(["크레딧", "카카오페이", "토스페이", "현금"]);
  expect(kakao).toEqual({ id: "5", plan: "PRO", method: "CASH", provider: "KAKAO_PAY", amount: 10000, paidAt: base.paidAt, period: base.period });
  /* 모르는 결제 대행사는 없는 것으로 본다 */
  expect(receiptFromServer({ ...base, method: "CASH", provider: "PAYCO" }).provider).toBeNull();
});

test("#249-S25 결제 내역에서 한 건을 열면 방금 결제했다는 표시 없이 같은 화면으로 간다", () => {
  expect(receiptPath("42")).toBe("/my/subscription/checkout/complete?payment=42");
  /* 결제 직후에만 "결제가 완료됐어요"로 보인다 */
  expect(isJustPaid("1")).toBe(true);
  expect(isJustPaid(["1", "0"])).toBe(true);
  for (const value of [undefined, "", "0", "true", "2"]) expect(isJustPaid(value), String(value)).toBe(false);
});

test("#252-S10 팝업은 원래 창의 가운데에 열리고 화면 밖으로 나가지 않는다", () => {
  /* 원래 창 (100,50) 크기 1200×800의 가운데: 카카오 430×620 */
  expect(popupFeatures("KAKAO_PAY", { screenX: 100, screenY: 50, outerWidth: 1200, outerHeight: 800 })).toBe(
    "popup,width=430,height=620,left=485,top=140",
  );
  expect(popupFeatures("TOSS_PAY", { screenX: 100, screenY: 50, outerWidth: 1200, outerHeight: 800 })).toBe(
    "popup,width=480,height=700,left=460,top=100",
  );
  /* 원래 창이 팝업보다 작거나 화면 왼쪽 밖에 있어도 음수 위치를 주지 않는다 */
  expect(popupFeatures("KAKAO_PAY", { screenX: -1500, screenY: -20, outerWidth: 300, outerHeight: 300 })).toBe(
    "popup,width=430,height=620,left=0,top=0",
  );
});

test("#252-S9 결제 팝업이 알릴 수 있는 주소는 결제 화면 아래 주소뿐이다", () => {
  for (const ok of [
    "/my/subscription/checkout",
    "/my/subscription/checkout?pg=cancel",
    "/my/subscription/checkout/complete?payment=12&paid=1",
    "/my/subscription/checkout/result?orderId=MOA1&pg_token=t",
  ]) {
    expect(isPopupReturnPath(ok), ok).toBe(true);
  }
  for (const bad of [
    "https://evil.example/my/subscription/checkout",
    "//evil.example",
    "/my/subscription",
    "/my/subscription/checkout/../../admin",
    "/my/subscription/checkoutx",
    "/my/subscription/checkout#frag",
    "javascript:alert(1)",
    "",
    null,
    undefined,
    42,
  ]) {
    expect(isPopupReturnPath(bad), String(bad)).toBe(false);
  }
});

test("#252-S11 원래 창이 보낸 토스 결제창 값은 모양이 맞을 때만 받는다", () => {
  const window = {
    orderId: "MOA1",
    amount: 10000,
    orderName: "PRO 30일 구독",
    clientKey: "test_ck_x",
    customerKey: "moa-abc",
    successUrl: "http://localhost:3005/my/subscription/checkout/result",
    failUrl: "http://localhost:3005/my/subscription/checkout?pg=fail",
  };
  expect(isTossWindow(window)).toBe(true);
  for (const key of Object.keys(window)) {
    expect(isTossWindow({ ...window, [key]: undefined }), key).toBe(false);
  }
  for (const amount of ["10000", 0, -1, 1.5, null]) {
    expect(isTossWindow({ ...window, amount }), String(amount)).toBe(false);
  }
  for (const value of [null, undefined, "x", 1, []]) {
    expect(isTossWindow(value), String(value)).toBe(false);
  }
});

test("#252-S13 팝업 창 이름은 열 때마다 다르고 결제 팝업 이름만 알아본다", () => {
  const a = newPopupName();
  const b = newPopupName();
  expect(a).not.toBe(b);
  expect(isPopupName(a)).toBe(true);
  for (const bad of ["", "moa-pay", "moa-pay-", "other-window", null, undefined, 1]) {
    expect(isPopupName(bad), String(bad)).toBe(false);
  }
});

test("#252-S13 결제 결과는 이 창이 연 팝업(창 이름이 같음)이 보낸 것만 받는다", () => {
  const href = "/my/subscription/checkout/complete?payment=1&paid=1";
  const message = { type: "moa-pay-return", href, name: "moa-pay-A" };
  expect(popupReturnHref("moa-pay-A", message, "moa-pay-return")).toBe(href);
  /* 다른 탭의 팝업이 같은 통로로 보낸 결과 */
  expect(popupReturnHref("moa-pay-B", message, "moa-pay-return")).toBeNull();
  /* 이 창이 팝업을 열지 않은 상태, 이름이 없는 메시지, 다른 종류의 메시지 */
  expect(popupReturnHref(null, message, "moa-pay-return")).toBeNull();
  expect(popupReturnHref("moa-pay-A", { type: "moa-pay-return", href }, "moa-pay-return")).toBeNull();
  expect(popupReturnHref("moa-pay-A", { ...message, type: "x" }, "moa-pay-return")).toBeNull();
  /* 결제 화면 밖의 주소나 객체가 아닌 값 */
  expect(popupReturnHref("moa-pay-A", { ...message, href: "https://evil.example" }, "moa-pay-return")).toBeNull();
  for (const data of [null, undefined, "x", 1]) expect(popupReturnHref("moa-pay-A", data, "moa-pay-return")).toBeNull();
});
