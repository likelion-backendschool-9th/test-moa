import { expect, test } from "@playwright/test";

test.describe("R12 접근성", () => {
  test("S35 첫 Tab은 본문 바로가기이고 Enter로 본문에 간다", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skipLink = page.getByRole("link", { name: "본문으로 건너뛰기" });
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page.locator("main")).toBeFocused();
  });

  test("S36 Tab으로 탭에 가면 포커스 링이 보인다", async ({ page }) => {
    await page.goto("/");
    const tab = page.getByRole("navigation", { name: "주요 메뉴" }).getByRole("link", { name: "테스트 모집" });
    for (let i = 0; i < 15 && !(await tab.evaluate((element) => element === document.activeElement)); i++) {
      await page.keyboard.press("Tab");
    }
    await expect(tab).toBeFocused();
    const outline = await tab.evaluate((element) => getComputedStyle(element).outlineStyle);
    expect(outline).not.toBe("none");
  });
});
