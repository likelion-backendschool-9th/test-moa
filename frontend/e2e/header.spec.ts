import { expect, type Page, test } from "@playwright/test";
import { setDemo } from "./helpers";

const header = (page: Page) => page.getByRole("banner");

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
});
