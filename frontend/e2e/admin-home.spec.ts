import { expect, test, type Page } from "@playwright/test";
import { setDemo } from "./helpers";

const summaryCards = (page: Page) => page.getByRole("region", { name: "처리 대기" }).getByRole("link");
const oldestItems = (page: Page) => page.getByRole("region", { name: "오래 기다린 요청" }).locator("ol > li");
const rankNumber = (page: Page) => oldestItems(page).first().locator("span").first();

test.describe("R14 테마와 글꼴", () => {
  test.beforeEach(async ({ context }) => {
    await setDemo(context, { role: "admin" });
  });

  test("S83 라이트는 교정쇄 바탕이고 순위 숫자만 에메랄드다", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/admin");
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(239, 239, 236)");
    await expect(summaryCards(page).first()).toHaveCSS("background-color", "rgb(251, 251, 250)");
    await expect(summaryCards(page).first()).toHaveCSS("box-shadow", "none");
    await expect(rankNumber(page)).toHaveCSS("color", "rgb(15, 124, 74)");
  });

  test("S84 다크는 uibowl 바탕이고 순위 숫자만 에메랄드다", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/admin");
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(0, 0, 0)");
    await expect(summaryCards(page).first()).toHaveCSS("background-color", "rgb(22, 24, 29)");
    await expect(summaryCards(page).first()).toHaveCSS("box-shadow", "none");
    await expect(rankNumber(page)).toHaveCSS("color", "rgb(18, 147, 87)");
  });

  test("S85 제목 글꼴은 Wanted Sans다", async ({ page }) => {
    await page.goto("/admin");
    const heading = page.getByRole("heading", { level: 1, name: "운영자 홈" });
    const fontFamily = await heading.evaluate((element) => getComputedStyle(element).fontFamily);
    expect(fontFamily).toMatch(/^"?wanted/i);
  });

  for (const colorScheme of ["light", "dark"] as const) {
    test(`S86 보상 보류는 강조색 없이 굵기로 강조한다 (${colorScheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.goto("/admin");
      const held = summaryCards(page).first().locator("strong");
      const textColor = await page.evaluate(() => getComputedStyle(document.body).color);
      await expect(held).toHaveCSS("color", textColor);
      await expect(held).toHaveCSS("font-weight", "800");
    });
  }
});

test.describe("R15 접근 권한", () => {
  test("S87 운영자는 운영자 홈을 본다", async ({ page, context }) => {
    await setDemo(context, { role: "admin" });
    await page.goto("/admin");
    await expect(page.getByRole("heading", { level: 1, name: "운영자 홈" })).toBeVisible();
    const headerTab = page.getByRole("navigation", { name: "주요 메뉴" }).getByRole("link", { name: "운영자 페이지" });
    await expect(headerTab).toHaveAttribute("aria-current", "page");
  });

  test("S88 비로그인은 로그인으로 간다", async ({ page, context }) => {
    await setDemo(context, { role: "guest" });
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin$/);
  });

  for (const role of ["tester", "developer"]) {
    test(`S89 일반 회원은 안내 화면을 본다 (${role})`, async ({ page, context }) => {
      await setDemo(context, { role });
      await page.goto("/admin");
      await expect(page.getByRole("heading", { level: 1, name: "운영자만 볼 수 있는 페이지예요" })).toBeVisible();
      await expect(page.getByRole("main").getByRole("link", { name: "홈으로" })).toHaveAttribute("href", "/");
      await expect(page.getByRole("navigation", { name: "운영자 메뉴" })).toHaveCount(0);
      await expect(page.getByRole("region", { name: "처리 대기" })).toHaveCount(0);
    });
  }

  test("S90 하위 페이지도 일반 회원에게 안내 화면을 보여 준다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/admin/reports");
    await expect(page.getByRole("heading", { level: 1, name: "운영자만 볼 수 있는 페이지예요" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "운영자 메뉴" })).toHaveCount(0);
  });

  test("S91 하위 페이지의 비로그인은 그 주소로 돌아오게 로그인으로 간다", async ({ page, context }) => {
    await setDemo(context, { role: "guest" });
    await page.goto("/admin/reports");
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin%2Freports$/);
  });
});

test.describe("R16 하위 탭", () => {
  test.beforeEach(async ({ context }) => {
    await setDemo(context, { role: "admin" });
  });

  test("S92 탭 5개가 순서대로 있고 홈이 현재 탭이다", async ({ page }) => {
    await page.goto("/admin");
    const tabs = page.getByRole("navigation", { name: "운영자 메뉴" }).getByRole("link");
    const expected = [
      ["홈", "/admin"],
      ["회원", "/admin/users"],
      ["신고·제재", "/admin/reports"],
      ["출금 요청", "/admin/withdrawals"],
      ["모집 취소", "/admin/cancellations"],
    ];
    await expect(tabs).toHaveCount(expected.length);
    for (const [index, [label, href]] of expected.entries()) {
      await expect(tabs.nth(index)).toHaveText(label);
      await expect(tabs.nth(index)).toHaveAttribute("href", href);
    }
    await expect(tabs.nth(0)).toHaveAttribute("aria-current", "page");
  });

  test("S93 탭을 누르면 이동하고 준비 중 화면이 나온다", async ({ page }) => {
    await page.goto("/admin");
    const nav = page.getByRole("navigation", { name: "운영자 메뉴" });
    await nav.getByRole("link", { name: "모집 취소" }).click();
    await expect(page).toHaveURL(/\/admin\/cancellations$/);
    await expect(nav.getByRole("link", { name: "모집 취소" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("heading", { level: 1, name: /준비 중/ })).toBeVisible();
  });
});

test.describe("R17 처리 대기", () => {
  test.beforeEach(async ({ context }) => {
    await setDemo(context, { role: "admin" });
  });

  test("S94 카드 3개에 영역별 대기 건수가 있다", async ({ page }) => {
    await page.goto("/admin");
    const cards = summaryCards(page);
    await expect(cards).toHaveCount(3);
    await expect(cards.nth(0)).toContainText("신고 대기");
    await expect(cards.nth(0)).toContainText("4건");
    await expect(cards.nth(0)).toContainText("보상 보류 2건");
    await expect(cards.nth(1)).toContainText("출금 요청");
    await expect(cards.nth(1)).toContainText("3건");
    await expect(cards.nth(2)).toContainText("모집 취소 요청");
    await expect(cards.nth(2)).toContainText("2건");
  });

  test("S95 카드는 해당 관리 페이지를 가리킨다", async ({ page }) => {
    await page.goto("/admin");
    const cards = summaryCards(page);
    await expect(cards.nth(0)).toHaveAttribute("href", "/admin/reports");
    await expect(cards.nth(1)).toHaveAttribute("href", "/admin/withdrawals");
    await expect(cards.nth(2)).toHaveAttribute("href", "/admin/cancellations");
  });

  test("S96 요청이 없으면 처리할 요청 없음이 보인다", async ({ page, context }) => {
    await setDemo(context, { data: "empty" });
    await page.goto("/admin");
    await expect(summaryCards(page).filter({ hasText: "처리할 요청 없음" })).toHaveCount(3);
  });
});

test.describe("R18 오래 기다린 요청", () => {
  test.beforeEach(async ({ context }) => {
    await setDemo(context, { role: "admin" });
  });

  test("S97 접수가 오래된 순서로 5개이고 첫 항목은 72시간 지난 신고다", async ({ page }) => {
    await page.goto("/admin");
    const items = oldestItems(page);
    await expect(items).toHaveCount(5);
    for (const [index, title] of ["회의록 정리", "이지우", "포트폴리오 빌더", "레시피핏", "북로그"].entries()) {
      await expect(items.nth(index)).toContainText(title);
    }
    await expect(items.first()).toContainText("신고");
    await expect(items.first()).toContainText("72시간 지남");
    await expect(page.getByRole("region", { name: "오래 기다린 요청" }).getByText("72시간 지남")).toHaveCount(1);
  });

  test("S98 요청이 없으면 빈 상태 문구가 보인다", async ({ page, context }) => {
    await setDemo(context, { data: "empty" });
    await page.goto("/admin");
    await expect(page.getByRole("region", { name: "오래 기다린 요청" })).toContainText("기다리는 요청이 없어요");
  });
});

test.describe("R19 최근 요청", () => {
  test.beforeEach(async ({ context }) => {
    await setDemo(context, { role: "admin" });
  });

  test("S99 세 열에 최근 3건 이하와 전체 보기 링크가 있다", async ({ page }) => {
    await page.goto("/admin");
    const region = page.getByRole("region", { name: "최근 요청" });
    await expect(region.getByRole("heading", { level: 3 })).toHaveText(["신고", "출금 요청", "모집 취소 요청"]);
    for (const list of await region.locator("ul").all()) {
      expect(await list.locator("li").count()).toBeLessThanOrEqual(3);
    }
    await expect(region.getByRole("link", { name: /전체 보기/ })).toHaveCount(3);
  });

  test("S100 홈에는 승인·반려 버튼이 없다", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("region", { name: "최근 요청" })).toBeVisible();
    await expect(page.getByRole("button", { name: /승인|반려/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /승인|반려/ })).toHaveCount(0);
  });
});

test.describe("R20 로딩", () => {
  test("S101 응답이 늦어도 제목과 탭은 먼저 보이고 목록은 스켈레톤이다", async ({ page, context }) => {
    await setDemo(context, { role: "admin", data: "slow" });
    await page.goto("/admin", { waitUntil: "commit" });
    await expect(page.getByRole("heading", { level: 1, name: "운영자 홈" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "운영자 메뉴" })).toBeVisible();
    await expect(page.locator('[data-skeleton="summary"]').first()).toBeVisible();
    await expect(summaryCards(page)).toHaveCount(3, { timeout: 10_000 });
    await expect(page.locator("[data-skeleton]")).toHaveCount(0);
  });
});

test.describe("R21 접근성과 좁은 화면", () => {
  test.beforeEach(async ({ context }) => {
    await setDemo(context, { role: "admin" });
  });

  test("S102 영역은 h2 제목으로 이름 붙고 요약 숫자는 함께 읽힌다", async ({ page }) => {
    await page.goto("/admin");
    for (const name of ["처리 대기", "오래 기다린 요청", "최근 요청"]) {
      await expect(page.getByRole("region", { name }).getByRole("heading", { level: 2, name })).toBeVisible();
    }
    await expect(page.getByRole("link", { name: /^신고 대기 4건/ })).toBeVisible();
  });

  test("S103 좁은 화면에서 요약 카드는 1열이고 가로로 넘치지 않는다", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/admin");
    const cards = summaryCards(page);
    await expect(cards).toHaveCount(3);
    const [first, second] = [await cards.nth(0).boundingBox(), await cards.nth(1).boundingBox()];
    expect(first?.x).toBe(second?.x);
    expect(second!.y).toBeGreaterThan(first!.y);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
