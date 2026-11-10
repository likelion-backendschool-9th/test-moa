import { expect, test } from "@playwright/test";
import { setDemo } from "./helpers";

test.describe("#257-R2 목업 모드 안내", () => {
  test("#257-S5 목업 모드에서는 안내만 보이고 혜택 양식은 없다", async ({ page, context }) => {
    await setDemo(context, { role: "admin" });
    await page.goto("/admin/plans");
    await expect(page.getByRole("heading", { name: "플랜 관리" })).toBeVisible();
    await expect(page.getByText("백엔드와 연결했을 때 쓸 수 있어요")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "혜택" })).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "플랜 관리" }).getByRole("link", { name: "혜택" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("navigation", { name: "운영자 메뉴" }).getByRole("link", { name: "플랜" })).toHaveAttribute("aria-current", "page");
  });
});
