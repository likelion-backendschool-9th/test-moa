import { expect, type Page, test } from "@playwright/test";
import { setDemo } from "./helpers";

test.use({ viewport: { width: 375, height: 812 } });

const panel = (page: Page) => page.getByTestId("mobile-menu");
const openMenu = (page: Page) => page.getByRole("button", { name: "메뉴 열기" }).click();

test.describe("R4 모바일 메뉴", () => {
  test.beforeEach(async ({ context }) => {
    await setDemo(context, { role: "tester" });
  });

  test("S12 메뉴에서 링크를 누르면 이동하고 패널이 닫힌다", async ({ page }) => {
    await page.goto("/");
    await openMenu(page);
    await panel(page).getByRole("link", { name: "참여 테스트" }).click();
    await expect(page).toHaveURL("/testers/recruitments");
    await expect(panel(page)).toHaveCount(0);
  });
});

test.describe("R179 모바일 메뉴의 계정 영역", () => {

  test("S328 패널에서 로그아웃하면 홈으로 가고 패널이 닫힌다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/developer/projects");
    await openMenu(page);
    await panel(page).getByRole("button", { name: "로그아웃" }).click();
    await expect(page).toHaveURL("/");
    await expect(panel(page)).toHaveCount(0);
    await expect(page.getByRole("banner").getByRole("link", { name: "로그인" })).toBeVisible();
  });
});
