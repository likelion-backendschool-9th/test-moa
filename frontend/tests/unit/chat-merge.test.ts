import { expect, test } from "@playwright/test";
import { mergeChatMessages } from "@/features/chat/message-window";
import type { ChatMessage } from "@/features/chat/types";

const message = (seq: number, text = String(seq)): ChatMessage => ({ id: String(seq), seq, from: "me", text, sentAt: "2026-11-09T01:00:00Z" });

test("#54-S18 전송 응답 뒤 after 응답을 합쳐도 순번 중복 없이 1~5가 된다", () => {
  const sent = mergeChatMessages([message(1), message(2), message(3)], [message(4)]);
  const merged = mergeChatMessages(sent, [message(3), message(4), message(5)]);
  expect(merged.map(item => item.seq)).toEqual([1, 2, 3, 4, 5]);
});

test("#54-S18 순서가 다른 응답은 순번순으로 합치고 같은 순번은 최신 응답을 쓴다", () => {
  const current = [message(3), message(1)];
  expect(mergeChatMessages(current, [message(2), message(3, "저장된 메시지")])).toEqual([message(1), message(2), message(3, "저장된 메시지")]);
  expect(current.map(item => item.seq)).toEqual([3, 1]);
});
