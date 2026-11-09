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

test.describe("#85-R9 신고에서 제재로", () => {
  test("#85-S27 신고 상세의 \"대상 회원 제재하기\"로 그 회원의 제재 양식으로 간다", async ({ page }) => {
    await page.goto("/admin/reports/report-1");
    const link = page.getByRole("link", { name: "오태민 제재하기" });
    await expect(link).toHaveAttribute("href", "/admin/users/user-6#sanction-form-heading");
    await link.click();
    await expect(page).toHaveURL("/admin/users/user-6#sanction-form-heading");
    await expect(page.getByRole("heading", { level: 2, name: /오태민/ })).toBeVisible();
  });
});

test.describe("#85-R12 신고 목록 상자", () => {
  test("#85-S30 검색과 처리 결과로 좁히고, 목록은 상자 안에서 스크롤한다", async ({ page, context }) => {
    await seedReportReviews(context, {});
    await page.goto("/admin/reports");
    const search = page.getByRole("searchbox", { name: "신고 검색" });
    await expect(rows(page)).toHaveCount(4);
    await search.fill("오태민");
    await expect(rows(page)).toHaveCount(1);
    await expect(page.getByText("1건", { exact: true })).toBeVisible();
    await search.fill("없는 이름");
    await expect(page.getByText("조건에 맞는 신고가 없어요")).toBeVisible();
    /* 검색·결과 필터는 주소에 남기지 않는다 */
    await expect(page).toHaveURL("/admin/reports");

    await statusTabs(page).getByRole("link", { name: "처리 완료" }).click();
    await expect(page).toHaveURL("/admin/reports?tab=done");
    const results = page.getByRole("group", { name: "처리 결과" });
    await expect(rows(page)).toHaveCount(2);
    await results.getByRole("button", { name: "인정" }).click();
    await expect(results.getByRole("button", { name: "인정" })).toHaveAttribute("aria-pressed", "true");
    for (const row of await rows(page).all()) await expect(row).toContainText("인정");

    const box = page.getByRole("region", { name: "신고 목록" });
    await expect(box).toHaveCSS("overflow-y", "auto");
  });
});
