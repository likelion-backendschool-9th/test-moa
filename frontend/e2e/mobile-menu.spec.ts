import { expect, test } from "@playwright/test";
import { setDemo } from "./helpers";

test.use({ viewport: { width: 375, height: 812 } });

test.describe("R4 모바일 메뉴", () => {
  test.beforeEach(async ({ context }) => {
    await setDemo(context, { role: "tester" });
  });

  test("S10 좁은 화면에서는 탭 대신 메뉴 버튼이 보인다", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("navigation", { name: "주요 메뉴" })).toBeHidden();
    await expect(page.getByRole("button", { name: "메뉴 열기" })).toBeVisible();
  });

  test("S11 메뉴를 열면 전체 높이 패널이 나오고 Esc로 닫힌다", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "메뉴 열기" }).click();
    const panel = page.getByTestId("mobile-menu");
    await expect(panel).toBeVisible();
    const box = await panel.boundingBox();
    expect(box?.height).toBe(812);
    const tabLinks = panel.getByRole("link").filter({ hasNotText: "내 정보" });
    await expect(tabLinks).toHaveCount(6);
    const toggle = page.getByRole("button", { name: "메뉴 닫기" });
    await expect(toggle).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(panel).toHaveCount(0);
    await expect(page.getByRole("button", { name: "메뉴 열기" })).toBeFocused();
  });

  test("S12 메뉴에서 링크를 누르면 이동하고 패널이 닫힌다", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "메뉴 열기" }).click();
    await page.getByTestId("mobile-menu").getByRole("link", { name: "테스트 모집" }).click();
    await expect(page).toHaveURL("/recruitments");
    await expect(page.getByTestId("mobile-menu")).toHaveCount(0);
  });
});

test("S81 좁은 화면 헤더의 내 정보는 메뉴 패널로 옮겨진다", async ({ page, context }) => {
  await setDemo(context, { role: "tester" });
  await page.goto("/");
  await expect(page.getByRole("banner").getByRole("link", { name: "내 정보" })).toBeHidden();
  await page.getByRole("button", { name: "메뉴 열기" }).click();
  await expect(page.getByTestId("mobile-menu").getByRole("link", { name: "내 정보" })).toHaveAttribute("href", "/my/profile/edit");
});

test("S82 좁은 화면에서도 메뉴 안에서 검색할 수 있다", async ({ page, context }) => {
  await setDemo(context, { role: "tester" });
  await page.goto("/");
  await page.getByRole("button", { name: "메뉴 열기" }).click();
  const input = page.getByTestId("mobile-menu").getByRole("searchbox", { name: "테스트 검색" });
  await input.fill("가계부");
  await input.press("Enter");
  await expect(page).toHaveURL(/q=%EA%B0%80%EA%B3%84%EB%B6%80/);
  await expect(page.getByTestId("mobile-menu")).toHaveCount(0);
});
