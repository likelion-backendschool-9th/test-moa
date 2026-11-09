import { expect, test } from "@playwright/test";
import { shouldReplaceChatMessages } from "@/features/chat/message-window";

const messages = (first: number, last: number) => Array.from({ length: last - first + 1 }, (_, index) => ({ seq: first + index }));
const current = messages(6, 35);

test("#54-S28 서버 목록이 47~76이면 기존 6~35와 이어지지 않아 교체한다", () => {
  expect(shouldReplaceChatMessages(current, messages(47, 76))).toBe(true);
});

test("#54-S28 서버 목록이 7~36이면 기존 목록에 바로 앞 순번 6이 있어 합친다", () => {
  expect(shouldReplaceChatMessages(current, messages(7, 36))).toBe(false);
});

test("#54-S28 서버 목록이 순번 1부터 시작하면 합친다", () => {
  expect(shouldReplaceChatMessages(current, messages(1, 30))).toBe(false);
});
