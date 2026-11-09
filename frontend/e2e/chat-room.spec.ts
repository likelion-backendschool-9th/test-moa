import { expect, type Locator, type Page, test } from "@playwright/test";
import { openMoreMenu, setDemo } from "./helpers";

const main = (page: Page) => page.getByRole("main");
const chatLog = (page: Page) => page.getByRole("log", { name: "대화 내용" });
const messages = (page: Page) => chatLog(page).locator("[data-message]");
const bubble = (item: Locator) => item.locator("p");
const dayHeadings = (page: Page) => chatLog(page).getByRole("heading", { level: 2 });
const messageInput = (page: Page) => page.getByRole("textbox", { name: "메시지 입력" });
const sendButton = (page: Page) => page.getByRole("button", { name: "보내기" });
const inboxCards = (page: Page) => page.getByRole("list", { name: "채팅 목록" }).getByRole("listitem");

const ACCENT_LIGHT = "rgb(15, 124, 74)";

/** 보조 기술이 읽는 말풍선 글. 숨긴 보낸 사람이 앞에 붙고, 줄바꿈은 그대로다 */
const spoken = (item: Locator) => bubble(item).evaluate((element) => element.textContent);

test.describe("R163 접근 제어", () => {
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

test.describe("R166 메시지 보내기", () => {
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
    await expect(messageInput(page)).toHaveAttribute("maxlength", "10000");
  });

  test("S151 한글을 조합하는 중에 누른 Enter로는 보내지 않는다", async ({ page }) => {
    await page.goto("/my/chats/booklog-yunseul");
    /* 채팅방은 스트리밍으로 늦게 그려진다. 기존 메시지가 보인 뒤에 세야 0으로 읽지 않는다 */
    await expect(messages(page).first()).toBeVisible();
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

test.describe("R173 시연 회원 전환", () => {
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
    await openMoreMenu(page.getByRole("button", { name: "가계부 노트 채팅 더보기" }));
    await page.getByRole("menuitem", { name: "대화방 이름 변경" }).click();
    const dialog = page.getByRole("dialog", { name: "대화방 이름 변경" });
    await dialog.getByRole("textbox", { name: "대화방 이름" }).fill("가계부 문의");
    await dialog.getByRole("button", { name: "저장" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("가계부 문의");

    await page.goto("/my/chats/meeting-yunseul");
    await openMoreMenu(page.getByRole("button", { name: "회의록 정리 채팅 더보기" }));
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
