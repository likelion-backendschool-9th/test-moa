import { expect, test, type Page } from "@playwright/test";
import { setDemo } from "./helpers";

const tabs = (page: Page) => page.getByRole("navigation", { name: "참여 상태" });
const tab = (page: Page, name: string) => tabs(page).getByRole("link", { name });
const rows = (page: Page) => page.getByTestId("participation-row");

test.describe("#46-R1 보기 방식", () => {
  const viewToggle = (page: Page) => page.getByRole("group", { name: "보기 방식" });
  const viewButton = (page: Page, name: "리스트" | "그리드") => viewToggle(page).getByRole("button", { name });
  /** 첫 줄에 놓인 카드 수 */
  const columnCount = async (page: Page) => {
    const tops = await rows(page).evaluateAll((cards) => cards.map((card) => Math.round(card.getBoundingClientRect().top)));
    return tops.filter((top) => top === tops[0]).length;
  };

  test("#46-S4 고른 보기 방식은 탭 이동, 상세 왕복, 새로고침 뒤에도 남는다", async ({ page }) => {
    await page.goto("/testers/recruitments");
    await viewButton(page, "그리드").click();
    await expect(viewButton(page, "그리드")).toHaveAttribute("aria-pressed", "true");

    await tab(page, "참여했던 테스트").click();
    await expect(page).toHaveURL("/testers/recruitments?tab=history");
    await expect(page.getByText("받은 크레딧 합계")).toBeVisible();
    await expect(viewButton(page, "그리드")).toHaveAttribute("aria-pressed", "true");

    await rows(page).first().getByRole("link").click();
    await expect(page).toHaveURL(/\/testers\/recruitments\/[^/?]+$/);
    await page.getByRole("main").getByRole("link", { name: /돌아가기|참여/ }).first().click();
    await expect(page).toHaveURL("/testers/recruitments?tab=history");
    await expect(viewButton(page, "그리드")).toHaveAttribute("aria-pressed", "true");

    await page.reload();
    await expect(viewButton(page, "그리드")).toHaveAttribute("aria-pressed", "true");
    await expect(rows(page)).toHaveCount(3);
    await expect.poll(() => columnCount(page)).toBe(3);
  });

  test("#46-S13 로그인이 끊긴 채 보기 방식을 바꾸면 저장하지 않고 로그인으로 보낸다", async ({ page, context }) => {
    await page.goto("/testers/recruitments?tab=history");
    await expect(viewButton(page, "그리드")).toBeVisible();
    await setDemo(context, { role: "guest" });
    await viewButton(page, "그리드").click();
    await expect(page).toHaveURL(/\/login\?next=%2Ftesters%2Frecruitments%3Ftab%3Dhistory$/);
    expect((await context.cookies()).some((cookie) => cookie.name === "participation-view")).toBe(false);
  });
});
