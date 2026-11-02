import { expect, type Locator, type Page, test } from "@playwright/test";
import { setDemo } from "./helpers";

const main = (page: Page) => page.getByRole("main");
const roomHeader = (page: Page) => main(page).locator("header");
const backLink = (page: Page) => main(page).getByRole("link", { name: "채팅함" });
const chatLog = (page: Page) => page.getByRole("log", { name: "대화 내용" });
const messages = (page: Page) => chatLog(page).locator("[data-message]");
const message = (page: Page, text: string) => messages(page).filter({ hasText: text });
const bubble = (item: Locator) => item.locator("p");
const dayHeadings = (page: Page) => chatLog(page).getByRole("heading", { level: 2 });
const messageInput = (page: Page) => page.getByRole("textbox", { name: "메시지 입력" });
const sendButton = (page: Page) => page.getByRole("button", { name: "보내기" });
const inboxCards = (page: Page) => page.getByRole("list", { name: "채팅 목록" }).getByRole("listitem");
const siteFooter = (page: Page) => page.locator("[data-site-footer]");

const ACCENT_LIGHT = "rgb(15, 124, 74)";
const ON_ACCENT_LIGHT = "rgb(255, 255, 255)";
const SHEET_LIGHT = "rgb(251, 251, 250)";
const CLOCK = /^(오전|오후) \d{1,2}:\d{2}$/;
/* 연초 며칠은 작년 날짜가 되므로 두 형식을 모두 받는다 */
const DAY = /^(\d{1,2}월 \d{1,2}일|\d{4}년 \d{1,2}월 \d{1,2}일) [월화수목금토일]요일$/;

/** 보조 기술이 읽는 말풍선 글. 숨긴 보낸 사람이 앞에 붙고, 줄바꿈은 그대로다 */
const spoken = (item: Locator) => bubble(item).evaluate((element) => element.textContent);

test.describe("R1 접근 제어", () => {
  test("S141 비로그인은 이 채팅방으로 돌아오는 로그인으로 보낸다", async ({ page, context }) => {
    await setDemo(context, { role: "guest" });
    await page.goto("/my/chats/booklog-yunseul");
    await expect(page).toHaveURL("/login?next=%2Fmy%2Fchats%2Fbooklog-yunseul");
  });

  test("S142 로그인하면 채팅방이 열리고 채팅 탭이 현재 탭이다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    const response = await page.goto("/my/chats/booklog-yunseul");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: "북로그" })).toBeVisible();
    await expect(page).toHaveTitle("북로그 채팅방 · Test Moa");
    await expect(page.getByRole("navigation", { name: "주요 메뉴" }).getByRole("link", { name: "채팅" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.getByRole("navigation", { name: "마이페이지 메뉴" })).toHaveCount(0);
  });

  for (const roomKey of ["ledger-saebyeok", "nope"]) {
    test(`S143 들어갈 수 없는 대화방(${roomKey})은 안내만 보여 준다`, async ({ page, context }) => {
      await setDemo(context, { role: "tester" });
      await page.goto(`/my/chats/${roomKey}`);
      await expect(page.getByRole("heading", { level: 1, name: "대화방을 찾을 수 없어요" })).toBeVisible();
      await expect(main(page).getByRole("link", { name: "채팅함으로" })).toHaveAttribute("href", "/my/chats");
      await expect(chatLog(page)).toHaveCount(0);
      await expect(messageInput(page)).toHaveCount(0);
      /* 스트리밍 중에 404가 나면 Next가 noindex를 head와 body에 넣는다 */
      await expect(page.locator('head meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    });
  }
});

test.describe("R2 대화방 머리", () => {
  test("S144 테스터는 프로젝트 이미지, 대화방 이름, 상대와 역할 배지, 모집 글 링크, 더보기를 본다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/my/chats/booklog-yunseul");
    await expect(backLink(page)).toHaveAttribute("href", "/my/chats");
    const header = roomHeader(page);
    await expect(header.locator("[data-thumb] img")).toHaveAttribute("src", "/sample/projects/booklog.svg");
    await expect(header.getByRole("heading", { level: 1 })).toHaveText("북로그");
    await expect(header.locator("[data-partner-role]")).toHaveText("개발자");
    await expect(header.locator("[data-partner]")).toHaveText("서재지기");
    expect((await header.locator("[data-partner-role]").boundingBox())!.x).toBeLessThan(
      (await header.locator("[data-partner]").boundingBox())!.x,
    );
    await expect(header.getByRole("link", { name: "북로그 모집 글" })).toHaveAttribute("href", "/recruitments/booklog");
    await expect(header.getByRole("button", { name: "북로그 채팅 더보기" })).toBeVisible();
  });

  test("S145 개발자는 테스터 상대를 보고, 내 닉네임은 본문에 없다", async ({ page, context }) => {
    await setDemo(context, { role: "developer" });
    await page.goto("/my/chats/ledger-yunseul");
    const header = roomHeader(page);
    await expect(header.getByRole("heading", { level: 1 })).toHaveText("가계부 노트");
    await expect(header.locator("[data-partner-role]")).toHaveText("테스터");
    await expect(header.locator("[data-partner]")).toHaveText("윤슬");
    await expect(main(page)).not.toContainText("도현랩");
  });
});

test.describe("R3 대화 내용", () => {
  test.beforeEach(async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/my/chats/booklog-yunseul");
  });

  test("S146 오래된 메시지가 위이고, 날짜가 바뀌는 곳마다 날짜 구분이 있다", async ({ page }) => {
    await expect(chatLog(page)).toContainText("북로그 모집 건으로 열린 1대1 대화방이에요.");
    await expect(dayHeadings(page).first()).toHaveText(DAY);
    await expect(dayHeadings(page).last()).toHaveText("오늘");
    await expect(messages(page).first()).toContainText("윤슬님, 북로그 테스트에 선정되신 걸 축하드려요.");
    await expect(messages(page).last()).toContainText("피드백 마감이 이틀 남았어요. 막히는 부분 있으면 편하게 물어봐 주세요.");
  });

  test("S147 내 메시지는 오른쪽 강조색 말풍선, 상대 메시지는 왼쪽 교정지 말풍선이고 보낸 사람이 읽힌다", async ({ page }) => {
    const log = (await chatLog(page).boundingBox())!;
    const mine = message(page, "감사합니다! 오늘 저녁에 설치해서 써 볼게요.");
    const theirs = message(page, "피드백 마감이 이틀 남았어요.");
    await expect(mine).toHaveAttribute("data-from", "me");
    await expect(theirs).toHaveAttribute("data-from", "partner");

    const mineBox = (await bubble(mine).boundingBox())!;
    const theirsBox = (await bubble(theirs).boundingBox())!;
    expect(Math.abs(mineBox.x + mineBox.width - (log.x + log.width))).toBeLessThanOrEqual(1);
    expect(Math.abs(theirsBox.x - log.x)).toBeLessThanOrEqual(1);
    expect(await bubble(mine).evaluate((element) => getComputedStyle(element).backgroundColor)).toBe(ACCENT_LIGHT);
    expect(await bubble(mine).evaluate((element) => getComputedStyle(element).color)).toBe(ON_ACCENT_LIGHT);
    expect(await bubble(theirs).evaluate((element) => getComputedStyle(element).backgroundColor)).toBe(SHEET_LIGHT);

    expect(await spoken(mine)).toBe("나: 감사합니다! 오늘 저녁에 설치해서 써 볼게요.");
    expect(await spoken(theirs)).toBe("서재지기: 피드백 마감이 이틀 남았어요. 막히는 부분 있으면 편하게 물어봐 주세요.");
  });

  test("S148 같은 사람이 같은 분에 이어 보낸 메시지는 마지막에만 시각이 붙는다", async ({ page }) => {
    await expect(message(page, "확인해 보니 사진을 한 번에 여러 장 올릴 때 생기는 문제였어요.").locator("time")).toHaveCount(0);
    const time = message(page, "이번 주 업데이트에서 고칠게요.").locator("time");
    await expect(time).toHaveText(CLOCK);
    await expect(time).toHaveAttribute("datetime", /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
  });
});

test.describe("R4 메시지 보내기", () => {
  test.beforeEach(async ({ context }) => {
    await setDemo(context, { role: "tester" });
  });

  test("S149 Enter로 보내면 내 말풍선으로 붙고, 새로고침해도 남고, 채팅함 카드에도 반영된다", async ({ page }) => {
    const text = "주말에 일정 만들기부터 해 볼게요.";
    await page.goto("/my/chats/moaplan-yunseul");
    await messageInput(page).fill(text);
    await messageInput(page).press("Enter");

    await expect(messages(page).last()).toContainText(text);
    await expect(messages(page).last()).toHaveAttribute("data-from", "me");
    await expect(dayHeadings(page).last()).toHaveText("오늘");
    await expect(messageInput(page)).toHaveValue("");
    await expect(messageInput(page)).toBeFocused();

    await page.reload();
    await expect(messages(page).last()).toContainText(text);

    await page.goto("/my/chats");
    const first = inboxCards(page).first();
    await expect(first.getByRole("link")).toHaveText("모아플랜 채팅방");
    await expect(first.locator("[data-preview]")).toHaveText(text);
    await expect(first.locator("time")).toHaveAttribute("data-today", "true");
    expect(await first.locator("time").evaluate((element) => getComputedStyle(element).color)).toBe(ACCENT_LIGHT);
  });

  test("S340 키보드 기기에서는 Enter가 보내기이고, 보내기 버튼으로 보내도 입력창에 그대로 있다", async ({ page }) => {
    await page.goto("/my/chats/moaplan-yunseul");
    await expect(messageInput(page)).toHaveAttribute("enterkeyhint", "send");
    await expect(messageInput(page)).toHaveAccessibleDescription("Enter로 보내고, Shift+Enter로 줄을 바꿔요.");

    const count = await messages(page).count();
    await messageInput(page).fill("버튼으로 보내기");
    await sendButton(page).click();
    await expect(messages(page)).toHaveCount(count + 1);
    await expect(messageInput(page)).toBeFocused();

    /* Tab으로 보내기 버튼에 가서 Enter로 눌러도 입력창으로 돌아온다 */
    await messageInput(page).fill("키보드로 버튼 누르기");
    await page.keyboard.press("Tab");
    await expect(sendButton(page)).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(messages(page)).toHaveCount(count + 2);
    await expect(messageInput(page)).toBeFocused();
  });

  test("S150 빈 메시지는 보내지 않고, Shift+Enter는 줄을 바꾼다", async ({ page }) => {
    await page.goto("/my/chats/booklog-yunseul");
    const count = await messages(page).count();
    await expect(sendButton(page)).toBeDisabled();
    await messageInput(page).fill("   ");
    await expect(sendButton(page)).toBeDisabled();
    await messageInput(page).press("Enter");
    await expect(messages(page)).toHaveCount(count);

    await messageInput(page).fill("첫 줄");
    await messageInput(page).press("Shift+Enter");
    await messageInput(page).pressSequentially("둘째 줄");
    await expect(messageInput(page)).toHaveValue("첫 줄\n둘째 줄");
    await sendButton(page).click();
    await expect(messages(page)).toHaveCount(count + 1);
    expect(await spoken(messages(page).last())).toBe("나: 첫 줄\n둘째 줄");
    await expect(messageInput(page)).toHaveAttribute("maxlength", "500");
  });

  test("S151 한글을 조합하는 중에 누른 Enter로는 보내지 않는다", async ({ page }) => {
    await page.goto("/my/chats/booklog-yunseul");
    const count = await messages(page).count();
    const pressEnter = (isComposing: boolean) =>
      messageInput(page).evaluate((element, composing) => {
        element.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true, isComposing: composing }),
        );
      }, isComposing);

    await messageInput(page).fill("조합 중");
    await pressEnter(true);
    await expect(messageInput(page)).toHaveValue("조합 중");
    await expect(page.locator("[data-pending]")).toHaveCount(0);
    await expect(messages(page)).toHaveCount(count);

    /* 조합이 끝난 Enter는 보낸다. 같은 방법으로 보낸 키가 실제로 처리된다는 확인이다 */
    await pressEnter(false);
    await expect(messages(page)).toHaveCount(count + 1);
    await expect(messages(page).last()).toContainText("조합 중");
  });
});

test.describe("R4 메시지 보내기 · 휴대폰", () => {
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

  test("S340 휴대폰에서는 Enter가 줄바꿈이고, 보내기 버튼으로만 보낸다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/my/chats/moaplan-yunseul");
    const count = await messages(page).count();
    await expect(messageInput(page)).toHaveAttribute("enterkeyhint", "enter");
    await expect(messageInput(page)).toHaveAccessibleDescription("Enter로 줄을 바꾸고, 보내기 버튼으로 보내요.");

    await messageInput(page).fill("첫 줄");
    await messageInput(page).press("Enter");
    await messageInput(page).pressSequentially("둘째 줄");
    await expect(messageInput(page)).toHaveValue("첫 줄\n둘째 줄");
    await expect(messages(page)).toHaveCount(count);

    await sendButton(page).tap();
    await expect(messages(page)).toHaveCount(count + 1);
    expect(await spoken(messages(page).last())).toBe("나: 첫 줄\n둘째 줄");
    await expect(messageInput(page)).toHaveValue("");
    /* 입력창에 그대로 있어 키보드가 닫히지 않는다 */
    await expect(messageInput(page)).toBeFocused();
  });
});

test.describe("R5 더보기", () => {
  test.beforeEach(async ({ context }) => {
    await setDemo(context, { role: "tester" });
  });

  test("S152 채팅방에서 이름을 바꾸면 제목과 채팅함 카드가 바뀐다", async ({ page }) => {
    await page.goto("/my/chats/booklog-yunseul");
    await page.getByRole("button", { name: "북로그 채팅 더보기" }).click();
    await page.getByRole("menuitem", { name: "대화방 이름 변경" }).click();
    const dialog = page.getByRole("dialog", { name: "대화방 이름 변경" });
    await dialog.getByRole("textbox", { name: "대화방 이름" }).fill("북로그 피드백 문의");
    await dialog.getByRole("button", { name: "저장" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("북로그 피드백 문의");
    await expect(page.getByRole("button", { name: "북로그 피드백 문의 채팅 더보기" })).toBeVisible();

    await backLink(page).click();
    await expect(page).toHaveURL("/my/chats");
    await expect(inboxCards(page).first().getByRole("link")).toHaveText("북로그 피드백 문의 채팅방");
  });

  test("S153 채팅방에서 삭제하면 채팅함으로 돌아가고, 그 방은 다시 열리지 않는다", async ({ page }) => {
    await page.goto("/my/chats/moaplan-yunseul");
    await page.getByRole("button", { name: "모아플랜 채팅 더보기" }).click();
    await page.getByRole("menuitem", { name: "대화방 삭제" }).click();
    await page.getByRole("dialog", { name: "대화방을 삭제할까요?" }).getByRole("button", { name: "삭제", exact: true }).click();

    await expect(page).toHaveURL("/my/chats");
    await expect(inboxCards(page)).toHaveCount(4);
    await expect(page.getByRole("list", { name: "채팅 목록" })).not.toContainText("모아플랜");

    await page.goto("/my/chats/moaplan-yunseul");
    await expect(page.getByRole("heading", { level: 1, name: "대화방을 찾을 수 없어요" })).toBeVisible();
  });
});

test.describe("R6 로딩", () => {
  test("S154 채팅함 링크는 바로, 대화방은 스켈레톤 먼저", async ({ page, context }) => {
    await setDemo(context, { role: "tester", data: "slow" });
    await page.goto("/my/chats/booklog-yunseul", { waitUntil: "commit" });
    await expect(backLink(page)).toBeVisible();
    const skeleton = page.getByLabel("대화방 불러오는 중");
    await expect(skeleton).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "북로그" })).toBeVisible();
    await expect(chatLog(page)).toBeVisible();
    await expect(skeleton).toHaveCount(0);
  });
});

test.describe("R7 모바일", () => {
  test("S155 좁은 화면에서 가로 스크롤이 없고, 최근 메시지가 입력창 바로 위에 보인다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/my/chats/booklog-yunseul");
    await expect(messages(page).last()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);

    const form = page.locator("form").filter({ has: messageInput(page) });
    await expect
      .poll(async () => {
        const formBox = (await form.boundingBox())!;
        const buttonBox = (await sendButton(page).boundingBox())!;
        const lastBox = (await bubble(messages(page).last()).boundingBox())!;
        return (
          formBox.y + formBox.height <= 812 &&
          formBox.y > 812 / 2 &&
          buttonBox.x + buttonBox.width <= 375 &&
          lastBox.y >= 0 &&
          lastBox.y + lastBox.height <= formBox.y
        );
      })
      .toBe(true);
  });
});

test.describe("R10 푸터 없는 채팅방", () => {
  test.beforeEach(async ({ context }) => {
    await setDemo(context, { role: "tester" });
  });

  test("S157 채팅방에만 푸터가 없고, 채팅함과 다른 페이지에는 있다", async ({ page }) => {
    await page.goto("/my/chats/booklog-yunseul");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(siteFooter(page)).toBeHidden();
    for (const path of ["/my/chats", "/my/chats/nope", "/my"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(siteFooter(page)).toBeVisible();
    }
  });

  test("S321 채팅방을 나오면 채팅함과 다른 페이지에 푸터가 다시 보인다", async ({ page }) => {
    await page.goto("/my/chats");
    await expect(siteFooter(page)).toBeVisible();

    await inboxCards(page).first().getByRole("link", { name: "북로그 채팅방" }).click();
    await expect(page).toHaveURL("/my/chats/booklog-yunseul");
    await expect(siteFooter(page)).toBeHidden();

    /* 떠난 채팅방은 숨겨진 채 문서에 남지만 채팅함의 푸터를 숨기지 않는다 */
    await backLink(page).click();
    await expect(page).toHaveURL("/my/chats");
    await expect(siteFooter(page)).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL("/my/chats/booklog-yunseul");
    await expect(siteFooter(page)).toBeHidden();

    await page.getByRole("navigation", { name: "주요 메뉴" }).getByRole("link", { name: "홈" }).click();
    await expect(page).toHaveURL("/");
    await expect(siteFooter(page)).toBeVisible();
  });

  test("S158 대화가 짧아도 입력창은 화면 아래에 있다", async ({ page, context }) => {
    await setDemo(context, { role: "developer" });
    await page.goto("/my/chats/ledger-yunseul");
    await expect(messages(page)).toHaveCount(3);
    const size = page.viewportSize()!;
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(size.height);
    const form = (await page.locator("form").filter({ has: messageInput(page) }).boundingBox())!;
    expect(form.y + form.height).toBeGreaterThan(size.height - 80);
    expect(form.y + form.height).toBeLessThanOrEqual(size.height);
  });
});

test.describe("R11 시연 회원 전환", () => {
  test("S317 보낸 메시지는 보낸 회원 기준으로 나와 상대가 나뉜다", async ({ page, context }) => {
    const text = "분류 고친 버전도 확인해 볼게요.";
    await setDemo(context, { role: "tester" });
    await page.goto("/my/chats/ledger-yunseul");
    await messageInput(page).fill(text);
    await messageInput(page).press("Enter");
    await expect(messages(page).last()).toContainText(text);
    /* 보내는 중 말풍선에는 data-message가 없어서, 저장된 뒤에야 마지막 메시지가 된다 */
    await expect(messages(page).last()).toHaveAttribute("data-from", "me");

    /* 같은 방의 개발자에게는 상대(윤슬)가 보낸 메시지다 */
    await setDemo(context, { role: "developer" });
    await page.goto("/my/chats/ledger-yunseul");
    const last = messages(page).last();
    await expect(last).toHaveAttribute("data-from", "partner");
    expect(await spoken(last)).toBe(`윤슬: ${text}`);
    const log = (await chatLog(page).boundingBox())!;
    expect(Math.abs((await bubble(last).boundingBox())!.x - log.x)).toBeLessThanOrEqual(1);

    await page.goto("/my/chats");
    const first = inboxCards(page).first();
    await expect(first.getByRole("link")).toHaveText("가계부 노트 채팅방");
    await expect(first.locator("[data-partner]")).toHaveText("윤슬");
    await expect(first.locator("[data-preview]")).toHaveText(text);

    await setDemo(context, { role: "tester" });
    await page.goto("/my/chats/ledger-yunseul");
    await expect(messages(page).last()).toHaveAttribute("data-from", "me");
    expect(await spoken(messages(page).last())).toBe(`나: ${text}`);
  });

  test("S318 대화방 이름 변경과 삭제는 바꾼 회원의 채팅함에만 적용된다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/my/chats/ledger-yunseul");
    await page.getByRole("button", { name: "가계부 노트 채팅 더보기" }).click();
    await page.getByRole("menuitem", { name: "대화방 이름 변경" }).click();
    const dialog = page.getByRole("dialog", { name: "대화방 이름 변경" });
    await dialog.getByRole("textbox", { name: "대화방 이름" }).fill("가계부 문의");
    await dialog.getByRole("button", { name: "저장" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("가계부 문의");

    await page.goto("/my/chats/meeting-yunseul");
    await page.getByRole("button", { name: "회의록 정리 채팅 더보기" }).click();
    await page.getByRole("menuitem", { name: "대화방 삭제" }).click();
    await page.getByRole("dialog", { name: "대화방을 삭제할까요?" }).getByRole("button", { name: "삭제", exact: true }).click();
    await expect(page).toHaveURL("/my/chats");
    await expect(inboxCards(page)).toHaveCount(4);

    /* 같은 두 방에 들어가 있는 개발자의 채팅함은 그대로다 */
    await setDemo(context, { role: "developer" });
    await page.goto("/my/chats");
    await expect(inboxCards(page)).toHaveCount(4);
    await expect(page.getByRole("list", { name: "채팅 목록" })).toContainText("회의록 정리");
    await expect(page.getByRole("list", { name: "채팅 목록" })).not.toContainText("가계부 문의");
    await page.goto("/my/chats/ledger-yunseul");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("가계부 노트");
  });
});

test.describe("R12 오가는 흐름", () => {
  test("S335 채팅함에서 고른 조건은 채팅방의 채팅함 링크로 돌아와도 그대로다", async ({ page, context }) => {
    await setDemo(context, { role: "developer" });
    await page.goto("/my/chats?role=developer&sort=oldest");
    await inboxCards(page).first().getByRole("link").click();
    await expect(page).toHaveURL("/my/chats/meeting-yunseul");
    await expect(backLink(page)).toHaveAttribute("href", "/my/chats?role=developer&sort=oldest");
    await backLink(page).click();
    await expect(page).toHaveURL("/my/chats?role=developer&sort=oldest");
    await expect(page.getByRole("group", { name: "역할별 보기" }).getByRole("button", { name: /개발자/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    /* 채팅방 주소로 바로 열면 조건 없는 채팅함으로 돌아간다 */
    await page.goto("/my/chats/ledger-yunseul");
    await expect(backLink(page)).toHaveAttribute("href", "/my/chats");
  });

  test("S336 메뉴나 대화상자를 연 채 떠났다가 돌아오면 닫혀 있고 화면을 그대로 쓸 수 있다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/my/chats");
    await inboxCards(page).first().getByRole("link").click();
    await expect(chatLog(page)).toBeVisible();
    const more = roomHeader(page).getByRole("button", { name: "북로그 채팅 더보기" });

    await more.click();
    await page.getByRole("menuitem", { name: "대화방 이름 변경" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL("/my/chats");
    /* 떠난 화면의 대화상자가 채팅함을 막지 않는다 */
    await page.getByRole("searchbox", { name: "채팅방 검색" }).click();
    await page.goForward();
    await expect(page).toHaveURL("/my/chats/booklog-yunseul");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await messageInput(page).click();
    await expect(messageInput(page)).toBeFocused();

    await more.click();
    await expect(page.getByRole("menu")).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL("/my/chats");
    await page.goForward();
    await expect(page).toHaveURL("/my/chats/booklog-yunseul");
    await expect(page.getByRole("menu")).toHaveCount(0);
    await expect(more).toHaveAttribute("aria-expanded", "false");
  });

  test("S337 같은 채팅방에 다시 들어오면 위에서부터 굴러 내려가지 않고 바로 최근 메시지가 보인다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/my/chats");
    await inboxCards(page).first().getByRole("link").click();
    await expect(chatLog(page)).toBeVisible();
    await backLink(page).click();
    await expect(page).toHaveURL("/my/chats");

    await page.evaluate(() => {
      const scrolls: number[] = [];
      (window as unknown as { scrolls: number[] }).scrolls = scrolls;
      /* 채팅방 주소로 바뀐 뒤의 스크롤만 모은다. 카드를 누르기 전 채팅함에서 일어난 스크롤은 뺀다 */
      window.addEventListener("scroll", () => {
        if (window.location.pathname !== "/my/chats") scrolls.push(window.scrollY);
      });
    });
    await inboxCards(page).first().getByRole("link").click();
    await expect(page).toHaveURL("/my/chats/booklog-yunseul");
    await expect(chatLog(page)).toBeVisible();
    const bottom = () => page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
    await expect
      .poll(() => page.evaluate(() => window.scrollY > 0 && window.scrollY === document.documentElement.scrollHeight - window.innerHeight))
      .toBe(true);
    await page.waitForTimeout(500);
    const max = await bottom();
    /* 맨 위(0)와 맨 아래 사이를 지나는 스크롤이 없다 */
    const scrolls = await page.evaluate(() => (window as unknown as { scrolls: number[] }).scrolls);
    expect(scrolls.filter((y) => y > 0 && y < max)).toEqual([]);
  });

  test("S338 보내는 중 말풍선은 저장된 뒤와 같은 자리에 보인다", async ({ page, context }) => {
    /* 저장 뒤 다시 그리는 데 1.5초 걸려 보내는 중 말풍선을 잴 수 있다 */
    await setDemo(context, { role: "tester", data: "slow" });
    const top = (locator: Locator) => locator.evaluate((element) => element.getBoundingClientRect().top + window.scrollY);
    /* 모아플랜은 마지막 대화가 어제라 "오늘" 구분이 먼저 붙고, 북로그는 오늘이라 구분 없이 붙는다 */
    for (const [roomKey, dividers] of [
      ["moaplan-yunseul", 1],
      ["booklog-yunseul", 0],
    ] as const) {
      await page.goto(`/my/chats/${roomKey}`);
      await expect(chatLog(page)).toBeVisible({ timeout: 10_000 });
      const text = `자리 확인 ${roomKey}`;
      await messageInput(page).fill(text);
      await messageInput(page).press("Enter");
      const pending = page.locator("[data-pending] p");
      await expect(pending).toBeVisible();
      await expect(page.locator("[data-pending-day]")).toHaveCount(dividers);
      const pendingTop = await top(pending);

      await expect(messages(page).last()).toContainText(text, { timeout: 10_000 });
      await expect(dayHeadings(page).last()).toHaveText("오늘");
      expect(Math.abs((await top(bubble(messages(page).last()))) - pendingTop)).toBeLessThanOrEqual(1);
    }
  });
});

test.describe("R8 접근성", () => {
  test("S156 대화 기록, 입력창, 보내기 버튼의 이름과 순서", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/my/chats/booklog-yunseul");
    await expect(chatLog(page)).toBeVisible();
    await expect(messageInput(page)).toBeVisible();
    await expect(sendButton(page)).toBeVisible();
    await messageInput(page).fill("안녕하세요");
    await messageInput(page).focus();
    await page.keyboard.press("Tab");
    await expect(sendButton(page)).toBeFocused();
  });
});
