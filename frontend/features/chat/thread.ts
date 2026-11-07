import { formatChatDay, formatClock, seoulDayKey } from "@/lib/format";
import type { ChatMessage } from "@/features/chat/types";

/** 말풍선 하나와 그 자리에서 정해지는 모양 */
export type ChatThreadItem = {
  message: ChatMessage;
  /** 보낸 사람이 바뀌어 새 묶음이 시작된다. 위를 조금 더 띄운다 */
  startsRun: boolean;
  /** 같은 사람이 같은 분에 보낸 묶음의 마지막이다. 시각을 붙이고 말하는 쪽 아래 모서리를 덜 둥글린다 */
  endsRun: boolean;
};

/** 하루치 메시지 */
export type ChatThreadDay = {
  /** 서울 기준 "2026-10-30" */
  key: string;
  /** "오늘", "어제", "10월 29일 목요일" */
  label: string;
  items: ChatThreadItem[];
};

/**
 * 오래된 것부터 정렬된 메시지를 서울 기준 날짜별로 나누고, 말풍선마다 묶음의 시작과 끝을 표시한다.
 * 날짜가 바뀌면 묶음도 새로 시작한다.
 */
export function groupChatMessages(messages: ChatMessage[], now: Date): ChatThreadDay[] {
  const days: ChatThreadDay[] = [];
  messages.forEach((message, index) => {
    const key = seoulDayKey(message.sentAt);
    let day = days[days.length - 1];
    if (day?.key !== key) {
      day = { key, label: formatChatDay(message.sentAt, now), items: [] };
      days.push(day);
    }
    const previous = day.items[day.items.length - 1]?.message;
    const next = messages[index + 1];
    const nextInRun =
      next !== undefined &&
      next.from === message.from &&
      seoulDayKey(next.sentAt) === key &&
      formatClock(next.sentAt) === formatClock(message.sentAt);
    day.items.push({
      message,
      startsRun: previous === undefined || previous.from !== message.from,
      endsRun: !nextInRun,
    });
  });
  return days;
}
