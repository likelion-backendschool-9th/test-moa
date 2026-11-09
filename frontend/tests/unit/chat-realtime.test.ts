import { expect, test } from "@playwright/test";
import { nextChatRetryDelay, shouldRetryChatRead, shouldRefreshChatInbox } from "@/features/chat/realtime";

test("#54-S31 실패가 이어지면 재시도 간격은 1·2·4·8·16·30·30초다", () => {
  let delay = 1000;
  const delays: number[] = [];
  for (let attempt = 0; attempt < 7; attempt++) {
    delays.push(delay);
    delay = nextChatRetryDelay(delay);
  }
  expect(delays).toEqual([1000, 2000, 4000, 8000, 16000, 30000, 30000]);
});

test("#54-S32 읽음 처리의 401·404는 재시도하지 않고 503은 재시도한다", () => {
  expect(shouldRetryChatRead(401)).toBe(false);
  expect(shouldRetryChatRead(404)).toBe(false);
  expect(shouldRetryChatRead(503)).toBe(true);
});

test("#54-S33 상대의 읽음은 채팅함을 갱신하지 않는다", () => {
  expect(shouldRefreshChatInbox({ type: "read", reader: "partner" })).toBe(false);
});

test("#54-S33 메시지·내 읽음·ready는 채팅함을 갱신한다", () => {
  expect(shouldRefreshChatInbox({ type: "message" })).toBe(true);
  expect(shouldRefreshChatInbox({ type: "read", reader: "me" })).toBe(true);
  expect(shouldRefreshChatInbox({ type: "ready" })).toBe(true);
});
