import { expect, test } from "@playwright/test";
import { renewedExpiry, type Subscription } from "@/features/subscription/types";

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
