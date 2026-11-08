import { expect, test, type Page } from "@playwright/test";
import { setDemo, seedReportReviews } from "./helpers";

const rows = (page: Page) => page.getByRole("main").locator("ul[aria-label] > li");
const statusTabs = (page: Page) => page.getByRole("navigation", { name: "신고 상태" });

async function decide(page: Page, reportKey: string, decision: "기각" | "인정", memo?: string) {
  await page.goto(`/admin/reports/${reportKey}`);
  await page.getByRole("radio", { name: new RegExp(`^${decision}`) }).check();
  if (memo) await page.getByRole("textbox", { name: "처리 메모" }).fill(memo);
  await page.getByRole("button", { name: "처리하기" }).click();
  await expect(page).toHaveURL(/\/admin\/reports\?processed=/);
}

test.beforeEach(async ({ context }) => {
  await setDemo(context, { role: "admin" });
});

test.describe("R27 처리", () => {
  test("S437 기각하면 처리 완료로 옮겨진다", async ({ page }) => {
    await decide(page, "report-1", "기각");
    await expect(page.getByRole("status")).toHaveText("신고를 기각했어요. 보류된 보상이 지급돼요.");
    await expect(rows(page)).toHaveCount(3);
    await statusTabs(page).getByRole("link", { name: "처리 완료" }).click();
    await expect(rows(page).filter({ hasText: "회의록 정리" })).toContainText("기각");
    /* 보상 보류가 없던 신고는 지급 문구가 없다 */
    await decide(page, "report-3", "기각");
    await expect(page.getByRole("status")).toHaveText("신고를 기각했어요.");
  });

  test("S446 기록을 저장할 공간이 모자라면 처리하지 않고 알린다", async ({ page, context }) => {
    /* 메모가 긴 처리 기록 3건이 이미 있어서, 80자 메모를 하나 더 담으면 쿠키 한도를 넘는 상태 */
    const review = (memo: string) => ({ decision: "dismissed", memo, processedAt: new Date().toISOString() });
    const stored = Object.fromEntries(["report-2", "report-3", "report-4"].map((key) => [key, review("가".repeat(120))]));
    await seedReportReviews(context, stored);
    await page.goto("/admin/reports/report-1");
    await page.getByRole("radio", { name: /^기각/ }).check();
    await page.getByRole("textbox", { name: "처리 메모" }).fill("나".repeat(80));
    await page.getByRole("button", { name: "처리하기" }).click();
    await expect(page).toHaveURL(/\/admin\/reports\/report-1\?error=memo$/);
    await expect(page.getByRole("main").getByRole("alert")).toContainText("시연용 저장 공간이 모자라 처리하지 못했어요");
    await page.goto("/admin/reports");
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first()).toContainText("회의록 정리");
  });

  test("S440 처리 결과가 운영자 홈 건수에 반영된다", async ({ page }) => {
    await decide(page, "report-1", "기각");
    await page.goto("/admin");
    const card = page.getByRole("region", { name: "처리 대기" }).getByRole("link").first();
    await expect(card).toContainText("3건");
    await expect(card).toContainText("보상 보류 1건");
  });
});
