import { expect, test, type Page } from "@playwright/test";
import { setDemo } from "./helpers";

const summaryCards = (page: Page) => page.getByRole("region", { name: "처리 대기" }).getByRole("link");
const oldestItems = (page: Page) => page.getByRole("region", { name: "오래 기다린 요청" }).locator("ol > li");

test.describe("R15 접근 권한", () => {
  for (const role of ["tester"]) {
    test(`S407 일반 회원은 안내 화면을 본다 (${role})`, async ({ page, context }) => {
      await setDemo(context, { role });
      await page.goto("/admin");
      await expect(page.getByRole("heading", { level: 1, name: "운영자만 볼 수 있는 페이지예요" })).toBeVisible();
      await expect(page.getByRole("main").getByRole("link", { name: "홈으로" })).toHaveAttribute("href", "/");
      await expect(page.getByRole("navigation", { name: "운영자 메뉴" })).toHaveCount(0);
      await expect(page.getByRole("region", { name: "처리 대기" })).toHaveCount(0);
    });
  }

  test("S409 하위 페이지의 비로그인은 그 주소로 돌아오게 로그인으로 간다", async ({ page, context }) => {
    await setDemo(context, { role: "guest" });
    await page.goto("/admin/reports");
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin%2Freports$/);
  });
});

test.describe("R17 처리 대기", () => {
  test.beforeEach(async ({ context }) => {
    await setDemo(context, { role: "admin" });
  });

  test("S412 카드 2개에 영역별 대기 건수가 있다", async ({ page }) => {
    await page.goto("/admin");
    const cards = summaryCards(page);
    await expect(cards).toHaveCount(2);
    await expect(cards.nth(0)).toContainText("신고 대기");
    await expect(cards.nth(0)).toContainText("4건");
    await expect(cards.nth(0)).toContainText("보상 보류 2건");
    await expect(cards.nth(1)).toContainText("출금 요청");
    await expect(cards.nth(1)).toContainText("3건");
  });
});

test.describe("R18 오래 기다린 요청", () => {
  test.beforeEach(async ({ context }) => {
    await setDemo(context, { role: "admin" });
  });

  test("S415 접수가 오래된 순서로 5개이고 첫 항목은 72시간 지난 신고다", async ({ page }) => {
    await page.goto("/admin");
    const items = oldestItems(page);
    await expect(items).toHaveCount(5);
    for (const [index, title] of ["회의록 정리", "이지우", "포트폴리오 빌더", "북로그", "김민준"].entries()) {
      await expect(items.nth(index)).toContainText(title);
    }
    await expect(items.first()).toContainText("신고");
    await expect(items.first()).toContainText("72시간 지남");
    await expect(page.getByRole("region", { name: "오래 기다린 요청" }).getByText("72시간 지남")).toHaveCount(1);
  });
});

test.describe("R19 최근 요청", () => {
  test.beforeEach(async ({ context }) => {
    await setDemo(context, { role: "admin" });
  });

  test("S417 두 열에 최근 3건 이하와 전체 보기 링크가 있다", async ({ page }) => {
    await page.goto("/admin");
    const region = page.getByRole("region", { name: "최근 요청" });
    await expect(region.getByRole("heading", { level: 3 })).toHaveText(["신고", "출금 요청"]);
    for (const list of await region.locator("ul").all()) {
      expect(await list.locator("li").count()).toBeLessThanOrEqual(3);
    }
    await expect(region.getByRole("link", { name: /전체 보기/ })).toHaveCount(2);
  });
});
