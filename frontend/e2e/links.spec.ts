import { expect, test } from "@playwright/test";

test.describe("R11 빈 링크와 404", () => {
  test("S27 없는 주소는 맞춤 404를 보여 준다", async ({ page }) => {
    const response = await page.goto("/nope");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1, name: "찾는 페이지가 없어요" })).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "홈으로" })).toBeVisible();
  });
});
