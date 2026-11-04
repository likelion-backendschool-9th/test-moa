import { expect, test, type Page } from "@playwright/test";
import { setDemo } from "./helpers";

const rows = (page: Page) => page.getByRole("main").locator("ul[aria-label] > li");
const statusTabs = (page: Page) => page.getByRole("navigation", { name: "신고 상태" });
/** 주소의 경로와 검색 값을 확인한다. 값의 순서나 다른 값이 더 붙어도 깨지지 않게 파싱해서 본다 */
async function expectUrl(page: Page, pathname: string, query: Record<string, string>) {
  await expect
    .poll(() => {
      const url = new URL(page.url());
      return { pathname: url.pathname, query: Object.fromEntries(url.searchParams) };
    })
    .toEqual({ pathname, query });
}

const targetFilters = (page: Page) => page.getByRole("navigation", { name: "신고 대상" });

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

test.describe("R24 접근 권한", () => {
  test("S427 없는 신고는 맞춤 404 화면을 보여 준다", async ({ page }) => {
    await page.goto("/admin/reports/nope");
    await expect(page.getByRole("heading", { level: 1, name: "찾는 페이지가 없어요" })).toBeVisible();
    /* 스트리밍 순서에 따라 Next가 noindex 메타를 두 번 넣기도 해서 개수가 아니라 있는지만 본다 */
    await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
  });
});

test.describe("R25 목록", () => {
  test("S428 검토 대기는 오래 기다린 순서다", async ({ page }) => {
    await page.goto("/admin/reports");
    await expect(statusTabs(page).getByRole("link", { name: "검토 대기" })).toHaveAttribute("aria-current", "page");
    const list = rows(page);
    await expect(list).toHaveCount(4);
    for (const [index, name] of ["회의록 정리", "포트폴리오 빌더", "북로그", "가계부 노트"].entries()) {
      await expect(list.nth(index)).toContainText(name);
    }
    const first = list.first();
    for (const text of ["피드백", "요청한 기능을 써 보지 않고 제출했어요", "접수", "보상 보류", "72시간 지남"]) {
      await expect(first).toContainText(text);
    }
  });

  test("S429 처리 완료는 최근 처리 순서이고 결과와 처리 시각이 있다", async ({ page }) => {
    await page.goto("/admin/reports");
    await statusTabs(page).getByRole("link", { name: "처리 완료" }).click();
    await expect(page).toHaveURL(/\/admin\/reports\?tab=done$/);
    const list = rows(page);
    await expect(list).toHaveCount(2);
    await expect(list.nth(0)).toContainText("레시피핏");
    await expect(list.nth(0)).toContainText("기각");
    await expect(list.nth(1)).toContainText("스터디 매칭");
    await expect(list.nth(1)).toContainText("인정");
    await expect(list.nth(0)).toContainText("처리");
  });

  test("S528 대상 종류를 고르면 그 종류의 신고만 보이고 주소에 남는다", async ({ page }) => {
    await page.goto("/admin/reports");
    const filters = targetFilters(page);
    await expect(filters.getByRole("link", { name: "전체" })).toHaveAttribute("aria-current", "page");
    for (const [label, query, names] of [
      ["피드백", "feedback", ["회의록 정리", "북로그"]],
      ["모집 글", "recruitment", ["포트폴리오 빌더"]],
      ["회원", "user", ["가계부 노트"]],
    ] as const) {
      await filters.getByRole("link", { name: label }).click();
      await expectUrl(page, "/admin/reports", { target: query });
      await expect(filters.getByRole("link", { name: label })).toHaveAttribute("aria-current", "page");
      await expect(rows(page)).toHaveCount(names.length);
      for (const [index, name] of names.entries()) await expect(rows(page).nth(index)).toContainText(name);
    }
    await filters.getByRole("link", { name: "전체" }).click();
    await expectUrl(page, "/admin/reports", {});
    await expect(rows(page)).toHaveCount(4);
  });

  test("S529 상태 탭과 대상 필터는 서로의 선택을 남긴다", async ({ page }) => {
    await page.goto("/admin/reports?target=feedback");
    await statusTabs(page).getByRole("link", { name: "처리 완료" }).click();
    await expectUrl(page, "/admin/reports", { tab: "done", target: "feedback" });
    await expect(rows(page)).toHaveCount(2);
    await targetFilters(page).getByRole("link", { name: "회원" }).click();
    await expectUrl(page, "/admin/reports", { tab: "done", target: "user" });
    await expect(page.getByText("'회원' 신고 중에는 처리한 신고가 없어요")).toBeVisible();
    await statusTabs(page).getByRole("link", { name: "검토 대기" }).click();
    await expectUrl(page, "/admin/reports", { target: "user" });
    await expect(rows(page)).toHaveCount(1);
  });

  test("S532 상세를 거쳐도 보던 탭과 필터가 남는다", async ({ page }) => {
    await page.goto("/admin/reports?target=feedback");
    await rows(page).first().getByRole("link").click();
    await expectUrl(page, "/admin/reports/report-1", { target: "feedback" });
    await page.getByRole("link", { name: "목록으로" }).click();
    await expectUrl(page, "/admin/reports", { target: "feedback" });
    await expect(rows(page)).toHaveCount(2);
    /* 처리하면 보던 필터의 목록으로 돌아와서 다음 신고를 이어서 처리할 수 있다 */
    await rows(page).first().getByRole("link").click();
    await page.getByRole("radio", { name: /^기각/ }).check();
    await page.getByRole("button", { name: "처리하기" }).click();
    await expect(page).toHaveURL(/\/admin\/reports\?/);
    await expectUrl(page, "/admin/reports", { target: "feedback", processed: "dismissed", held: "1" });
    await expect(rows(page)).toHaveCount(1);
    /* 처리 완료 탭에서 연 상세도 그 탭으로 돌아간다 */
    await page.goto("/admin/reports?tab=done&target=feedback");
    await rows(page).first().getByRole("link").click();
    await page.getByRole("link", { name: "목록으로" }).click();
    await expectUrl(page, "/admin/reports", { tab: "done", target: "feedback" });
  });
});

test.describe("R26 상세", () => {
  test("S432 피드백 신고는 대상과 피드백 원문을 보여 준다", async ({ page }) => {
    await page.goto("/admin/reports/report-1");
    const main = page.getByRole("main");
    for (const text of ["요청한 기능을 써 보지 않고 제출했어요", "정하린", "오태민", "회의록 정리", "접수", "보상 보류 중"]) {
      await expect(main).toContainText(text);
    }
    await expect(page.getByRole("region", { name: "제출된 피드백" })).toContainText("잘 되는 것 같아요");
  });
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

  test("S438 인정하면 제재 이력에 반영된다는 문구가 보인다", async ({ page }) => {
    await decide(page, "report-2", "인정", "같은 문장만 반복했어요");
    await expect(page.getByRole("status")).toHaveText("신고를 인정했어요. 제재 이력에 반영돼요.");
    await statusTabs(page).getByRole("link", { name: "처리 완료" }).click();
    await expect(rows(page).filter({ hasText: "북로그" })).toContainText("인정");
  });

  test("S439 처리한 신고의 상세는 결과만 보여 준다", async ({ page }) => {
    await decide(page, "report-2", "인정", "같은 문장만 반복했어요");
    await page.goto("/admin/reports/report-2");
    await expect(page.getByRole("button", { name: "처리하기" })).toHaveCount(0);
    const result = page.getByRole("region", { name: "처리 결과" });
    await expect(result).toContainText("인정");
    await expect(result).toContainText("같은 문장만 반복했어요");
    await expect(result).toContainText("처리");
  });

  test("S446 기록을 저장할 공간이 모자라면 처리하지 않고 알린다", async ({ page, context }) => {
    /* 메모가 긴 처리 기록 3건이 이미 있어서, 80자 메모를 하나 더 담으면 쿠키 한도를 넘는 상태 */
    const review = (memo: string) => ({ decision: "dismissed", memo, processedAt: new Date().toISOString() });
    const stored = Object.fromEntries(["report-2", "report-3", "report-4"].map((key) => [key, review("가".repeat(120))]));
    await context.addCookies([
      { name: "demo-reports", value: encodeURIComponent(JSON.stringify(stored)), url: "http://localhost:3100" },
    ]);
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
