import { expect, test, type Page } from "@playwright/test";
import { setDemo } from "./helpers";

const allSection = (page: Page) => page.locator("#all-tests");
const allCards = (page: Page) => allSection(page).getByTestId("recruitment-card");
const names = (page: Page) => allCards(page).locator("h3").allTextContents();
const sortSelect = (page: Page) => allSection(page).getByRole("combobox", { name: "정렬" });
const pagination = (page: Page) => allSection(page).getByRole("navigation", { name: "페이지" });

test.describe("R9 전체 테스트", () => {
  test("S68 기본은 첫 페이지 20개 최신순이다", async ({ page }) => {
    await page.goto("/");
    await expect(allCards(page)).toHaveCount(20);
    await expect(allSection(page).getByText("총 22개", { exact: true })).toBeVisible();
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
    await expect(allCards(page)).toHaveCount(20);
  });

  test("S71 모집 중만 보기", async ({ page }) => {
    await page.goto("/");
    await allSection(page).getByRole("button", { name: "모집 중만 보기" }).click();
    await expect(page).toHaveURL(/open=1/);
    await expect(allSection(page).getByText("총 21개", { exact: true })).toBeVisible();
    expect(await names(page)).not.toContain("포트폴리오 빌더");
  });

  test("S72 정렬을 바꾼다", async ({ page }) => {
    await page.goto("/");
    await expect(sortSelect(page).getByRole("option")).toHaveText(["최신순", "마감 임박순"]);
    await sortSelect(page).selectOption({ label: "마감 임박순" });
    await expect(page).toHaveURL(/sort=deadline/);
    await expect.poll(async () => (await names(page))[0]).toBe("회의록 정리");
    await page.goto("/?sort=reward");
    await expect(sortSelect(page)).toHaveValue("latest");
    expect((await names(page))[0]).toBe("가계부 노트");
  });

  test("S73 URL로 바로 열면 조건이 선택돼 있다", async ({ page }) => {
    await page.goto("/?type=web&open=1&sort=deadline");
    await expect(allSection(page).getByRole("button", { name: "웹서비스" })).toHaveAttribute("aria-pressed", "true");
    await expect(allSection(page).getByRole("button", { name: "모집 중만 보기" })).toHaveAttribute("aria-pressed", "true");
    await expect(sortSelect(page)).toHaveValue("deadline");
    expect((await names(page))[0]).toBe("회의록 정리");
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

  test("#60-S6 모집 글이 없으면 조건 없음 문구를 보여 준다", async ({ page, context }) => {
    await setDemo(context, { data: "empty" });
    await page.goto("/");
    await expect(allSection(page).getByText("지금 모집 중인 테스트가 없어요")).toBeVisible();
    await expect(allSection(page).getByRole("link", { name: "조건 초기화" })).toHaveCount(0);
    await allSection(page).getByRole("button", { name: "모집 중만 보기" }).click();
    await expect(page).toHaveURL(/open=1/);
    await expect(allSection(page).getByText("조건에 맞는 테스트가 없어요")).toBeVisible();
    await expect(allSection(page).getByRole("link", { name: "조건 초기화" })).toBeVisible();
  });
});

test.describe("R8 구독 모집", () => {
  test("#60-S7 구독 개발자의 모집 글이 없으면 영역을 그리지 않는다", async ({ page, context }) => {
    await setDemo(context, { data: "empty" });
    await page.goto("/");
    await expect(allSection(page).getByText("지금 모집 중인 테스트가 없어요")).toBeVisible();
    await expect(page.getByRole("heading", { name: "이런 테스트도 있어요" })).toHaveCount(0);
    await expect(page.getByText("구독하면 이 자리에 모집 글이 노출돼요")).toHaveCount(0);
  });
});
