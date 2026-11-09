import { expect, test } from "@playwright/test";
import { renewedExpiry, type Subscription, type SubscriptionPlan, usesPlan } from "@/features/subscription/types";

test("S539 새 구독·만료 구독은 현재부터, 유효한 구독은 만료일부터 연장한다", () => {
  const now = new Date("2026-11-08T00:00:00Z");
  const cases: [Subscription, string][] = [
    [{ status: "none" }, "2026-12-08T00:00:00.000Z"],
    [{ status: "active", planId: "basic", expiresAt: "2026-12-08T00:00:00Z" }, "2027-01-07T00:00:00.000Z"],
    [{ status: "active", planId: "basic", expiresAt: "2026-11-07T00:00:00Z" }, "2026-12-08T00:00:00.000Z"],
    [{ status: "active", planId: "basic", expiresAt: now.toISOString() }, "2026-12-08T00:00:00.000Z"],
  ];
  for (const [subscription, expected] of cases) expect(renewedExpiry(subscription, 30, now)).toBe(expected);
});

test("#203-S15 구독이 쓰는 상품은 서버가 준 이름으로, 목업은 id로 찾는다", () => {
  const plan: SubscriptionPlan = { id: "7", name: "PRO", periodDays: 30, cashPrice: 10000, creditPrice: 9000, benefits: [] };
  const expiresAt = "2026-12-08T00:00:00Z";
  /* 플랜 새 버전이 나와 구독의 planId(옛 행 6)가 지금 파는 목록(7)에 없어도 같은 이름이면 쓰는 상품이다 */
  expect(usesPlan({ status: "active", planId: "6", planName: "PRO", expiresAt }, plan)).toBe(true);
  expect(usesPlan({ status: "active", planId: "7", planName: "BASIC", expiresAt }, plan)).toBe(false);
  /* 이름이 없는 목업 구독은 id로 비교한다 */
  expect(usesPlan({ status: "active", planId: "7", expiresAt }, plan)).toBe(true);
  expect(usesPlan({ status: "active", planId: "basic", expiresAt }, plan)).toBe(false);
  expect(usesPlan({ status: "none" }, plan)).toBe(false);
  expect(usesPlan(null, plan)).toBe(false);
});
