import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { setDemo } from "./helpers";

const tabs = (page: Page) => page.getByRole("navigation", { name: "참여 상태" });
const tab = (page: Page, name: string) => tabs(page).getByRole("link", { name });
const rows = (page: Page) => page.getByTestId("participation-row");
const rowNames = (page: Page) => rows(page).locator("h3").allTextContents();
const deadlineList = (page: Page) => page.getByRole("region", { name: /^마감 임박 테스트/ });
const deadlineItems = (page: Page) => page.getByTestId("deadline-item");
const calendar = (page: Page) => page.getByRole("region", { name: "마감 캘린더" });

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

test.describe("R3 마감 캘린더와 마감 임박 테스트", () => {
  const seoulMonthTitle = (offset = 0) => {
    const [year, month] = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", timeZone: "Asia/Seoul" })
      .format(new Date())
      .split("-")
      .map(Number);
    const total = year * 12 + month - 1 + offset;
    return `${Math.floor(total / 12)}년 ${(total % 12) + 1}월`;
  };

  test("S90 마감이 가장 가까운 제출 전 참여와 주 버튼", async ({ page }) => {
    await page.goto("/my/participations");
    const first = deadlineItems(page).first();
    await expect(first).toContainText("회의록 정리");
    await expect(first).toContainText("D-8");
    await expect(first.getByRole("link", { name: "회의록 정리 피드백 쓰기" })).toHaveAttribute("href", "/my/participations/p-meeting-notes");
    /* 주 버튼은 한 화면에 하나다. 추가 보상 배지도 강조색 면이지만 버튼이 아니다 */
    await expect(page.getByRole("main").locator("a.bg-accent, button.bg-accent")).toHaveCount(1);
    await expect(first.locator(".bg-accent")).toHaveCount(1);
  });

  test("S560 내 제출 전 참여가 마감 순으로 목록에 나온다", async ({ page }) => {
    await page.goto("/my/participations");
    await expect(deadlineList(page).getByRole("heading")).toHaveText("마감 임박 테스트 4");
    expect(await deadlineItems(page).locator("p:first-child").allTextContents()).toEqual([
      "회의록 정리D-8",
      "중고책 장터D-12",
      "가계부 노트D-14",
      "모아플랜D-16",
    ]);
    await expect(deadlineItems(page).nth(1).getByRole("link", { name: "중고책 장터 피드백 쓰기" })).toHaveAttribute("href", "/my/participations/p-used-books");
    await expect(deadlineItems(page).nth(1).getByRole("link")).not.toHaveClass(/bg-accent/);
  });

  test("S561 캘린더는 이번 달에서 시작해 오늘과 내 마감을 표시한다", async ({ page }) => {
    await page.goto("/my/participations");
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

  test("S562 이전·다음 달로 넘기고 해가 바뀌어도 맞으며 탭을 바꿔도 보던 달이 남는다", async ({ page }) => {
    await page.goto("/my/participations");
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
    await expect(page).toHaveURL("/my/participations?tab=applied");
    await expect(rows(page)).toHaveCount(2);
    await expect(box.getByText(seoulMonthTitle(11), { exact: true })).toBeVisible();
  });

  test("S563 넓은 화면은 캘린더와 목록이 나란하고 좁은 화면은 위아래로 쌓인다", async ({ page }) => {
    await page.goto("/my/participations");
    const wide = [await calendar(page).boundingBox(), await deadlineList(page).boundingBox()];
    expect(wide[0]?.y).toBe(wide[1]?.y);
    expect(wide[0] && wide[1] && wide[0].x + wide[0].width).toBeLessThan(wide[1]?.x ?? 0);

    await page.setViewportSize({ width: 375, height: 812 });
    await expect.poll(async () => {
      const [top, bottom] = [await calendar(page).boundingBox(), await deadlineList(page).boundingBox()];
      return Boolean(top && bottom && top.y + top.height <= bottom.y && top.x === bottom.x);
    }).toBe(true);
  });

  test("S91 제출 전 참여가 없으면 패널이 없다", async ({ page, context }) => {
    await setDemo(context, { data: "empty" });
    await page.goto("/my/participations");
    await expect(page.getByText("참여 중인 테스트가 없어요")).toBeVisible();
    await expect(deadlineList(page)).toHaveCount(0);
    await expect(calendar(page)).toHaveCount(0);
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
    await expect(rows(page).filter({ hasText: "모아플랜" }).locator("[data-thumb] .bg-accent")).toHaveText("추가 보상 +320 크레딧");
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
    await expect(page.locator('[data-skeleton="panel"]')).toBeVisible();
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
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBe(0);
    const tops = await tabs(page)
      .getByRole("link")
      .evaluateAll((links) => links.map((link) => Math.round(link.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBe(1);
    const cell = await calendar(page).locator("td").first().boundingBox();
    expect(cell?.width).toBeGreaterThan(30);
    await expect(deadlineItems(page).first().getByRole("link", { name: "회의록 정리 피드백 쓰기" })).toBeVisible();
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

test.describe("R203 보기 방식", () => {
  const viewToggle = (page: Page) => page.getByRole("group", { name: "보기 방식" });
  const viewButton = (page: Page, name: "리스트" | "그리드") => viewToggle(page).getByRole("button", { name });
  const setGridCookie = (context: BrowserContext, value = "grid") =>
    context.addCookies([{ name: "participation-view", value, url: "http://localhost:3100" }]);
  /** 첫 줄에 놓인 카드 수 */
  const columnCount = async (page: Page) => {
    const tops = await rows(page).evaluateAll((cards) => cards.map((card) => Math.round(card.getBoundingClientRect().top)));
    return tops.filter((top) => top === tops[0]).length;
  };

  test("S552 기본은 리스트이고 알 수 없는 쿠키 값도 리스트다", async ({ page, context }) => {
    await page.goto("/my/participations");
    await expect(viewButton(page, "리스트")).toHaveAttribute("aria-pressed", "true");
    await expect(viewButton(page, "그리드")).toHaveAttribute("aria-pressed", "false");
    await expect(viewToggle(page)).toHaveText("");
    await expect(rows(page)).toHaveCount(6);
    expect(await columnCount(page)).toBe(1);

    await setGridCookie(context, "nope");
    await page.reload();
    await expect(viewButton(page, "리스트")).toHaveAttribute("aria-pressed", "true");
  });

  test("S553 그리드를 고르면 주소는 그대로 한 줄에 3개씩 보인다", async ({ page }) => {
    await page.goto("/my/participations");
    await viewButton(page, "그리드").click();
    await expect(viewButton(page, "그리드")).toHaveAttribute("aria-pressed", "true");
    await expect(page).toHaveURL("/my/participations");
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

  test("S554 고른 보기 방식은 탭 이동, 상세 왕복, 새로고침 뒤에도 남는다", async ({ page }) => {
    await page.goto("/my/participations");
    await viewButton(page, "그리드").click();
    await expect(viewButton(page, "그리드")).toHaveAttribute("aria-pressed", "true");

    await tab(page, "참여했던 테스트").click();
    await expect(page).toHaveURL("/my/participations?tab=history");
    await expect(page.getByText("받은 크레딧 합계")).toBeVisible();
    await expect(viewButton(page, "그리드")).toHaveAttribute("aria-pressed", "true");

    await rows(page).first().getByRole("link").click();
    await expect(page).toHaveURL(/\/my\/participations\/[^/?]+$/);
    await page.getByRole("main").getByRole("link", { name: /돌아가기|참여/ }).first().click();
    await expect(page).toHaveURL("/my/participations?tab=history");
    await expect(viewButton(page, "그리드")).toHaveAttribute("aria-pressed", "true");

    await page.reload();
    await expect(viewButton(page, "그리드")).toHaveAttribute("aria-pressed", "true");
    await expect(rows(page)).toHaveCount(3);
    await expect.poll(() => columnCount(page)).toBe(3);
  });

  for (const [width, columns] of [
    [1024, 3],
    [768, 2],
    [375, 1],
  ] as const) {
    test(`S555 너비 ${width}px의 그리드는 ${columns}열이고 가로 스크롤이 없다`, async ({ page, context }) => {
      await setGridCookie(context);
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/my/participations");
      await expect(rows(page)).toHaveCount(6);
      expect(await columnCount(page)).toBe(columns);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBe(0);
    });
  }

  test("S559 보기 방식을 바꿔도 스크롤과 방문 기록은 그대로다", async ({ page }) => {
    await page.goto("/my/participations?tab=ongoing");
    await viewButton(page, "그리드").scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo(0, 400));
    const before = await page.evaluate(() => [window.scrollY, history.length]);
    await viewButton(page, "그리드").click();
    await expect(viewButton(page, "그리드")).toHaveAttribute("aria-pressed", "true");
    await expect(page).toHaveURL("/my/participations?tab=ongoing");
    expect(await page.evaluate(() => [window.scrollY, history.length])).toEqual(before);
  });

  test("S556 목록이 비었으면 보기 방식을 보여 주지 않는다", async ({ page, context }) => {
    await setDemo(context, { role: "developer" });
    await page.goto("/my/participations");
    await expect(page.getByText("아직 참여한 테스트가 없어요")).toBeVisible();
    await expect(viewToggle(page)).toHaveCount(0);
  });

  test("S557 그리드를 고른 상태의 로딩은 카드 스켈레톤이다", async ({ page, context }) => {
    await setGridCookie(context);
    await setDemo(context, { data: "slow" });
    await page.goto("/my/participations", { waitUntil: "commit" });
    await expect(page.locator('[data-skeleton="card"]').first()).toBeVisible();
    await expect(rows(page)).toHaveCount(6, { timeout: 10_000 });
    await expect(page.locator("[data-skeleton]")).toHaveCount(0);
  });

  test("S558 JS 번들을 받기 전에 눌러도 보기 방식이 바뀐다", async ({ page }) => {
    const bundle = "**/_next/static/**/*.js";
    await page.route(bundle, (route) => route.abort());
    await page.goto("/my/participations");
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
