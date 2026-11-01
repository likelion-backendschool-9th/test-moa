import { expect, type Locator, type Page, test } from "@playwright/test";
import { setDemo } from "./helpers";

const chatList = (page: Page) => page.getByRole("list", { name: "채팅 목록" });
const cards = (page: Page) => chatList(page).getByRole("listitem");
const cardLinks = (page: Page) => chatList(page).getByRole("link");
const searchBox = (page: Page) => page.getByRole("searchbox", { name: "채팅방 검색" });
const sortGroup = (page: Page) => page.getByRole("group", { name: "정렬" });
const sortButton = (page: Page, name: string) => sortGroup(page).getByRole("button", { name });
const roleTabGroup = (page: Page) => page.getByRole("group", { name: "역할별 보기" });
const roleTabs = (page: Page) => roleTabGroup(page).getByRole("button");
const roleTab = (page: Page, label: "전체" | "테스터" | "개발자") => roleTabs(page).filter({ hasText: label });

/** 카드의 대화 상대 닉네임과 역할 배지. 내 닉네임은 카드에 없다 */
const partner = (card: Locator) => card.locator("[data-partner]");
const partnerRole = (card: Locator) => card.locator("[data-partner-role]");
const preview = (card: Locator) => card.locator("[data-preview]");

/** 카드 링크 이름은 "프로젝트명 채팅방"이다 */
const roomNames = (projects: string[]) => projects.map((project) => `${project} 채팅방`);

const ACCENT_LIGHT = "rgb(15, 124, 74)";
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

  test("S116 카드에 프로젝트명, 상대 닉네임과 역할 배지, 미리보기, 일시, 더보기가 있고 내 닉네임은 없다", async ({ page }) => {
    await page.goto("/my/chats");
    const card = cards(page).first();
    await expect(card.getByRole("heading", { level: 2 })).toHaveText("북로그 채팅방");
    await expect(partner(card)).toHaveText("서재지기");
    await expect(partnerRole(card)).toHaveText("개발자");
    expect((await partnerRole(card).boundingBox())!.x).toBeLessThan((await partner(card).boundingBox())!.x);
    await expect(card).not.toContainText("윤슬");

    /* 글자는 모두 최근 메시지와 같은 크기이고, 대화방 이름만 역할 탭처럼 굵다. 이름·닉네임은 먹, 메시지는 흐린 먹 */
    const style = (locator: Locator) =>
      locator.evaluate((element) => {
        const { fontSize, fontWeight, color } = getComputedStyle(element);
        return { fontSize, fontWeight, color };
      });
    const [title, nickname, message] = await Promise.all([
      style(card.getByRole("heading", { level: 2 })),
      style(partner(card)),
      style(preview(card)),
    ]);
    expect(title.fontSize).toBe(message.fontSize);
    expect(nickname.fontSize).toBe(message.fontSize);
    expect([title.fontWeight, nickname.fontWeight, message.fontWeight]).toEqual(["700", "400", "400"]);
    const tab = await style(roleTab(page, "전체"));
    expect([title.fontSize, title.fontWeight]).toEqual([tab.fontSize, tab.fontWeight]);
    expect(nickname.color).toBe(title.color);
    expect(title.color).not.toBe(message.color);
    await expect(preview(card)).toHaveText("피드백 마감이 이틀 남았어요. 막히는 부분 있으면 편하게 물어봐 주세요.");
    await expect(card.locator("time")).toHaveAttribute("datetime", /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
    await expect(card.getByRole("button", { name: "북로그 채팅 더보기" })).toBeVisible();
  });

  test("S117 프로젝트 이미지는 카드 왼쪽에 붙어 높이를 다 채우고, 선이나 그라데이션 없이 바로 정보로 이어진다", async ({ page }) => {
    await page.goto("/my/chats");
    const card = cards(page).first().locator("article");
    const thumb = card.locator("[data-thumb]");
    const image = thumb.locator("img");
    await expect(image).toHaveAttribute("src", "/sample/projects/booklog.svg");
    await expect(image).toHaveAttribute("alt", "");
    expect(await image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
    await expect(thumb).toHaveCSS("border-right-width", "0px");
    expect(await thumb.evaluate((element) => [...element.querySelectorAll("*")].some((child) => getComputedStyle(child).backgroundImage.includes("gradient")))).toBe(false);
    const cardBox = (await card.boundingBox())!;
    const thumbBox = (await thumb.boundingBox())!;
    expect(Math.abs(thumbBox.x - cardBox.x)).toBeLessThan(1);
    expect(Math.abs(thumbBox.height - cardBox.height)).toBeLessThan(1);
    const headingBox = (await card.getByRole("heading", { level: 2 }).boundingBox())!;
    expect(headingBox.x).toBeGreaterThan(thumbBox.x + thumbBox.width);
  });

  test("S118 미리보기는 한 줄로 줄인다", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/my/chats");
    expect(await preview(cards(page).first()).evaluate((element) => getComputedStyle(element).webkitLineClamp)).toBe("1");
  });

  test("S119 카드 어디를 눌러도 채팅방으로 간다", async ({ page }) => {
    await page.goto("/my/chats");
    const box = await preview(cards(page).first()).boundingBox();
    await page.mouse.click(box!.x + 8, box!.y + box!.height / 2);
    await expect(page).toHaveURL("/my/chats/booklog-yunseul");
    await expect(page.getByRole("heading", { level: 1, name: "북로그" })).toBeVisible();
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

  test("S121 개발자는 내 프로젝트와 참여한 프로젝트의 방이 함께 보이고, 같은 방은 테스터와 같다", async ({ page, context }) => {
    await setDemo(context, { role: "developer" });
    await page.goto("/my/chats");
    await expect(cardLinks(page)).toHaveText(roomNames(["가계부 노트", "가계부 노트", "북로그", "회의록 정리"]));
    for (const [index, nickname, role] of [
      [0, "새벽코더", "테스터"],
      [1, "윤슬", "테스터"],
      [2, "서재지기", "개발자"],
    ] as const) {
      await expect(partner(cards(page).nth(index))).toHaveText(nickname);
      await expect(partnerRole(cards(page).nth(index))).toHaveText(role);
    }
    await expect(chatList(page)).not.toContainText("도현랩");
    await expect(cardLinks(page).nth(1)).toHaveAttribute("href", "/my/chats/ledger-yunseul");
    const developerPreview = await preview(cards(page).nth(1)).textContent();

    await setDemo(context, { role: "tester" });
    await page.goto("/my/chats");
    const testerCard = cards(page).filter({ has: page.locator('a[href="/my/chats/ledger-yunseul"]') });
    await expect(preview(testerCard)).toHaveText(developerPreview!);
    await expect(partner(testerCard)).toHaveText("도현랩");
    await expect(partnerRole(testerCard)).toHaveText("개발자");
  });

  test("S136 오늘 온 대화의 일시만 강조색과 점으로 표시한다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/my/chats");
    const times = chatList(page).locator("time");
    await expect(times.nth(0)).toHaveAttribute("data-today", "true");
    await expect(times.nth(0)).toHaveCSS("color", ACCENT_LIGHT);
    await expect(times.nth(1)).not.toHaveAttribute("data-today");
    await expect(times.nth(1)).not.toHaveCSS("color", ACCENT_LIGHT);
  });
});

test.describe("R4 검색·정렬·역할 탭", () => {
  test("S122 채팅방을 상대 닉네임으로 검색하면 탭의 수도 바뀐다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/my/chats");
    await searchBox(page).fill("도현랩");
    await expect(page).toHaveURL(/[?&]q=%EB%8F%84%ED%98%84%EB%9E%A9/);
    await expect(cardLinks(page)).toHaveText(roomNames(["가계부 노트", "회의록 정리"]));
    await expect(page.getByText("채팅방 2개")).toHaveAttribute("aria-live", "polite");
    await expect(roleTabs(page)).toHaveText(["전체 2", "테스터 2", "개발자 0"]);
  });

  test("S123 역할 탭으로 내 프로젝트의 채팅(개발자)과 참여한 채팅(테스터)을 나눠 본다", async ({ page, context }) => {
    await setDemo(context, { role: "developer" });
    await page.goto("/my/chats");
    await expect(roleTabs(page)).toHaveText(["전체 4", "테스터 1", "개발자 3"]);
    await expect(roleTab(page, "전체")).toHaveAttribute("aria-pressed", "true");

    await roleTab(page, "개발자").click();
    await expect(page).toHaveURL(/[?&]role=developer/);
    await expect(cardLinks(page)).toHaveText(roomNames(["가계부 노트", "가계부 노트", "회의록 정리"]));
    await expect(roleTab(page, "개발자")).toHaveAttribute("aria-pressed", "true");
    await expect(roleTab(page, "개발자").locator("span")).toHaveCSS("color", ACCENT_LIGHT);

    await roleTab(page, "테스터").click();
    await expect(page).toHaveURL(/[?&]role=tester/);
    await expect(cardLinks(page)).toHaveText(roomNames(["북로그"]));
    await expect(partner(cards(page).first())).toHaveText("서재지기");
    await expect(partnerRole(cards(page).first())).toHaveText("개발자");

    await roleTab(page, "전체").click();
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
    await page.goto("/my/chats?role=developer&sort=oldest");
    await expect(roleTab(page, "개발자")).toHaveAttribute("aria-pressed", "true");
    await expect(sortButton(page, "오래된순")).toHaveAttribute("aria-pressed", "true");
    await expect(cardLinks(page).first()).toHaveText("회의록 정리 채팅방");
  });

  test("S137 역할 탭에 채팅방이 없으면 안내하고 전체로 돌아간다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/my/chats");
    await roleTab(page, "개발자").click();
    await expect(page.getByText("개발자로 나눈 채팅이 없어요")).toBeVisible();
    await expect(page.getByText("내 프로젝트에서 선정한 테스터와 나눈 채팅이 여기에 모여요.")).toBeVisible();
    await page.getByRole("link", { name: "전체 보기" }).click();
    await expect(page).toHaveURL("/my/chats");
    await expect(cards(page)).toHaveCount(5);
  });

  for (const width of [1440, 375]) {
    test(`S138 너비 ${width}px에서 역할 탭은 왼쪽, 정렬은 같은 줄 오른쪽이다`, async ({ page, context }) => {
      await setDemo(context, { role: "tester" });
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/my/chats");
      const sort = (await sortGroup(page).boundingBox())!;
      const tabs = (await roleTabGroup(page).boundingBox())!;
      const search = (await searchBox(page).boundingBox())!;
      expect(tabs.x + tabs.width).toBeLessThan(sort.x);
      expect(Math.abs(sort.y + sort.height / 2 - (tabs.y + tabs.height / 2))).toBeLessThan(8);
      expect(search.y).toBeLessThan(tabs.y);
    });
  }
});

test.describe("R5 더보기", () => {
  test.beforeEach(async ({ context }) => {
    await setDemo(context, { role: "tester" });
  });

  test("S127 더보기를 누르면 이름 변경과 맨 아래 삭제 메뉴가 열리고 첫 항목에 포커스가 간다", async ({ page }) => {
    await page.goto("/my/chats");
    const button = page.getByRole("button", { name: "북로그 채팅 더보기" });
    await button.click();
    await expect(button).toHaveAttribute("aria-expanded", "true");
    const menu = page.getByRole("menu", { name: "북로그 채팅 메뉴" });
    await expect(menu.getByRole("menuitem")).toHaveText(["대화방 이름 변경", "대화방 삭제"]);
    await expect(menu.getByRole("separator")).toHaveCount(1);
    await expect(menu.getByRole("menuitem", { name: "대화방 이름 변경" })).toBeFocused();
  });

  test("S128 화살표로 옮기고 Esc와 바깥 클릭으로 닫는다", async ({ page }) => {
    await page.goto("/my/chats");
    const button = page.getByRole("button", { name: "북로그 채팅 더보기" });
    const menu = page.getByRole("menu", { name: "북로그 채팅 메뉴" });
    await button.click();
    await expect(menu.getByRole("menuitem", { name: "대화방 이름 변경" })).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(menu.getByRole("menuitem", { name: "대화방 삭제" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    await expect(button).toBeFocused();
    await button.click();
    await expect(menu).toBeVisible();
    await page.getByRole("heading", { level: 1, name: "채팅함" }).click();
    await expect(menu).toHaveCount(0);
  });

  test("S139 대화방 이름을 바꾸면 카드·검색에 반영되고 새로고침해도 남는다", async ({ page }) => {
    await page.goto("/my/chats");
    await page.getByRole("button", { name: "북로그 채팅 더보기" }).click();
    await page.getByRole("menuitem", { name: "대화방 이름 변경" }).click();
    const dialog = page.getByRole("dialog", { name: "대화방 이름 변경" });
    const input = dialog.getByRole("textbox", { name: "대화방 이름" });
    await expect(input).toBeFocused();
    await expect(input).toHaveValue("북로그");

    await dialog.getByRole("button", { name: "취소" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("button", { name: "북로그 채팅 더보기" })).toBeFocused();

    await page.getByRole("button", { name: "북로그 채팅 더보기" }).click();
    await page.getByRole("menuitem", { name: "대화방 이름 변경" }).click();
    await input.fill("북로그 피드백 문의");
    await dialog.getByRole("button", { name: "저장" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(cardLinks(page).first()).toHaveText("북로그 피드백 문의 채팅방");
    await expect(page.getByRole("button", { name: "북로그 피드백 문의 채팅 더보기" })).toBeVisible();

    await page.reload();
    await expect(cardLinks(page).first()).toHaveText("북로그 피드백 문의 채팅방");
    await searchBox(page).fill("피드백 문의");
    await expect(cardLinks(page)).toHaveText(roomNames(["북로그 피드백 문의"]));
  });

  test("S140 대화방을 삭제하면 확인 뒤 목록·탭 수에서 빠지고 새로고침해도 남는다", async ({ page }) => {
    await page.goto("/my/chats");
    await page.getByRole("button", { name: "모아플랜 채팅 더보기" }).click();
    await page.getByRole("menuitem", { name: "대화방 삭제" }).click();
    const dialog = page.getByRole("dialog", { name: "대화방을 삭제할까요?" });
    await expect(dialog).toContainText('"모아플랜" 대화방이 채팅함 목록에서 사라져요.');
    await expect(dialog.getByRole("button", { name: "취소" })).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(cards(page)).toHaveCount(5);

    await page.getByRole("button", { name: "모아플랜 채팅 더보기" }).click();
    await page.getByRole("menuitem", { name: "대화방 삭제" }).click();
    await dialog.getByRole("button", { name: "삭제", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(cards(page)).toHaveCount(4);
    await expect(chatList(page)).not.toContainText("모아플랜");
    await expect(page.getByText("채팅방 4개")).toBeVisible();
    await expect(roleTabs(page)).toHaveText(["전체 4", "테스터 4", "개발자 0"]);

    await page.reload();
    await expect(cards(page)).toHaveCount(4);
    await expect(chatList(page)).not.toContainText("모아플랜");
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
    await expect(roleTabGroup(page)).toHaveCount(0);
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
  test("S132 좁은 화면에서도 가로 스크롤 없이 카드 요소와 역할 탭이 보인다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/my/chats");
    await expect(cards(page)).toHaveCount(5);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
    const card = cards(page).first();
    for (const element of [
      card.locator("[data-thumb]"),
      card.getByRole("link"),
      card.locator("time"),
      card.getByRole("button"),
      partnerRole(card),
      roleTabGroup(page),
    ]) {
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
