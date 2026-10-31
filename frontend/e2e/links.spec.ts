import { expect, test } from "@playwright/test";
import { setDemo } from "./helpers";

const COMING_SOON_PATHS = [
  "/recruitments",
  "/recruitments/booklog",
  "/my/chats",
  "/my/profile/edit",
  "/my/subscription",
  "/login",
  "/signup",
  "/terms",
  "/privacy",
  "/events",
  "/notices",
];

const ADMIN_SUB_PATHS = ["/admin/users", "/admin/withdrawals", "/admin/cancellations"];

test.describe("R11 빈 링크와 404", () => {
  for (const path of COMING_SOON_PATHS) {
    test(`S26 ${path}는 준비 중 화면을 연다`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1, name: /준비 중/ })).toBeVisible();
      await expect(page.getByRole("main").getByRole("link", { name: "홈으로" })).toHaveAttribute("href", "/");
    });
  }

  /*
   * 운영자 하위 페이지는 일반 회원에게 안내 화면이 나오므로 운영자로 확인한다.
   * 준비 중이든 완성됐든 열리고 제목이 있어야 한다. 페이지가 생길 때마다 목록을 고치지 않아서
   * 출금·회원·모집 취소 PR이 이 줄을 똑같이 두고, 어느 PR이 먼저 병합돼도 충돌하지 않는다.
   */
  for (const path of ADMIN_SUB_PATHS) {
    test(`S26 ${path}는 운영자에게 열린다`, async ({ page, context }) => {
      await setDemo(context, { role: "admin" });
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
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
