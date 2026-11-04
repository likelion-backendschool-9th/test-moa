import { expect, type Page, test } from "@playwright/test";
import { setDemo } from "./helpers";

const region = (page: Page, name: string) => page.getByRole("region", { name, exact: true });

test.describe("R131 마이페이지 메뉴", () => {
  test("S96 가장 길게 일치하는 항목만 현재 페이지다", async ({ page }) => {
    await page.goto("/my/credits/withdrawals");
    const nav = page.getByRole("navigation", { name: "마이페이지 메뉴" });
    await expect(nav.getByRole("link", { name: "출금" })).toHaveAttribute("aria-current", "page");
    await expect(nav.getByRole("link", { name: "크레딧", exact: true })).not.toHaveAttribute("aria-current", "page");
  });
});

test.describe("R133 지금 할 일", () => {
  test("S100 테스트 참여 할 일을 마감이 가까운 순서로", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/my");
    const todos = region(page, "지금 할 일");
    const items = todos.getByRole("region", { name: "테스트 참여" }).getByRole("link");
    await expect(items).toHaveCount(2);
    await expect(items.nth(0)).toContainText("북로그 피드백 제출");
    await expect(items.nth(0)).toContainText("D-2");
    await expect(items.nth(0)).toHaveAttribute("href", "/my/participations?tab=ongoing");
    await expect(items.nth(1)).toContainText("모아플랜 참여 확정, 테스트 시작하기");
    await expect(items.nth(1)).toContainText("D-9");
    await expect(todos).not.toContainText("크레딧");
  });
});

test.describe("R134 크레딧", () => {
  test("S103 승인 대기 보상은 잔액과 따로 보여 준다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/my");
    const credits = region(page, "크레딧");
    await expect(credits.getByText(/승인 대기\s*1,350 크레딧/)).toBeVisible();
    await expect(credits.getByText("12,480 크레딧", { exact: true })).toBeVisible();
  });
});
