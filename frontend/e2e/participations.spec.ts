import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { setDemo } from "./helpers";

const tabs = (page: Page) => page.getByRole("navigation", { name: "참여 상태" });
const tab = (page: Page, name: string) => tabs(page).getByRole("link", { name });
const rows = (page: Page) => page.getByTestId("participation-row");
const rowNames = (page: Page) => rows(page).locator("h3").allTextContents();
const deadlineList = (page: Page) => page.getByRole("region", { name: /^마감 임박 테스트/ });
const deadlineItems = (page: Page) => page.getByTestId("deadline-item");
const calendar = (page: Page) => page.getByRole("region", { name: "마감 캘린더" });

test.describe("R183 탭", () => {
  test("S453 탭을 누르면 URL이 바뀌고 뒤로 가기로 돌아온다", async ({ page }) => {
    await page.goto("/testers/recruitments");
    await tab(page, "참여했던 테스트").click();
    await expect(page).toHaveURL(/\/testers\/recruitments\?tab=history$/);
    await expect(tab(page, "참여했던 테스트")).toHaveAttribute("aria-current", "page");
    await page.goBack();
    await expect(tab(page, "참여 중인 테스트")).toHaveAttribute("aria-current", "page");
  });
});

test.describe("R184 마감 캘린더와 마감 임박 테스트", () => {
  const seoulMonthTitle = (offset = 0) => {
    const [year, month] = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", timeZone: "Asia/Seoul" })
      .format(new Date())
      .split("-")
      .map(Number);
    const total = year * 12 + month - 1 + offset;
    return `${Math.floor(total / 12)}년 ${(total % 12) + 1}월`;
  };

  test("S455 마감이 가장 가까운 제출 전 참여와 주 버튼", async ({ page }) => {
    await page.goto("/testers/recruitments");
    const first = deadlineItems(page).first();
    await expect(first).toContainText("회의록 정리");
    await expect(first).toContainText("D-8");
    await expect(first.getByRole("link", { name: "회의록 정리 피드백 쓰기" })).toHaveAttribute("href", "/testers/recruitments/p-meeting-notes");
    /* 주 버튼은 한 화면에 하나다. 추가 보상 배지도 강조색 면이지만 버튼이 아니다 */
    await expect(page.getByRole("main").locator("a.bg-accent, button.bg-accent")).toHaveCount(1);
    await expect(first.locator(".bg-accent")).toHaveCount(1);
  });

  test("#46-S9 내 제출 전 참여가 마감 순으로 목록에 나온다", async ({ page }) => {
    await page.goto("/testers/recruitments");
    await expect(deadlineList(page).getByRole("heading")).toHaveText("마감 임박 테스트 4");
    expect(await deadlineItems(page).locator("p:first-child").allTextContents()).toEqual([
      "회의록 정리D-8",
      "중고책 장터D-12",
      "가계부 노트D-14",
      "모아플랜D-16",
    ]);
    await expect(deadlineItems(page).nth(1).getByRole("link", { name: "중고책 장터 피드백 쓰기" })).toHaveAttribute("href", "/testers/recruitments/p-used-books");
    await expect(deadlineItems(page).nth(1).getByRole("link")).not.toHaveClass(/bg-accent/);
  });

  test("#46-S10 캘린더는 이번 달에서 시작해 오늘과 내 마감을 표시한다", async ({ page }) => {
    await page.goto("/testers/recruitments");
    const box = calendar(page);
    await expect(box.getByText(seoulMonthTitle(), { exact: true })).toBeVisible();
    await expect(box.getByRole("columnheader")).toHaveText(["일", "월", "화", "수", "목", "금", "토"]);
    await expect(box.locator('td[aria-current="date"]')).toHaveCount(1);

    /* 마감은 오늘부터 16일 안이라 이번 달과 다음 달에 모두 들어온다 */
    const marked = async () => box.locator("td[data-deadline] .sr-only").allTextContents();
    const thisMonth = await marked();
    await box.getByRole("button", { name: "다음 달" }).click();
    await expect(box.getByText(seoulMonthTitle(1), { exact: true })).toBeVisible();
    const nextMonth = await marked();
    expect([...thisMonth, ...nextMonth].sort()).toEqual(
      ["회의록 정리 제출 마감", "중고책 장터 제출 마감", "가계부 노트 제출 마감", "모아플랜 제출 마감"].sort(),
    );
  });

  test("#46-S11 이전·다음 달로 넘기고 해가 바뀌어도 맞으며 탭을 바꿔도 보던 달이 남는다", async ({ page }) => {
    await page.goto("/testers/recruitments");
    const box = calendar(page);
    const next = box.getByRole("button", { name: "다음 달" });
    for (let index = 1; index <= 12; index += 1) {
      await next.click();
      await expect(box.getByText(seoulMonthTitle(index), { exact: true })).toBeVisible();
    }
    await box.getByRole("button", { name: "이전 달" }).click();
    await expect(box.getByText(seoulMonthTitle(11), { exact: true })).toBeVisible();
    await expect(box.locator('td[aria-current="date"]')).toHaveCount(0);

    await tab(page, "지원한 테스트").click();
    await expect(page).toHaveURL("/testers/recruitments?tab=applied");
    await expect(rows(page)).toHaveCount(2);
    await expect(box.getByText(seoulMonthTitle(11), { exact: true })).toBeVisible();
  });
});

test.describe("R185 참여 목록", () => {
  test("S457 참여 중은 할 일 순서다", async ({ page }) => {
    await page.goto("/testers/recruitments");
    expect(await rowNames(page)).toEqual(["회의록 정리", "중고책 장터", "가계부 노트", "모아플랜", "스터디 매칭", "동네 러닝 크루"]);
  });

  test("S460 지원한 테스트는 선정 대기가 먼저다", async ({ page }) => {
    await page.goto("/testers/recruitments?tab=applied");
    expect(await rowNames(page)).toEqual(["북로그", "레시피핏"]);
    await expect(rows(page).first()).toContainText("선정 대기");
    await expect(rows(page).nth(1)).toContainText("미선정");
    await expect(rows(page).first().getByRole("link", { name: "북로그 모집 글 보기" })).toHaveAttribute("href", "/recruitments/booklog");
    await expect(rows(page).nth(1).getByRole("link", { name: "레시피핏 모집 글 보기" })).toHaveAttribute("href", "/recruitments/recipefit");
  });

  test("S461 참여했던 테스트는 최근 순이고 받은 크레딧 합계와 도장이 있다", async ({ page }) => {
    await page.goto("/testers/recruitments?tab=history");
    expect(await rowNames(page)).toEqual(["메모 정원", "카페 지도", "주차 알리미"]);
    await expect(page.getByText("받은 크레딧 합계")).toContainText("2,250 크레딧");
    await expect(rows(page).filter({ hasText: "지급 완료" })).toHaveCount(2);
    for (const row of await rows(page).filter({ hasText: "지급 완료" }).all()) {
      await expect(row.getByRole("img", { name: "지급 완료" })).toBeVisible();
    }
  });
});

test.describe("#46-R1 보기 방식", () => {
  const viewToggle = (page: Page) => page.getByRole("group", { name: "보기 방식" });
  const viewButton = (page: Page, name: "리스트" | "그리드") => viewToggle(page).getByRole("button", { name });
  const setGridCookie = (context: BrowserContext, value = "grid") =>
    context.addCookies([{ name: "participation-view", value, url: "http://localhost:3100" }]);
  /** 첫 줄에 놓인 카드 수 */
  const columnCount = async (page: Page) => {
    const tops = await rows(page).evaluateAll((cards) => cards.map((card) => Math.round(card.getBoundingClientRect().top)));
    return tops.filter((top) => top === tops[0]).length;
  };

  test("#46-S1 기본은 리스트이고 알 수 없는 쿠키 값도 리스트다", async ({ page, context }) => {
    await page.goto("/testers/recruitments");
    await expect(viewButton(page, "리스트")).toHaveAttribute("aria-pressed", "true");
    await expect(viewButton(page, "그리드")).toHaveAttribute("aria-pressed", "false");
    await expect(viewToggle(page)).toHaveText("");
    await expect(rows(page)).toHaveCount(6);
    expect(await columnCount(page)).toBe(1);

    await setGridCookie(context, "nope");
    await page.reload();
    await expect(viewButton(page, "리스트")).toHaveAttribute("aria-pressed", "true");
  });

  test("#46-S2 그리드를 고르면 주소는 그대로 한 줄에 3개씩 보인다", async ({ page }) => {
    await page.goto("/testers/recruitments");
    await viewButton(page, "그리드").click();
    await expect(viewButton(page, "그리드")).toHaveAttribute("aria-pressed", "true");
    await expect(page).toHaveURL("/testers/recruitments");
    await expect(rows(page)).toHaveCount(6);
    await expect.poll(() => columnCount(page)).toBe(3);

    const cards = await rows(page).evaluateAll((items) => items.slice(0, 3).map((item) => Math.round(item.getBoundingClientRect().height)));
    expect(new Set(cards).size).toBe(1);
    const firstCard = rows(page).first();
    const thumb = await firstCard.locator("[data-thumb]").boundingBox();
    const card = await firstCard.boundingBox();
    expect(thumb && card && card.width - thumb.width).toBe(48);

    await viewButton(page, "리스트").click();
    await expect(viewButton(page, "리스트")).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => columnCount(page)).toBe(1);
  });

  test("#46-S3 보기 방식을 바꿔도 스크롤과 방문 기록은 그대로다", async ({ page }) => {
    await page.goto("/testers/recruitments?tab=ongoing");
    await viewButton(page, "그리드").scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo(0, 400));
    const before = await page.evaluate(() => [window.scrollY, history.length]);
    await viewButton(page, "그리드").click();
    await expect(viewButton(page, "그리드")).toHaveAttribute("aria-pressed", "true");
    await expect(page).toHaveURL("/testers/recruitments?tab=ongoing");
    expect(await page.evaluate(() => [window.scrollY, history.length])).toEqual(before);
  });

  test("#46-S4 고른 보기 방식은 탭 이동, 상세 왕복, 새로고침 뒤에도 남는다", async ({ page }) => {
    await page.goto("/testers/recruitments");
    await viewButton(page, "그리드").click();
    await expect(viewButton(page, "그리드")).toHaveAttribute("aria-pressed", "true");

    await tab(page, "참여했던 테스트").click();
    await expect(page).toHaveURL("/testers/recruitments?tab=history");
    await expect(page.getByText("받은 크레딧 합계")).toBeVisible();
    await expect(viewButton(page, "그리드")).toHaveAttribute("aria-pressed", "true");

    await rows(page).first().getByRole("link").click();
    await expect(page).toHaveURL(/\/testers\/recruitments\/[^/?]+$/);
    await page.getByRole("main").getByRole("link", { name: /돌아가기|참여/ }).first().click();
    await expect(page).toHaveURL("/testers/recruitments?tab=history");
    await expect(viewButton(page, "그리드")).toHaveAttribute("aria-pressed", "true");

    await page.reload();
    await expect(viewButton(page, "그리드")).toHaveAttribute("aria-pressed", "true");
    await expect(rows(page)).toHaveCount(3);
    await expect.poll(() => columnCount(page)).toBe(3);
  });

  test("#46-S13 로그인이 끊긴 채 보기 방식을 바꾸면 저장하지 않고 로그인으로 보낸다", async ({ page, context }) => {
    await page.goto("/testers/recruitments?tab=history");
    await expect(viewButton(page, "그리드")).toBeVisible();
    await setDemo(context, { role: "guest" });
    await viewButton(page, "그리드").click();
    await expect(page).toHaveURL(/\/login\?next=%2Ftesters%2Frecruitments%3Ftab%3Dhistory$/);
    expect((await context.cookies()).some((cookie) => cookie.name === "participation-view")).toBe(false);
  });

  test("#46-S8 JS 번들을 받기 전에 눌러도 보기 방식이 바뀐다", async ({ page }) => {
    const bundle = "**/_next/static/**/*.js";
    await page.route(bundle, (route) => route.abort());
    await page.goto("/testers/recruitments");
    await page.unroute(bundle);
    const [request] = await Promise.all([
      page.waitForRequest((req) => req.isNavigationRequest()),
      viewButton(page, "그리드").click(),
    ]);
    expect(request.method()).toBe("POST");
    await expect(viewButton(page, "그리드")).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => columnCount(page)).toBe(3);
  });
});
