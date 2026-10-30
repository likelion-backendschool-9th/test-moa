import { expect, test } from "@playwright/test";

const INTRO_TITLE = "새 서비스를 먼저 써 보고 크레딧을 받으세요";

test.describe("R6 히어로 배너", () => {
  test("S61 첫 화면은 서비스 소개다", async ({ page }) => {
    await page.goto("/");
    const banner = page.getByTestId("hero-banner");
    await expect(banner.getByRole("heading", { name: INTRO_TITLE })).toBeVisible();
    await expect(banner).toContainText("1 / 3");
    await expect(banner.getByRole("link", { name: "테스트 둘러보기" })).toHaveAttribute("href", "#all-tests");
  });

  test("S62 5초 뒤 이벤트로 넘어간다", async ({ page }) => {
    await page.clock.install();
    await page.goto("/");
    const banner = page.getByTestId("hero-banner");
    await expect(banner).toHaveAttribute("data-autoplay", "on");
    await page.clock.runFor(5000);
    await expect(banner).toContainText("2 / 3");
    const current = banner.locator('[aria-roledescription="slide"][aria-hidden="false"]');
    await expect(banner.getByText("이벤트", { exact: true })).toBeVisible();
    await expect(current.getByText("시연용", { exact: true })).toBeVisible();
    await expect(current.getByRole("link", { name: "자세히 보기" })).toHaveAttribute("href", "/events");
  });

  test("S63 소개에서 이전을 누르면 공지다", async ({ page }) => {
    await page.goto("/");
    const banner = page.getByTestId("hero-banner");
    await banner.getByRole("button", { name: "이전" }).click();
    await expect(banner).toContainText("3 / 3");
    const current = banner.locator('[aria-roledescription="slide"][aria-hidden="false"]');
    await expect(banner.getByText("공지", { exact: true })).toBeVisible();
    await expect(current.getByRole("link", { name: "자세히 보기" })).toHaveAttribute("href", "/notices");
  });

  test("S64 마우스를 올리면 멈춘다", async ({ page }) => {
    await page.clock.install();
    await page.goto("/");
    const banner = page.getByTestId("hero-banner");
    await expect(banner).toHaveAttribute("data-autoplay", "on");
    await banner.hover();
    await expect(banner).toHaveAttribute("data-autoplay", "off");
    await page.clock.runFor(10_000);
    await expect(banner).toContainText("1 / 3");
  });

  test("S64 reduced motion이면 넘어가지 않는다", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.clock.install();
    await page.goto("/");
    const banner = page.getByTestId("hero-banner");
    await expect(banner.getByRole("button", { name: "다음" })).toBeEnabled();
    await page.waitForFunction(() => document.readyState === "complete");
    await expect(banner).toHaveAttribute("data-autoplay", "off");
    await page.clock.runFor(10_000);
    await expect(banner).toContainText("1 / 3");
  });
});
