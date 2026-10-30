import { expect, test } from "@playwright/test";
import { setDemo } from "./helpers";

test.describe("R2 헤더와 계정", () => {
  test("S2 로그인 상태는 내 정보와 보유 크레딧을 보여 준다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/");
    const header = page.getByRole("banner");
    await expect(header.getByRole("link", { name: "Test Moa" })).toHaveAttribute("href", "/");
    await expect(header.getByRole("link", { name: "내 정보" })).toHaveAttribute("href", "/my/profile/edit");
    await expect(header.getByRole("link", { name: "12,480 크레딧" })).toHaveAttribute("href", "/my/credits");
    await expect(header.getByRole("link", { name: "로그인" })).toHaveCount(0);
  });

  test("S3 비로그인 상태는 로그인과 회원가입을 보여 준다", async ({ page, context }) => {
    await setDemo(context, { role: "guest" });
    await page.goto("/");
    const header = page.getByRole("banner");
    await expect(header.getByRole("link", { name: "로그인" })).toHaveAttribute("href", "/login");
    await expect(header.getByRole("link", { name: "회원가입" })).toHaveAttribute("href", "/signup");
    await expect(header.getByRole("link", { name: "내 정보" })).toHaveCount(0);
    await expect(header.getByRole("link", { name: /크레딧/ })).toHaveCount(0);
  });

  test("S4 쿠키가 없으면 테스터로 본다", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("banner").getByRole("link", { name: "12,480 크레딧" })).toBeVisible();
  });

  test("S5 알 수 없는 역할 값도 테스터로 본다", async ({ page, context }) => {
    await setDemo(context, { role: "foo" });
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("banner").getByRole("link", { name: "12,480 크레딧" })).toBeVisible();
  });
});
