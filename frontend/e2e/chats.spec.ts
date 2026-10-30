import { expect, type Locator, type Page, test } from "@playwright/test";
import { setDemo } from "./helpers";

const chatList = (page: Page) => page.getByRole("list", { name: "채팅 목록" });
const cards = (page: Page) => chatList(page).getByRole("listitem");
const cardLinks = (page: Page) => chatList(page).getByRole("link");
const searchBox = (page: Page) => page.getByRole("searchbox", { name: "채팅방 검색" });
const projectChips = (page: Page) => page.getByRole("group", { name: "프로젝트" }).getByRole("button");
const sortButton = (page: Page, name: string) => page.getByRole("group", { name: "정렬" }).getByRole("button", { name });

/** 카드의 요청자·응답자 닉네임 (dt 이름 바로 뒤의 dd) */
const participant = (card: Locator, label: "요청자" | "응답자") => card.locator("dt", { hasText: label }).locator("xpath=following-sibling::dd");

/** 카드 링크 이름은 "프로젝트명 채팅방"이다 */
const roomNames = (projects: string[]) => projects.map((project) => `${project} 채팅방`);

const TIME_TODAY = /^(오전|오후) \d{1,2}:\d{2}$/;
/* 연초 며칠은 작년 날짜가 되므로 두 형식을 모두 받는다 */
const DATE = /^(\d{1,2}월 \d{1,2}일|\d{4}\. \d{1,2}\. \d{1,2}\.)$/;

test.describe("R1 접근 제어", () => {
  test("S114 비로그인은 로그인으로 보낸다", async ({ page, context }) => {
    await setDemo(context, { role: "guest" });
    await page.goto("/my/chats");
    await expect(page).toHaveURL("/login?next=%2Fmy%2Fchats");
  });

  test("S115 로그인하면 채팅함이 열리고 현재 탭이며 마이페이지 메뉴는 없다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    const response = await page.goto("/my/chats");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: "채팅함" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "주요 메뉴" }).getByRole("link", { name: "채팅" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.getByRole("navigation", { name: "마이페이지 메뉴" })).toHaveCount(0);
  });
});

test.describe("R2 채팅 카드", () => {
  test.beforeEach(async ({ context }) => {
    await setDemo(context, { role: "tester" });
  });

  test("S116 카드에 프로젝트명, 요청자, 응답자, 미리보기, 일시, 더보기가 있다", async ({ page }) => {
    await page.goto("/my/chats");
    const card = cards(page).first();
    await expect(card.getByRole("heading", { level: 2 })).toHaveText("북로그 채팅방");
    await expect(participant(card, "요청자")).toHaveText("서재지기");
    await expect(participant(card, "응답자")).toHaveText("윤슬");
    await expect(card.getByText("피드백 마감이 이틀 남았어요. 막히는 부분 있으면 편하게 물어봐 주세요.")).toBeVisible();
    await expect(card.locator("time")).toHaveAttribute("datetime", /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
    await expect(card.getByRole("button", { name: "북로그 채팅 더보기" })).toBeVisible();
  });

  test("S117 프로젝트 사진 자리는 이미지 파일이 아니라 활자 썸네일이다", async ({ page }) => {
    await page.goto("/my/chats");
    await expect(chatList(page).locator("img")).toHaveCount(0);
    await expect(cards(page).first().locator("[data-thumb]")).toHaveText("북");
  });

  test("S118 미리보기는 한 줄로 줄인다", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/my/chats");
    const preview = cards(page).first().locator("p");
    expect(await preview.evaluate((element) => getComputedStyle(element).webkitLineClamp)).toBe("1");
  });

  test("S119 카드 어디를 눌러도 채팅방으로 간다", async ({ page }) => {
    await page.goto("/my/chats");
    const box = await cards(page).first().getByText("피드백 마감이").boundingBox();
    await page.mouse.click(box!.x + 8, box!.y + box!.height / 2);
    await expect(page).toHaveURL("/my/chats/booklog-yunseul");
    await expect(page.getByRole("heading", { level: 1, name: /준비 중/ })).toBeVisible();
  });
});

test.describe("R3 순서와 일시", () => {
  test("S120 테스터는 최근 메시지 순서이고 일시는 시각, 어제, 날짜로 쓴다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/my/chats");
    await expect(cardLinks(page)).toHaveText(roomNames(["북로그", "모아플랜", "레시피핏", "가계부 노트", "회의록 정리"]));
    const times = chatList(page).locator("time");
    await expect(times.nth(0)).toHaveText(TIME_TODAY);
    await expect(times.nth(1)).toHaveText("어제");
    await expect(times.nth(2)).toHaveText(DATE);
  });

  test("S121 개발자는 요청자와 응답자로 들어간 방이 함께 보이고, 같은 방은 테스터와 같다", async ({ page, context }) => {
    await setDemo(context, { role: "developer" });
    await page.goto("/my/chats");
    await expect(cardLinks(page)).toHaveText(roomNames(["가계부 노트", "가계부 노트", "북로그", "회의록 정리"]));
    await expect(participant(cards(page).nth(0), "응답자")).toHaveText("새벽코더");
    await expect(participant(cards(page).nth(1), "응답자")).toHaveText("윤슬");
    await expect(participant(cards(page).nth(2), "요청자")).toHaveText("서재지기");
    await expect(participant(cards(page).nth(2), "응답자")).toHaveText("도현랩");
    await expect(cardLinks(page).nth(1)).toHaveAttribute("href", "/my/chats/ledger-yunseul");
    const preview = await cards(page).nth(1).locator("p").textContent();

    await setDemo(context, { role: "tester" });
    await page.goto("/my/chats");
    const testerCard = cards(page).filter({ has: page.locator('a[href="/my/chats/ledger-yunseul"]') });
    await expect(testerCard.locator("p")).toHaveText(preview!);
  });
});

test.describe("R4 검색·프로젝트·정렬", () => {
  test("S122 채팅방을 닉네임으로 검색한다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/my/chats");
    await searchBox(page).fill("도현랩");
    await expect(page).toHaveURL(/[?&]q=%EB%8F%84%ED%98%84%EB%9E%A9/);
    await expect(cardLinks(page)).toHaveText(roomNames(["가계부 노트", "회의록 정리"]));
    await expect(page.getByText("채팅방 2개")).toHaveAttribute("aria-live", "polite");
  });

  test("S123 프로젝트 칩으로 한 프로젝트의 채팅방만 본다", async ({ page, context }) => {
    await setDemo(context, { role: "developer" });
    await page.goto("/my/chats");
    await expect(projectChips(page)).toHaveText(["전체 4", "가계부 노트 2", "북로그 1", "회의록 정리 1"]);
    await projectChips(page).filter({ hasText: "가계부 노트" }).click();
    await expect(page).toHaveURL(/[?&]project=ledger-note/);
    await expect(cards(page)).toHaveCount(2);
    await expect(projectChips(page).filter({ hasText: "가계부 노트" })).toHaveAttribute("aria-pressed", "true");
    await projectChips(page).filter({ hasText: "전체" }).click();
    await expect(page).toHaveURL("/my/chats");
    await expect(cards(page)).toHaveCount(4);
  });

  test("S124 오래된순으로 정렬한다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/my/chats");
    await sortButton(page, "오래된순").click();
    await expect(page).toHaveURL(/[?&]sort=oldest/);
    await expect(cardLinks(page).first()).toHaveText("회의록 정리 채팅방");
    await expect(cardLinks(page).last()).toHaveText("북로그 채팅방");
  });

  test("S125 결과가 없으면 조건 초기화로 돌아간다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/my/chats");
    await searchBox(page).fill("없는채팅방");
    await expect(page.getByText("조건에 맞는 채팅방이 없어요")).toBeVisible();
    await page.getByRole("link", { name: "조건 초기화" }).click();
    await expect(page).toHaveURL("/my/chats");
    await expect(cards(page)).toHaveCount(5);
    await expect(searchBox(page)).toHaveValue("");
  });

  test("S126 URL로 연 조건이 그대로 보인다", async ({ page, context }) => {
    await setDemo(context, { role: "developer" });
    await page.goto("/my/chats?project=ledger-note&sort=oldest");
    await expect(projectChips(page).filter({ hasText: "가계부 노트" })).toHaveAttribute("aria-pressed", "true");
    await expect(sortButton(page, "오래된순")).toHaveAttribute("aria-pressed", "true");
    await expect(participant(cards(page).first(), "응답자")).toHaveText("윤슬");
  });
});

test.describe("R5 더보기", () => {
  test.beforeEach(async ({ context }) => {
    await setDemo(context, { role: "tester" });
  });

  test("S127 더보기를 누르면 메뉴가 열리고 첫 항목에 포커스가 간다", async ({ page }) => {
    await page.goto("/my/chats");
    const button = page.getByRole("button", { name: "북로그 채팅 더보기" });
    await button.click();
    await expect(button).toHaveAttribute("aria-expanded", "true");
    const menu = page.getByRole("menu", { name: "북로그 채팅 메뉴" });
    await expect(menu.getByRole("menuitem", { name: "채팅방 열기" })).toHaveAttribute("href", "/my/chats/booklog-yunseul");
    await expect(menu.getByRole("menuitem", { name: "모집 글 보기" })).toHaveAttribute("href", "/recruitments/booklog");
    await expect(menu.getByRole("menuitem", { name: "채팅방 열기" })).toBeFocused();
  });

  test("S128 화살표로 옮기고 Esc와 바깥 클릭으로 닫는다", async ({ page }) => {
    await page.goto("/my/chats");
    const button = page.getByRole("button", { name: "북로그 채팅 더보기" });
    const menu = page.getByRole("menu", { name: "북로그 채팅 메뉴" });
    await button.click();
    await expect(menu.getByRole("menuitem", { name: "채팅방 열기" })).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(menu.getByRole("menuitem", { name: "모집 글 보기" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    await expect(button).toBeFocused();
    await button.click();
    await expect(menu).toBeVisible();
    await page.getByRole("heading", { level: 1, name: "채팅함" }).click();
    await expect(menu).toHaveCount(0);
  });
});

test.describe("R6 빈 상태", () => {
  test("S129 운영자는 채팅방이 없고 검색 영역도 없다", async ({ page, context }) => {
    await setDemo(context, { role: "admin" });
    await page.goto("/my/chats");
    await expect(page.getByText("아직 채팅이 없어요")).toBeVisible();
    await expect(page.getByText("채팅은 구독 모집 건의 개발자와 선정된 테스터가 1대1로 나눠요.")).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "테스트 둘러보기" })).toHaveAttribute("href", "/recruitments");
    await expect(searchBox(page)).toHaveCount(0);
  });

  test("S130 데이터가 없으면 같은 빈 상태다", async ({ page, context }) => {
    await setDemo(context, { role: "tester", data: "empty" });
    await page.goto("/my/chats");
    await expect(page.getByText("아직 채팅이 없어요")).toBeVisible();
    await expect(chatList(page)).toHaveCount(0);
  });
});

test.describe("R7 로딩", () => {
  test("S131 제목은 바로, 목록은 스켈레톤 먼저", async ({ page, context }) => {
    await setDemo(context, { role: "tester", data: "slow" });
    await page.goto("/my/chats", { waitUntil: "commit" });
    await expect(page.getByRole("heading", { level: 1, name: "채팅함" })).toBeVisible();
    const skeleton = page.getByLabel("채팅함 불러오는 중");
    await expect(skeleton).toBeVisible();
    await expect(cards(page)).toHaveCount(5);
    await expect(skeleton).toHaveCount(0);
  });
});

test.describe("R8 모바일", () => {
  test("S132 좁은 화면에서도 가로 스크롤 없이 카드 요소가 보인다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/my/chats");
    await expect(cards(page)).toHaveCount(5);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
    const card = cards(page).first();
    for (const element of [card.locator("[data-thumb]"), card.getByRole("link"), card.locator("time"), card.getByRole("button")]) {
      const box = await element.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(375);
    }
  });
});

test.describe("R9 접근성", () => {
  test("S133 목록 구조와 카드 이름, 카드 링크 다음은 더보기 버튼이다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/my/chats");
    await expect(cards(page)).toHaveCount(5);
    const link = cardLinks(page).first();
    await expect(link).toHaveAccessibleName("북로그 채팅방");
    await link.focus();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "북로그 채팅 더보기" })).toBeFocused();
  });
});
