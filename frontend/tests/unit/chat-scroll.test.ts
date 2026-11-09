import { expect, test } from "@playwright/test";
import { shouldScrollChatToEnd } from "@/features/chat/scroll";

test("#54-S29 지난 대화를 읽는 중 상대 메시지가 오면 스크롤하지 않는다", () => {
  expect(shouldScrollChatToEnd(false, "partner", 201)).toBe(false);
  expect(shouldScrollChatToEnd(false, "partner", 1000)).toBe(false);
});

test("#54-S29 내가 보낸 메시지는 화면 아래에서 멀어도 따라간다", () => {
  expect(shouldScrollChatToEnd(false, "me", 1000)).toBe(true);
});

test("#54-S29 처음 열 때는 최근 메시지로 스크롤한다", () => {
  expect(shouldScrollChatToEnd(true, "partner", 1000)).toBe(true);
  expect(shouldScrollChatToEnd(true, undefined, 1000)).toBe(true);
});

test("#54-S29 입력창 끝이 화면 아래에서 200px 안에 있으면 상대 메시지를 따라간다", () => {
  for (const distance of [-20, 0, 199, 200]) {
    expect(shouldScrollChatToEnd(false, "partner", distance)).toBe(true);
  }
});
