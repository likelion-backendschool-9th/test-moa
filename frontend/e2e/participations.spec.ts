import { expect, test, type Page } from "@playwright/test";
import { expectNoHorizontalOverflow, setDemo } from "./helpers";

const tabs = (page: Page) => page.getByRole("navigation", { name: "참여 상태" });
const tab = (page: Page, name: string) => tabs(page).getByRole("link", { name });
const rows = (page: Page) => page.getByTestId("participation-row");
const rowNames = (page: Page) => rows(page).locator("h3").allTextContents();
const nextTodo = (page: Page) => page.getByRole("region", { name: /^다음 할 일/ });
const todoCards = (page: Page) => page.getByTestId("next-todo");

test.describe("R1 접근과 역할", () => {
  test("S83 비로그인은 탭까지 기억해 로그인으로 보낸다", async ({ page, context }) => {
    await setDemo(context, { role: "guest" });
    await page.goto("/my/participations?tab=history");
    await expect(page).toHaveURL(/\/login\?next=%2Fmy%2Fparticipations%3Ftab%3Dhistory$/);
  });

  test("S84 테스터는 참여 테스트 화면을 본다", async ({ page }) => {
    const response = await page.goto("/my/participations");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: "참여 테스트" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "주요 메뉴" }).getByRole("link", { name: "참여 테스트" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("S85 개발자는 빈 상태를 본다", async ({ page, context }) => {
    await setDemo(context, { role: "developer" });
    const response = await page.goto("/my/participations");
    expect(response?.status()).toBe(200);
    await expect(page.getByText("아직 참여한 테스트가 없어요")).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "테스트 둘러보기" })).toHaveAttribute("href", "/recruitments");
  });
});

test.describe("R2 탭", () => {
  test("S86 기본 탭은 참여 중이고 탭 3개가 순서대로 있다", async ({ page }) => {
    await page.goto("/my/participations");
    await expect(tab(page, "참여 중인 테스트")).toHaveAttribute("aria-current", "page");
    const links = tabs(page).getByRole("link");
    await expect(links).toHaveCount(3);
    const expected = [
      ["지원한 테스트", "/my/participations?tab=applied"],
      ["참여 중인 테스트", "/my/participations?tab=ongoing"],
      ["참여했던 테스트", "/my/participations?tab=history"],
    ];
    for (const [index, [name, href]] of expected.entries()) {
      await expect(links.nth(index)).toContainText(name);
      await expect(links.nth(index)).toHaveAttribute("href", href);
    }
  });

  test("S87 탭 옆에 개수가 보인다", async ({ page }) => {
    await page.goto("/my/participations");
    await expect(tab(page, "지원한 테스트")).toHaveText("지원한 테스트2");
    await expect(tab(page, "참여 중인 테스트")).toHaveText("참여 중인 테스트6");
    await expect(tab(page, "참여했던 테스트")).toHaveText("참여했던 테스트3");
  });

  test("S88 탭을 누르면 URL이 바뀌고 뒤로 가기로 돌아온다", async ({ page }) => {
    await page.goto("/my/participations");
    await tab(page, "참여했던 테스트").click();
    await expect(page).toHaveURL(/\/my\/participations\?tab=history$/);
    await expect(tab(page, "참여했던 테스트")).toHaveAttribute("aria-current", "page");
    await page.goBack();
    await expect(tab(page, "참여 중인 테스트")).toHaveAttribute("aria-current", "page");
  });

  test("S89 알 수 없는 탭은 기본 탭을 보여 준다", async ({ page }) => {
    const response = await page.goto("/my/participations?tab=foo");
    expect(response?.status()).toBe(200);
    await expect(tab(page, "참여 중인 테스트")).toHaveAttribute("aria-current", "page");
  });
});

test.describe("R3 다음 할 일 패널", () => {
  test("S90 마감이 가장 가까운 제출 전 참여와 주 버튼", async ({ page }) => {
    await page.goto("/my/participations");
    const first = todoCards(page).first();
    await expect(first).toContainText("회의록 정리");
    await expect(first).toContainText("D-8");
    await expect(first.getByRole("link", { name: "회의록 정리 피드백 쓰기" })).toHaveAttribute("href", "/my/participations/p-meeting-notes");
    await expect(page.getByRole("main").locator(".bg-accent")).toHaveCount(1);
    await expect(first.locator(".bg-accent")).toHaveCount(1);
  });

  test("S103 마감이 가까운 2개가 넓은 화면에 함께 보인다", async ({ page }) => {
    await page.goto("/my/participations");
    await expect(todoCards(page).nth(0)).toContainText("회의록 정리");
    await expect(todoCards(page).nth(1)).toContainText("중고책 장터");
    await expect(todoCards(page).nth(1).getByRole("link", { name: "중고책 장터 피드백 쓰기" })).toHaveAttribute("href", "/my/participations/p-used-books");
    for (const card of (await todoCards(page).all()).slice(0, 2)) await expect(card).toBeInViewport({ ratio: 1 });
    const [a, b] = await todoCards(page).evaluateAll((cards) => cards.map((card) => card.getBoundingClientRect().top));
    expect(a).toBe(b);
  });

  test("S91 제출 전 참여가 없으면 패널이 없다", async ({ page, context }) => {
    await setDemo(context, { data: "empty" });
    await page.goto("/my/participations");
    await expect(page.getByText("참여 중인 테스트가 없어요")).toBeVisible();
    await expect(nextTodo(page)).toHaveCount(0);
  });
});

test.describe("R3 다음 할 일 · 2개보다 많을 때", () => {
  test("S104 모두 마감 순으로 띠에 담기고 위쪽 이전·다음 버튼으로만 넘긴다", async ({ page }) => {
    await page.goto("/my/participations");
    await expect(nextTodo(page).getByRole("heading")).toHaveText("다음 할 일 4");
    await expect(todoCards(page)).toHaveCount(4);
    expect(await todoCards(page).locator("p:first-child").allTextContents()).toEqual([
      "회의록 정리D-8",
      "중고책 장터D-12",
      "가계부 노트D-14",
      "모아플랜D-16",
    ]);
    const strip = nextTodo(page).locator("ul");
    expect(await strip.evaluate((element) => getComputedStyle(element).overflowX)).toBe("hidden");

    const prev = nextTodo(page).getByRole("button", { name: "이전 할 일" });
    const next = nextTodo(page).getByRole("button", { name: "다음 할 일" });
    await expect(prev).toBeDisabled();
    await expect(todoCards(page).nth(2)).not.toBeInViewport();

    await next.click();
    await expect(todoCards(page).nth(2)).toBeInViewport({ ratio: 1 });
    await expect(todoCards(page).nth(3)).toBeInViewport({ ratio: 1 });
    await expect(todoCards(page).nth(1)).not.toBeInViewport();
    await expect(next).toBeDisabled();

    await prev.click();
    await expect(todoCards(page).nth(0)).toBeInViewport({ ratio: 1 });
    await expect(prev).toBeDisabled();
  });
});

test.describe("R4 참여 목록", () => {
  test("S92 참여 중은 할 일 순서다", async ({ page }) => {
    await page.goto("/my/participations");
    expect(await rowNames(page)).toEqual(["회의록 정리", "중고책 장터", "가계부 노트", "모아플랜", "스터디 매칭", "동네 러닝 크루"]);
  });

  test("S93 행에 썸네일, 요청 문구, 상태, 날짜, 보상이 있다", async ({ page }) => {
    await page.goto("/my/participations");
    const first = rows(page).first();
    await expect(first.locator("h3")).toHaveText("회의록 정리");
    await expect(first).toContainText("회의록 작성 후 할 일 목록이 맞는지 보기");
    await expect(first).toContainText("피드백 제출 전");
    await expect(first).toContainText("제출 마감");
    await expect(first).toContainText("910 크레딧");
    await expect(first).not.toContainText("추가 보상");
    await expect(rows(page).filter({ hasText: "모아플랜" })).toContainText("추가 보상");
  });

  test("S94 지급 대기는 지급 예정 일시와 안내가 있다", async ({ page }) => {
    await page.goto("/my/participations");
    const row = rows(page).filter({ hasText: "스터디 매칭" });
    await expect(row).toContainText("지급 대기");
    await expect(row).toContainText(/지급 예정\d+월 \d+일 (오전|오후) \d+시/);
    await expect(row).toContainText("72시간 동안 신고가 없으면 자동으로 지급돼요");
  });

  test("S95 지원한 테스트는 선정 대기가 먼저다", async ({ page }) => {
    await page.goto("/my/participations?tab=applied");
    expect(await rowNames(page)).toEqual(["북로그", "레시피핏"]);
    await expect(rows(page).first()).toContainText("선정 대기");
    await expect(rows(page).nth(1)).toContainText("미선정");
    await expect(rows(page).first().getByRole("link", { name: "북로그 모집 글 보기" })).toHaveAttribute("href", "/recruitments/booklog");
    await expect(rows(page).nth(1).getByRole("link", { name: "레시피핏 모집 글 보기" })).toHaveAttribute("href", "/recruitments/recipefit");
  });

  test("S96 참여했던 테스트는 최근 순이고 받은 크레딧 합계와 도장이 있다", async ({ page }) => {
    await page.goto("/my/participations?tab=history");
    expect(await rowNames(page)).toEqual(["메모 정원", "카페 지도", "주차 알리미"]);
    await expect(page.getByText("받은 크레딧 합계")).toContainText("2,250 크레딧");
    await expect(rows(page).filter({ hasText: "지급 완료" })).toHaveCount(2);
    for (const row of await rows(page).filter({ hasText: "지급 완료" }).all()) {
      await expect(row.getByRole("img", { name: "지급 완료" })).toBeVisible();
    }
  });
});

test.describe("R5 빈 상태", () => {
  test("S97 탭마다 다른 빈 상태와 둘러보기 버튼", async ({ page, context }) => {
    await setDemo(context, { data: "empty" });
    const cases = [
      ["applied", "지원한 테스트가 없어요"],
      ["ongoing", "참여 중인 테스트가 없어요"],
      ["history", "아직 끝난 테스트가 없어요"],
    ];
    for (const [value, title] of cases) {
      await page.goto(`/my/participations?tab=${value}`);
      await expect(page.getByText(title)).toBeVisible();
      await expect(page.getByRole("main").getByRole("link", { name: "테스트 둘러보기" })).toHaveAttribute("href", "/recruitments");
    }
    for (const name of ["지원한 테스트", "참여 중인 테스트", "참여했던 테스트"]) {
      await expect(tab(page, name)).toHaveText(`${name}0`);
    }
  });
});

test.describe("R6 로딩", () => {
  test("S98 제목과 탭은 바로 보이고 목록은 스켈레톤이다", async ({ page, context }) => {
    await setDemo(context, { data: "slow" });
    await page.goto("/my/participations", { waitUntil: "commit" });
    await expect(page.getByRole("heading", { level: 1, name: "참여 테스트" })).toBeVisible();
    await expect(tabs(page).getByRole("link")).toHaveCount(3);
    await expect(page.locator('[data-skeleton="row"]').first()).toBeVisible();
    await expect(rows(page)).toHaveCount(6, { timeout: 10_000 });
    await expect(page.locator("[data-skeleton]")).toHaveCount(0);
  });
});

test.describe("R7 반응형", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("S99 좁은 화면에서 가로 스크롤 없이 쌓인다", async ({ page }) => {
    await page.goto("/my/participations");
    await expect(rows(page)).toHaveCount(6);
    await expectNoHorizontalOverflow(page);
    const tops = await tabs(page)
      .getByRole("link")
      .evaluateAll((links) => links.map((link) => Math.round(link.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBe(1);
    const card = todoCards(page).first();
    expect(await card.evaluate((element) => element.getBoundingClientRect().left)).toBe(16);
    await expect(todoCards(page).nth(1)).not.toBeInViewport();
    await nextTodo(page).getByRole("button", { name: "다음 할 일" }).click();
    await expect(todoCards(page).nth(1)).toBeInViewport({ ratio: 1 });
    await nextTodo(page).getByRole("button", { name: "이전 할 일" }).click();
    await expect(card).toBeInViewport({ ratio: 1 });
    const button = await card.getByRole("link", { name: "피드백 쓰기" }).boundingBox();
    const box = await card.boundingBox();
    expect(button && box && box.width - button.width).toBeLessThanOrEqual(48);
  });
});

test.describe("R8 링크와 404", () => {
  test("S100 화면의 내부 링크는 모두 열린다", async ({ page, request }) => {
    for (const value of ["applied", "ongoing", "history"]) {
      await page.goto(`/my/participations?tab=${value}`);
      await expect(rows(page).first()).toBeVisible();
      const hrefs = await page
        .getByRole("main")
        .locator('a[href^="/"]')
        .evaluateAll((links) => [...new Set(links.map((link) => link.getAttribute("href") ?? ""))]);
      for (const href of hrefs) {
        const response = await request.get(href);
        expect(response.status(), href).toBe(200);
      }
    }
  });
});

test.describe("R9 접근성", () => {
  test("S101 탭은 링크 묶음이고 상태는 글자로, 동작 이름에 서비스 이름이 있다", async ({ page }) => {
    await page.goto("/my/participations");
    await expect(page.getByRole("tab")).toHaveCount(0);
    await expect(rows(page).first()).toContainText("D-8");
    await expect(rows(page).first().getByRole("link", { name: "회의록 정리 피드백 쓰기" })).toBeVisible();

    const target = tab(page, "지원한 테스트");
    for (let i = 0; i < 30 && !(await target.evaluate((element) => element === document.activeElement)); i++) {
      await page.keyboard.press("Tab");
    }
    await expect(target).toBeFocused();
    expect(await target.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe("none");
  });
});

test.describe("R3 다음 할 일 · 화면 폭과 모션", () => {
  test("S191 좁은 화면에서 넘긴 뒤 넓히면 보던 카드가 왼쪽 끝에 맞는다", async ({ page }) => {
    await page.setViewportSize({ width: 500, height: 900 });
    await page.goto("/my/participations");
    await nextTodo(page).getByRole("button", { name: "다음 할 일" }).click();
    await expect(todoCards(page).nth(1)).toBeInViewport({ ratio: 1 });

    await page.setViewportSize({ width: 900, height: 900 });
    await expect(todoCards(page).nth(1)).toBeInViewport({ ratio: 1 });
    await expect(todoCards(page).nth(2)).toBeInViewport({ ratio: 1 });
    await expect(todoCards(page).nth(0)).not.toBeInViewport();
    const stripLeft = async () => (await nextTodo(page).locator("ul").boundingBox())?.x;
    const cardLeft = async () => (await todoCards(page).nth(1).boundingBox())?.x;
    expect(await cardLeft()).toBe(await stripLeft());

    await page.setViewportSize({ width: 500, height: 900 });
    await expect.poll(async () => (await cardLeft()) === (await stripLeft())).toBe(true);
    await expect(todoCards(page).nth(1)).toBeInViewport({ ratio: 1 });
  });

  test("S192 모션 줄이기 설정이면 애니메이션 없이 바로 넘긴다", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/my/participations");
    const strip = nextTodo(page).locator("ul");
    await nextTodo(page).getByRole("button", { name: "다음 할 일" }).click();
    const [left, expected] = await strip.evaluate((element) => {
      const gap = parseFloat(getComputedStyle(element).columnGap);
      return [element.scrollLeft, element.clientWidth + gap];
    });
    expect(left).toBe(expected);
  });
});
