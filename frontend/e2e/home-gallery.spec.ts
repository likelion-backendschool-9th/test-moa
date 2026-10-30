import { expect, test, type Page } from "@playwright/test";
import { setDemo } from "./helpers";

const allSection = (page: Page) => page.locator("#all-tests");
const allCards = (page: Page) => allSection(page).getByTestId("recruitment-card");
const subscription = (page: Page) => page.getByRole("region", { name: "구독 모집" });
const names = (page: Page) => allCards(page).locator("h3").allTextContents();

test.describe("R5 검색", () => {
  test("S59 헤더 검색은 전체 테스트를 거른다", async ({ page }) => {
    await page.goto("/");
    const input = page.getByRole("banner").getByRole("searchbox", { name: "테스트 검색" });
    await input.fill("가계부");
    await input.press("Enter");
    await expect(page).toHaveURL(/\/\?q=%EA%B0%80%EA%B3%84%EB%B6%80#all-tests$/);
    await expect(allCards(page)).toHaveCount(1);
    await expect(allCards(page).first()).toContainText("가계부 노트");
  });
});

test.describe("R7 마감 임박 패널", () => {
  test("S65 마감이 가까운 모집 5개를 보여 준다", async ({ page }) => {
    await page.goto("/");
    const items = page.getByRole("region", { name: "마감 임박 테스트" }).locator("ol > li");
    await expect(items).toHaveCount(5);
    await expect(items.first()).toContainText("회의록 정리");
    await expect(items.first()).toContainText("D-1");
    await expect(page.getByRole("region", { name: "마감 임박 테스트" })).not.toContainText("포트폴리오 빌더");
  });
});

test.describe("R8 구독 모집", () => {
  test("S66 구독 모집 글 3개를 보여 준다", async ({ page }) => {
    await page.goto("/");
    const cards = subscription(page).getByTestId("recruitment-card");
    await expect(cards).toHaveCount(3);
    expect((await cards.locator("h3").allTextContents()).sort()).toEqual(["레시피핏", "모아플랜", "북로그"].sort());
    for (const card of await cards.all()) await expect(card).toContainText("추가 보상");
  });

  test("S67 구독 모집이 없으면 안내를 보여 준다", async ({ page, context }) => {
    await setDemo(context, { data: "empty" });
    await page.goto("/");
    await expect(subscription(page).getByText("구독하면 이 자리에 모집 글이 노출돼요")).toBeVisible();
    await expect(subscription(page).getByRole("link", { name: "구독 알아보기" })).toHaveAttribute("href", "/my/subscription");
  });
});

test.describe("R9 전체 테스트", () => {
  test("S68 기본은 10개 최신순이다", async ({ page }) => {
    await page.goto("/");
    await expect(allCards(page)).toHaveCount(10);
    await expect(allSection(page).getByText("10개", { exact: true })).toBeVisible();
    expect((await names(page))[0]).toBe("가계부 노트");
  });

  test("S69 검색어로 거른다", async ({ page }) => {
    await page.goto("/");
    await allSection(page).getByRole("searchbox", { name: "테스트 검색" }).fill("일정");
    await expect(page).toHaveURL(/q=%EC%9D%BC%EC%A0%95/);
    await expect(allCards(page)).toHaveCount(1);
    expect(await names(page)).toEqual(["모아플랜"]);
  });

  test("S70 카테고리로 거르고 초기화한다", async ({ page }) => {
    await page.goto("/");
    await allSection(page).getByRole("button", { name: "게임" }).click();
    await expect(page).toHaveURL(/type=game/);
    await expect(allSection(page).getByText("조건에 맞는 테스트가 없어요")).toBeVisible();
    await allSection(page).getByRole("link", { name: "조건 초기화" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(allCards(page)).toHaveCount(10);
  });

  test("S71 모집 중만 보기", async ({ page }) => {
    await page.goto("/");
    await allSection(page).getByRole("button", { name: "모집 중만 보기" }).click();
    await expect(page).toHaveURL(/open=1/);
    await expect(allCards(page)).toHaveCount(9);
    expect(await names(page)).not.toContain("포트폴리오 빌더");
  });

  test("S72 정렬을 바꾼다", async ({ page }) => {
    await page.goto("/");
    await allSection(page).getByRole("button", { name: "마감 임박순" }).click();
    await expect(page).toHaveURL(/sort=deadline/);
    await expect.poll(async () => (await names(page))[0]).toBe("회의록 정리");
    await allSection(page).getByRole("button", { name: "보상 많은순" }).click();
    await expect(page).toHaveURL(/sort=reward/);
    await expect.poll(async () => (await names(page))[0]).toBe("북로그");
  });

  test("S73 URL로 바로 열면 조건이 선택돼 있다", async ({ page }) => {
    await page.goto("/?type=web&open=1&sort=deadline");
    await expect(allSection(page).getByRole("button", { name: "웹서비스" })).toHaveAttribute("aria-pressed", "true");
    await expect(allSection(page).getByRole("button", { name: "모집 중만 보기" })).toHaveAttribute("aria-pressed", "true");
    await expect(allSection(page).getByRole("button", { name: "마감 임박순" })).toHaveAttribute("aria-pressed", "true");
    expect((await names(page))[0]).toBe("회의록 정리");
  });

  test("S74 썸네일은 활자이고 정원이 차면 도장이 찍힌다", async ({ page }) => {
    await page.goto("/");
    await expect(allCards(page).locator("img")).toHaveCount(0);
    const full = allCards(page).filter({ hasText: "포트폴리오 빌더" });
    await expect(full.getByRole("img", { name: "모집 완료" })).toBeVisible();
  });
});

test.describe("R10 로딩", () => {
  test("S75 응답이 늦어도 배너는 바로 보이고 목록은 스켈레톤이다", async ({ page, context }) => {
    await setDemo(context, { data: "slow" });
    await page.goto("/", { waitUntil: "commit" });
    await expect(page.getByRole("heading", { name: "새 서비스를 먼저 써 보고 크레딧을 받으세요" }).first()).toBeVisible();
    await expect(page.locator('[data-skeleton="card"]').first()).toBeVisible();
    await expect(allCards(page)).toHaveCount(10, { timeout: 10_000 });
    await expect(page.locator("[data-skeleton]")).toHaveCount(0);
  });

});

test.describe("R12 접근성", () => {
  test("S79 검색창 이름, 결과 수 알림, 칩 상태", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("searchbox", { name: "테스트 검색" })).toHaveCount(2);
    await expect(allSection(page).locator('[aria-live="polite"]').filter({ hasText: "개" })).toHaveCount(1);
    await expect(allSection(page).getByRole("button", { name: "전체" })).toHaveAttribute("aria-pressed", "true");
  });
});
