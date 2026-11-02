import { expect, type Page, test } from "@playwright/test";
import { expectLoginRedirect, setDemo } from "./helpers";

const header = (page: Page) => page.getByRole("banner");

test.describe("R176 헤더와 계정", () => {
  test("S4 쿠키가 없으면 테스터로 본다", async ({ page }) => {
    await page.goto("/");
    await expect(header(page).getByRole("link", { name: "보유 크레딧 12,480" })).toBeVisible();
  });

  test("S5 알 수 없는 역할 값도 테스터로 본다", async ({ page, context }) => {
    await setDemo(context, { role: "foo" });
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    await expect(header(page).getByRole("link", { name: "보유 크레딧 12,480" })).toBeVisible();
  });
});

test.describe("R175 오른쪽 계정 영역", () => {
  test("S341 로그인하면 보유 크레딧, 마이페이지, 로그아웃이 이 순서로 있다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/");
    const banner = header(page);
    await expect(banner.getByRole("link", { name: "Test Moa" })).toHaveAttribute("href", "/");
    const myPage = banner.getByRole("link", { name: "마이페이지" });
    const credits = banner.getByRole("link", { name: "보유 크레딧 12,480" });
    const logout = banner.getByRole("button", { name: "로그아웃" });
    await expect(myPage).toHaveAttribute("href", "/my");
    await expect(credits).toHaveAttribute("href", "/my/credits");
    await expect(credits).toHaveAttribute("title", "보유 크레딧 12,480");
    await expect(credits).toHaveText("12,480");
    await expect(logout).toBeVisible();
    const [a, b, c] = await Promise.all([credits, myPage, logout].map(async (item) => (await item.boundingBox())!.x));
    expect(a).toBeLessThan(b);
    expect(b).toBeLessThan(c);
    await expect(banner.getByRole("link", { name: "내 정보" })).toHaveCount(0);
  });

  test("S342 비로그인은 로그인과 회원가입만 본다", async ({ page, context }) => {
    await setDemo(context, { role: "guest" });
    await page.goto("/");
    const banner = header(page);
    await expect(banner.getByRole("link", { name: "로그인" })).toHaveAttribute("href", "/login");
    await expect(banner.getByRole("link", { name: "회원가입" })).toHaveAttribute("href", "/signup");
    await expect(banner.getByRole("link", { name: "마이페이지" })).toHaveCount(0);
    await expect(banner.getByRole("link", { name: /보유 크레딧/ })).toHaveCount(0);
    await expect(banner.getByRole("button", { name: "로그아웃" })).toHaveCount(0);
  });

  for (const [role, credits] of [
    ["developer", "3,260"],
    ["admin", "0"],
  ] as const) {
    test(`S343 ${role}도 보유 크레딧, 마이페이지, 로그아웃을 본다`, async ({ page, context }) => {
      await setDemo(context, { role });
      await page.goto("/");
      const banner = header(page);
      await expect(banner.getByRole("link", { name: "마이페이지" })).toBeVisible();
      await expect(banner.getByRole("link", { name: `보유 크레딧 ${credits}` })).toBeVisible();
      await expect(banner.getByRole("button", { name: "로그아웃" })).toBeVisible();
    });
  }

  test("S344 마이페이지 현재 위치", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    const myPage = header(page).getByRole("link", { name: "마이페이지" });
    await page.goto("/my");
    await expect(myPage).toHaveAttribute("aria-current", "page");
    await page.goto("/my/profile/edit");
    await expect(myPage).toHaveAttribute("aria-current", "page");
    await page.goto("/my/credits");
    await expect(myPage).not.toHaveAttribute("aria-current");
    await page.goto("/my/projects");
    await expect(myPage).not.toHaveAttribute("aria-current");
  });
});

test.describe("R176 로그아웃", () => {
  test("S345 로그아웃하면 비로그인이 되고 홈으로 간다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/my/credits");
    await header(page).getByRole("button", { name: "로그아웃" }).click();
    await expect(page).toHaveURL("/");
    await expect(header(page).getByRole("link", { name: "로그인" })).toBeVisible();
    await expect(header(page).getByRole("link", { name: "회원가입" })).toBeVisible();
    const role = (await context.cookies()).find((cookie) => cookie.name === "demo-role");
    expect(role?.value).toBe("guest");
  });

  test("S346 로그아웃 뒤 보호 페이지는 로그인으로 보낸다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/");
    await header(page).getByRole("button", { name: "로그아웃" }).click();
    await expect(header(page).getByRole("link", { name: "로그인" })).toBeVisible();
    await expectLoginRedirect(page, "/my");
  });
});

test.describe("R178 검색 진입점 정리", () => {
  test("S326 헤더에는 검색창이 없고 홈 검색창은 그리드의 1개뿐이다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/");
    await expect(header(page).getByRole("searchbox")).toHaveCount(0);
    await expect(page.getByRole("searchbox", { name: "테스트 검색" })).toHaveCount(1);
    await expect(page.locator("#all-tests").getByRole("searchbox", { name: "테스트 검색" })).toBeVisible();
  });
});
