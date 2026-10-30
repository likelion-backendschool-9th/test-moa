import { expect, test } from "@playwright/test";

const COMING_SOON_PATHS = [
  "/recruitments",
  "/recruitments/booklog",
  "/my",
  "/my/projects",
  "/my/chats",
  "/my/credits",
  "/my/profile/edit",
  "/my/subscription",
  "/admin",
  "/login",
  "/signup",
  "/terms",
  "/privacy",
  "/events",
  "/notices",
];

test.describe("R11 빈 링크와 404", () => {
  for (const path of COMING_SOON_PATHS) {
    test(`S26 ${path}는 준비 중 화면을 연다`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1, name: /준비 중/ })).toBeVisible();
      await expect(page.getByRole("main").getByRole("link", { name: "홈으로" })).toHaveAttribute("href", "/");
    });
  }

  test("S26 홈의 내부 링크는 모두 200으로 열린다", async ({ page, request }) => {
    await page.goto("/");
    const hrefs = await page.locator('a[href^="/"]').evaluateAll((links) =>
      [...new Set(links.map((link) => link.getAttribute("href") ?? ""))],
    );
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      const response = await request.get(href);
      expect(response.status(), href).toBe(200);
    }
  });

  test("S27 없는 주소는 맞춤 404를 보여 준다", async ({ page }) => {
    const response = await page.goto("/nope");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1, name: "찾는 페이지가 없어요" })).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "홈으로" })).toBeVisible();
  });
});
