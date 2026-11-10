import { expect, test } from "@playwright/test";
import {
  approvalFromQuery,
  isMobileUserAgent,
  kakaoRedirectUrl,
  pgNotice,
  readProviders,
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

test("#249-S17 토스 결제창은 준비 값이 모두 있을 때만 열 수 있다", () => {
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

test("#249-S14 서버가 준 결제 대행사 목록에서 알 수 있는 값만 남긴다", () => {
  expect(readProviders(["KAKAO_PAY", "TOSS_PAY"])).toEqual(["KAKAO_PAY", "TOSS_PAY"]);
  expect(readProviders(["TOSS_PAY", "PAYCO", 1, null])).toEqual(["TOSS_PAY"]);
  expect(readProviders(undefined)).toEqual([]);
  expect(readProviders("TOSS_PAY")).toEqual([]);
});

test("#249-S18 취소·실패로 돌아오면 안내를 보이고 알 수 없는 값은 보이지 않는다", () => {
  expect(pgNotice("cancel")).toBe("결제를 취소했어요");
  expect(pgNotice("fail")).toBe("결제하지 못했어요. 다시 시도해 주세요");
  expect(pgNotice(["cancel", "fail"])).toBe("결제를 취소했어요");
  expect(pgNotice("approved")).toBeNull();
  expect(pgNotice(undefined)).toBeNull();
});
