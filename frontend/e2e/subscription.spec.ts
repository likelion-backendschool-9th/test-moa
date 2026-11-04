import { expect, type Page, test } from "@playwright/test";
import { setDemo } from "./helpers";

const region = (page: Page, name: string) => page.getByRole("region", { name, exact: true });

/** 구독 결제에 쓸 수 있는 크레딧 줄. 상품 가격 줄과 구분하려고 카드 바로 아래 dl만 본다 */
const payableRow = (page: Page) => region(page, "결제 안내").locator(":scope > dl");

test.describe("R149 내 구독 상태", () => {
  test("S385 구독 중이면 상품, 남은 기간, 만료일", async ({ page, context }) => {
    await setDemo(context, { role: "developer" });
    await page.goto("/my/subscription");
    const status = region(page, "내 구독");
    const expiresAt = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", timeZone: "Asia/Seoul" }).format(
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    );
    await expect(status.getByText("구독 중", { exact: true })).toBeVisible();
    const value = (label: string) => status.locator("dl > div").filter({ hasText: label }).locator("dd");
    await expect(value("이용 중인 상품")).toHaveText("구독");
    await expect(value("남은 기간")).toHaveText("D-30");
    await expect(value("만료일")).toHaveText(expiresAt);
  });
});

test.describe("R151 결제 안내", () => {
  test("S391 출금 처리 중인 크레딧은 빼고 보여 준다", async ({ page, context }) => {
    await setDemo(context, { role: "developer" });
    await page.goto("/my/subscription");
    const payment = region(page, "결제 안내");
    await expect(payableRow(page)).toHaveText("구독 결제에 쓸 수 있는 크레딧2,260 크레딧");
    await expect(payment.getByRole("link", { name: "크레딧 내역" })).toHaveAttribute("href", "/my/credits");
  });
});
