import { expect, test, type Page } from "@playwright/test";

const allSection = (page: Page) => page.locator("#all-tests");
const allCards = (page: Page) => allSection(page).getByTestId("recruitment-card");
const names = (page: Page) => allCards(page).locator("h3").allTextContents();
const sortSelect = (page: Page) => allSection(page).getByRole("combobox", { name: "정렬" });
const pagination = (page: Page) => allSection(page).getByRole("navigation", { name: "페이지" });

test.describe("R9 전체 테스트", () => {
  test("S70 카테고리로 거르고 초기화한다", async ({ page }) => {
    await page.goto("/");
    await allSection(page).getByRole("button", { name: "게임" }).click();
    await expect(page).toHaveURL(/type=game/);
    await expect(allSection(page).getByText("조건에 맞는 테스트가 없어요")).toBeVisible();
    await allSection(page).getByRole("link", { name: "조건 초기화" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(allCards(page)).toHaveCount(20);
  });

  test("S71 모집 중만 보기", async ({ page }) => {
    await page.goto("/");
    await allSection(page).getByRole("button", { name: "모집 중만 보기" }).click();
    await expect(page).toHaveURL(/open=1/);
    await expect(allSection(page).getByText("총 21개", { exact: true })).toBeVisible();

    /* 모집 마감이 지난 반려식물 일지만 걸러진다. 모집 중이면 확정 인원과 관계없이 남는다 */
    await page.goto(`/?q=${encodeURIComponent("반려식물")}`);
    await expect(allCards(page)).toHaveCount(1);
    await page.goto(`/?q=${encodeURIComponent("반려식물")}&open=1`);
    await expect(allCards(page)).toHaveCount(0);
    await page.goto(`/?q=${encodeURIComponent("포트폴리오")}&open=1`);
    await expect(allCards(page)).toHaveCount(1);
  });

  test("#60-S4 페이지를 넘긴다", async ({ page }) => {
    await page.goto("/");
    await expect(pagination(page).getByRole("link", { name: "1" })).toHaveAttribute("aria-current", "page");
    await expect(pagination(page).getByRole("link", { name: "다음" })).toBeVisible();
    await pagination(page).getByRole("link", { name: "2" }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(allCards(page)).toHaveCount(2);
    await expect(allSection(page).getByText("총 22개", { exact: true })).toBeVisible();
    await expect(pagination(page).getByRole("link", { name: "2" })).toHaveAttribute("aria-current", "page");
    await expect(pagination(page).getByRole("link", { name: "이전" })).toBeVisible();
  });

  test("#60-S5 조건을 바꾸면 1페이지로 돌아간다", async ({ page }) => {
    await page.goto("/?page=2");
    await expect(allCards(page)).toHaveCount(2);
    await sortSelect(page).selectOption({ label: "마감 임박순" });
    await expect(page).toHaveURL(/sort=deadline/);
    expect(page.url()).not.toContain("page=");
    await expect.poll(async () => (await names(page))[0]).toBe("회의록 정리");
    await allSection(page).getByRole("searchbox", { name: "테스트 검색" }).fill("일정");
    await expect(allCards(page)).toHaveCount(1);
    expect(await names(page)).toEqual(["모아플랜"]);
    await expect(pagination(page)).toHaveCount(0);
  });
});
