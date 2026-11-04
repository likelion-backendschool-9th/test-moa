import { expect, type Locator, type Page, test } from "@playwright/test";
import { homeLogo, openMoreMenu, setDemo } from "./helpers";

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

test.describe("R115 순서와 일시", () => {
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

test.describe("R116 검색·정렬·역할 탭", () => {
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

  test("S126 URL로 연 조건이 그대로 보인다", async ({ page, context }) => {
    await setDemo(context, { role: "developer" });
    await page.goto("/my/chats?role=developer&sort=oldest");
    await expect(roleTab(page, "개발자")).toHaveAttribute("aria-pressed", "true");
    await expect(sortButton(page, "오래된순")).toHaveAttribute("aria-pressed", "true");
    await expect(cardLinks(page).first()).toHaveText("회의록 정리 채팅방");
  });

  test("S319 검색어를 쓰고 곧바로 역할 탭이나 정렬을 눌러도 검색어와 고른 조건이 함께 남는다", async ({ page, context }) => {
    await setDemo(context, { role: "developer" });
    await page.goto("/my/chats");
    const params = () => {
      const search = new URL(page.url()).searchParams;
      return [search.get("q"), search.get("role"), search.get("sort")];
    };

    await searchBox(page).fill("윤슬");
    await roleTab(page, "개발자").click();
    await expect(cardLinks(page)).toHaveText(roomNames(["가계부 노트", "회의록 정리"]));
    /* 검색 대기 시간(300ms)이 지나도 늦은 검색이 탭을 되돌리지 않는다 */
    await page.waitForTimeout(600);
    expect(params()).toEqual(["윤슬", "developer", null]);
    await expect(roleTab(page, "개발자")).toHaveAttribute("aria-pressed", "true");

    await searchBox(page).fill("가계부");
    await sortButton(page, "오래된순").click();
    await expect(cards(page).locator("[data-partner]")).toHaveText(["윤슬", "새벽코더"]);
    await page.waitForTimeout(600);
    expect(params()).toEqual(["가계부", "developer", "oldest"]);
    await expect(sortButton(page, "오래된순")).toHaveAttribute("aria-pressed", "true");
    await expect(searchBox(page)).toHaveValue("가계부");
  });

  test("S320 검색어를 쓰고 곧바로 다른 페이지로 가면 기다리던 검색은 버리고, 돌아오면 입력창과 목록이 맞는다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    const nav = page.getByRole("navigation", { name: "주요 메뉴" });
    await page.goto("/my/chats");

    /* 헤더의 채팅 링크로 돌아오기 */
    await searchBox(page).fill("북로그");
    await homeLogo(page).click();
    await expect(page).toHaveURL("/");
    await page.waitForTimeout(600);
    await expect(page).toHaveURL("/");
    await nav.getByRole("link", { name: "채팅" }).click();
    await expect(page).toHaveURL("/my/chats");
    await expect(searchBox(page)).toHaveValue("");
    await expect(cards(page)).toHaveCount(5);

    /* 브라우저 뒤로 가기로 돌아오기 */
    await searchBox(page).fill("모아");
    await homeLogo(page).click();
    await expect(page).toHaveURL("/");
    await page.goBack();
    await expect(page).toHaveURL("/my/chats");
    await expect(searchBox(page)).toHaveValue("");
    await expect(cards(page)).toHaveCount(5);
  });
});

test.describe("R117 더보기", () => {
  test.beforeEach(async ({ context }) => {
    await setDemo(context, { role: "tester" });
  });

  test("S139 대화방 이름을 바꾸면 카드·검색에 반영되고 새로고침해도 남는다", async ({ page }) => {
    await page.goto("/my/chats");
    await openMoreMenu(page.getByRole("button", { name: "북로그 채팅 더보기" }));
    await page.getByRole("menuitem", { name: "대화방 이름 변경" }).click();
    const dialog = page.getByRole("dialog", { name: "대화방 이름 변경" });
    const input = dialog.getByRole("textbox", { name: "대화방 이름" });
    await expect(input).toBeFocused();
    await expect(input).toHaveValue("북로그");

    await dialog.getByRole("button", { name: "취소" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("button", { name: "북로그 채팅 더보기" })).toBeFocused();

    await openMoreMenu(page.getByRole("button", { name: "북로그 채팅 더보기" }));
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
    await openMoreMenu(page.getByRole("button", { name: "모아플랜 채팅 더보기" }));
    await page.getByRole("menuitem", { name: "대화방 삭제" }).click();
    const dialog = page.getByRole("dialog", { name: "대화방을 삭제할까요?" });
    await expect(dialog).toContainText('"모아플랜" 대화방이 채팅함 목록에서 사라져요.');
    await expect(dialog.getByRole("button", { name: "취소" })).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(cards(page)).toHaveCount(5);

    await openMoreMenu(page.getByRole("button", { name: "모아플랜 채팅 더보기" }));
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
