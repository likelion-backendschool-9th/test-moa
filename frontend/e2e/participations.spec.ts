import { expect, test, type Page } from "@playwright/test";
import { setDemo } from "./helpers";

const tabs = (page: Page) => page.getByRole("navigation", { name: "참여 상태" });
const tab = (page: Page, name: string) => tabs(page).getByRole("link", { name });
const rows = (page: Page) => page.getByTestId("participation-row");
const rowNames = (page: Page) => rows(page).locator("h3").allTextContents();
const todoCards = (page: Page) => page.getByTestId("next-todo");

test.describe("R182 접근과 역할", () => {
  test("S448 비로그인은 탭까지 기억해 로그인으로 보낸다", async ({ page, context }) => {
    await setDemo(context, { role: "guest" });
    await page.goto("/my/participations?tab=history");
    await expect(page).toHaveURL(/\/login\?next=%2Fmy%2Fparticipations%3Ftab%3Dhistory$/);
  });
});

test.describe("R183 탭", () => {
  test("S453 탭을 누르면 URL이 바뀌고 뒤로 가기로 돌아온다", async ({ page }) => {
    await page.goto("/my/participations");
    await tab(page, "참여했던 테스트").click();
    await expect(page).toHaveURL(/\/my\/participations\?tab=history$/);
    await expect(tab(page, "참여했던 테스트")).toHaveAttribute("aria-current", "page");
    await page.goBack();
    await expect(tab(page, "참여 중인 테스트")).toHaveAttribute("aria-current", "page");
  });
});

test.describe("R184 다음 할 일 패널", () => {
  test("S455 마감이 가장 가까운 제출 전 참여와 주 버튼", async ({ page }) => {
    await page.goto("/my/participations");
    const first = todoCards(page).first();
    await expect(first).toContainText("회의록 정리");
    await expect(first).toContainText("D-8");
    await expect(first.getByRole("link", { name: "회의록 정리 피드백 쓰기" })).toHaveAttribute("href", "/my/participations/p-meeting-notes");
    await expect(page.getByRole("main").locator(".bg-accent")).toHaveCount(1);
    await expect(first.locator(".bg-accent")).toHaveCount(1);
  });
});

test.describe("R185 참여 목록", () => {
  test("S457 참여 중은 할 일 순서다", async ({ page }) => {
    await page.goto("/my/participations");
    expect(await rowNames(page)).toEqual(["회의록 정리", "중고책 장터", "가계부 노트", "모아플랜", "스터디 매칭", "동네 러닝 크루"]);
  });

  test("S460 지원한 테스트는 선정 대기가 먼저다", async ({ page }) => {
    await page.goto("/my/participations?tab=applied");
    expect(await rowNames(page)).toEqual(["북로그", "레시피핏"]);
    await expect(rows(page).first()).toContainText("선정 대기");
    await expect(rows(page).nth(1)).toContainText("미선정");
    await expect(rows(page).first().getByRole("link", { name: "북로그 모집 글 보기" })).toHaveAttribute("href", "/recruitments/booklog");
    await expect(rows(page).nth(1).getByRole("link", { name: "레시피핏 모집 글 보기" })).toHaveAttribute("href", "/recruitments/recipefit");
  });

  test("S461 참여했던 테스트는 최근 순이고 받은 크레딧 합계와 도장이 있다", async ({ page }) => {
    await page.goto("/my/participations?tab=history");
    expect(await rowNames(page)).toEqual(["메모 정원", "카페 지도", "주차 알리미"]);
    await expect(page.getByText("받은 크레딧 합계")).toContainText("2,250 크레딧");
    await expect(rows(page).filter({ hasText: "지급 완료" })).toHaveCount(2);
    for (const row of await rows(page).filter({ hasText: "지급 완료" }).all()) {
      await expect(row.getByRole("img", { name: "지급 완료" })).toBeVisible();
    }
  });
});
