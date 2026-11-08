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
});
