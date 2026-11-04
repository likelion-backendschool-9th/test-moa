import { type BrowserContext, expect, type Page, test } from "@playwright/test";
import { setDemo } from "./helpers";

const DAY_MS = 24 * 60 * 60 * 1000;

const region = (page: Page, name: string) => page.getByRole("region", { name, exact: true });
const checkout = (page: Page) => page.getByRole("form", { name: /구독 (시작|연장)/ });
const header = (page: Page) => page.getByRole("banner");
const choice = (page: Page, group: "상품" | "결제 수단", name: RegExp) =>
  checkout(page).getByRole("group", { name: group }).getByRole("radio", { name });

/** 오늘부터 days일 뒤를 화면과 같은 "N월 N일"로 */
const dateAfter = (days: number) =>
  new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", timeZone: "Asia/Seoul" }).format(
    new Date(Date.now() + days * DAY_MS),
  );

test.describe("R197 결제 내용", () => {
  test("S536 크레딧이 넉넉하면 크레딧 결제가 먼저 골라져 있다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/my/subscription/checkout");
    const form = checkout(page);
    await expect(form.getByRole("heading", { name: "구독 시작" })).toBeVisible();
    await expect(choice(page, "상품", /구독 · 30일/)).toBeChecked();
    await expect(choice(page, "결제 수단", /크레딧 9,000 크레딧/)).toBeChecked();
    await expect(form.getByText("쓸 수 있는 크레딧 12,480 크레딧 · 현금보다 우대 가격이에요")).toBeVisible();
    await expect(form.getByText(`${dateAfter(0)} ~ ${dateAfter(30)}`)).toBeVisible();
    await expect(form.getByText(/결제 뒤 남는 크레딧\s*3,480 크레딧/)).toBeVisible();
    /* 강조색 바탕 버튼은 결제 버튼 하나다 */
    await expect(page.getByRole("main").locator(".bg-accent")).toHaveCount(1);
    await expect(form.getByRole("button", { name: "9,000 크레딧 결제하기" })).toHaveClass(/bg-accent/);

    await choice(page, "결제 수단", /현금 10,000원/).check();
    await expect(form.getByRole("button", { name: "10,000원 결제하기" })).toBeVisible();
    await expect(form.getByText("결제 뒤 남는 크레딧")).toHaveCount(0);
  });

  test("S537 크레딧이 모자라면 크레딧 결제를 고를 수 없고 모자란 양을 알린다", async ({ page, context }) => {
    await setDemo(context, { role: "developer" });
    await page.goto("/my/subscription/checkout");
    const form = checkout(page);
    await expect(form.getByRole("heading", { name: "구독 연장" })).toBeVisible();
    await expect(form.getByText(`지금 구독은 ${dateAfter(30)}에 끝나요. 결제하면 그날부터 이어져요.`)).toBeVisible();
    await expect(choice(page, "결제 수단", /크레딧 9,000 크레딧/)).toBeDisabled();
    await expect(form.getByText("쓸 수 있는 크레딧 2,260 크레딧 · 6,740 크레딧 모자라요")).toBeVisible();
    await expect(choice(page, "결제 수단", /현금 10,000원/)).toBeChecked();
    await expect(form.getByText(`${dateAfter(30)} ~ ${dateAfter(60)}`)).toBeVisible();
  });
});

test.describe("R198 결제하고 돌아오기", () => {
  test("S538 크레딧으로 결제하면 구독이 시작되고 크레딧 잔액·내역·헤더에 반영된다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/my/subscription/checkout");
    await checkout(page).getByRole("button", { name: "9,000 크레딧 결제하기" }).click();

    await expect(page).toHaveURL("/my/subscription?notice=paid");
    await expect(page.getByRole("status")).toContainText(`결제했어요. ${dateAfter(30)}까지 구독 혜택을 쓸 수 있어요.`);
    const status = region(page, "내 구독");
    await expect(status.getByText("구독 중", { exact: true })).toBeVisible();
    await expect(status.getByText("D-30")).toBeVisible();
    await expect(region(page, "결제 안내").locator(":scope > dl")).toHaveText("구독 결제에 쓸 수 있는 크레딧3,480 크레딧");
    await expect(region(page, "결제 안내").getByRole("link", { name: "구독 연장하기" })).toBeVisible();
    await expect(header(page).getByRole("link", { name: "보유 크레딧 3,480" })).toBeVisible();

    /* 이벤트 크레딧 3,000을 먼저 쓰고 나머지 6,000은 적립 크레딧에서 뺀다 */
    await page.goto("/my/credits");
    const balance = region(page, "잔액");
    await expect(balance.getByRole("paragraph").filter({ hasText: /^3,480 크레딧$/ })).toBeVisible();
    await expect(balance.locator("dl > div").filter({ hasText: "이벤트 크레딧" })).toContainText("0 크레딧");
    await expect(balance.locator("dl > div").filter({ hasText: "적립 크레딧" })).toContainText("3,480 크레딧");
    await expect(page.getByRole("main").getByRole("listitem").filter({ hasText: "구독 결제" }).first()).toContainText("9,000");
  });

  test("S539 현금으로 연장하면 지금 만료일부터 이어지고 크레딧은 그대로다", async ({ page, context }) => {
    await setDemo(context, { role: "developer" });
    await page.goto("/my/subscription/checkout");
    await checkout(page).getByRole("button", { name: "10,000원 결제하기" }).click();

    await expect(page).toHaveURL("/my/subscription?notice=paid");
    const status = region(page, "내 구독");
    await expect(status.getByText("D-60")).toBeVisible();
    await expect(status.getByText(dateAfter(60))).toBeVisible();
    await expect(header(page).getByRole("link", { name: "보유 크레딧 3,260" })).toBeVisible();
  });
});

test.describe("R198 결제 기록", () => {
  /** 지난 결제 기록을 쿠키에 직접 넣는다. paidAt·expiresAt은 오늘 기준 날 수 */
  async function seedPayment(context: BrowserContext, role: string, paidDaysAgo: number, expiresInDays: number) {
    const payment = {
      id: "seed",
      planId: "basic",
      method: "cash",
      amount: 10000,
      paidAt: new Date(Date.now() - paidDaysAgo * DAY_MS).toISOString(),
      expiresAt: new Date(Date.now() + expiresInDays * DAY_MS).toISOString(),
    };
    await context.addCookies([
      { name: `demo-subscription-${role}`, value: encodeURIComponent(JSON.stringify([payment])), url: "http://localhost:3100" },
    ]);
  }

  test("S542 결제할 때 정한 만료일은 조회 시각과 관계없이 그대로라 남은 기간이 줄고 만료된다", async ({ page, context }) => {
    await setDemo(context, { role: "developer" });
    /* 7일 전 연장으로 60일 뒤였던 만료일은 지금 53일 남았다 */
    await seedPayment(context, "developer", 7, 53);
    await page.goto("/my/subscription");
    await expect(region(page, "내 구독").getByText("D-53")).toBeVisible();

    /* 연장한 기간도 지나면 미구독으로 돌아간다 (목업의 "지금 + 30일"로 되살아나지 않는다) */
    await seedPayment(context, "developer", 61, -1);
    await page.goto("/my/subscription");
    await expect(region(page, "내 구독").getByText("구독하지 않았어요")).toBeVisible();
  });

  test("S543 결제 기록은 가장 늦은 만료일보다 오래 남는다", async ({ page, context }) => {
    await setDemo(context, { role: "developer" });
    for (let index = 0; index < 4; index += 1) {
      await page.goto("/my/subscription/checkout");
      await checkout(page).getByRole("button", { name: "10,000원 결제하기" }).click();
      await expect(page).toHaveURL("/my/subscription?notice=paid");
    }
    /* 목업 30일 + 30일 상품 네 번 = 150일 */
    await expect(region(page, "내 구독").getByText("D-150")).toBeVisible();
    const cookie = (await context.cookies()).find((item) => item.name === "demo-subscription-developer");
    expect(cookie!.expires * 1000).toBeGreaterThan(Date.now() + 150 * DAY_MS);
  });
});
