import { expect, type Page, test } from "@playwright/test";
import { setDemo } from "./helpers";

const CHECKOUT = "/my/subscription/checkout";
const PASSWORD = "test1234";

const planCard = (page: Page) => page.getByRole("region", { name: "PRO", exact: true });

async function loginAsTester(page: Page) {
  await page.getByRole("main").getByLabel("이메일").fill("seoyun@example.com");
  await page.getByRole("main").getByLabel("비밀번호").fill(PASSWORD);
  await page.getByRole("main").getByRole("button", { name: "로그인", exact: true }).click();
}

test.describe("#76-R2 구독 버튼", () => {
  test("#76-S4 비로그인은 로그인 뒤 결제로", async ({ page, context }) => {
    await setDemo(context, { role: "guest" });
    await page.goto("/subscription");
    await planCard(page).getByRole("link", { name: "구독하기" }).click();
    await expect(page).toHaveURL(`/login?next=${encodeURIComponent(CHECKOUT)}`);
    await loginAsTester(page);
    await expect(page).toHaveURL(CHECKOUT);
  });

  test("#76-S7 운영자", async ({ page, context }) => {
    await setDemo(context, { role: "admin" });
    await page.goto("/subscription");
    await expect(page.getByRole("region", { name: "FREE" })).toBeVisible();
    await expect(planCard(page)).toBeVisible();
    await expect(page.getByText("운영자 계정은 구독 대상이 아니에요")).toBeVisible();
    await expect(page.getByRole("link", { name: "구독하기" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "구독 연장하기" })).toHaveCount(0);
  });
});
