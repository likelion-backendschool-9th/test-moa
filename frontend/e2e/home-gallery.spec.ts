import { expect, test, type Page } from "@playwright/test";

const allSection = (page: Page) => page.locator("#all-tests");
const allCards = (page: Page) => allSection(page).getByTestId("recruitment-card");
const names = (page: Page) => allCards(page).locator("h3").allTextContents();

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
});
