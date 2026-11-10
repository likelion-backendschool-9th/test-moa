import { expect, test } from "@playwright/test";
import { setDemo } from "./helpers";

test.describe("#204-R2 목업 모드 안내", () => {
  test("#204-S12 목업 모드에서는 안내만 보이고 검색창과 구독 버튼은 없다", async ({ page, context }) => {
    await setDemo(context, { role: "admin" });
    await page.goto("/admin/plans?tab=subscriptions");
    await expect(page.getByRole("heading", { name: "플랜 관리" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "플랜 관리" }).getByRole("link", { name: "회원 구독" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByText("백엔드와 연결했을 때 쓸 수 있어요")).toBeVisible();
    await expect(page.getByRole("searchbox")).toHaveCount(0);
    await expect(page.getByRole("textbox", { name: "회원 이메일" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "구독 주기" })).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "운영자 메뉴" }).getByRole("link", { name: "플랜" })).toHaveAttribute("aria-current", "page");
  });

  test("#257-S8 예전 /admin/subscriptions 주소는 회원 구독 탭으로 넘어간다", async ({ page, context }) => {
    await setDemo(context, { role: "admin" });
    await page.goto("/admin/subscriptions?email=a%40example.com");
    await expect(page).toHaveURL(/\/admin\/plans\?tab=subscriptions&email=a%40example\.com$/);
    await expect(page.getByRole("navigation", { name: "플랜 관리" }).getByRole("link", { name: "회원 구독" })).toHaveAttribute("aria-current", "page");
  });
});
