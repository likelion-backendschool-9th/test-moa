import { cn } from "@/lib/cn";
import { formatClock } from "@/lib/format";
import { groupChatMessages } from "../thread";
import type { ChatMessage, ChatRoom } from "../types";
import { bubbleClass, bubbleMetaClass, bubbleRowClass, dayDividerClass } from "./bubble";

/**
 * 채팅방의 대화 내용. 맨 위에 어느 모집 건의 대화방인지 한 줄로 알리고, 날짜(h2)마다 메시지를 묶는다.
 * 날짜 구분은 가운데 흐린 먹 글자 양옆에 1px 재단 회색 선이다.
 * 같은 사람이 이어 보낸 말풍선은 붙이고, 같은 분 묶음의 마지막에만 시각을 붙인다.
 * role="log"라 새 메시지가 붙으면 보조 기술이 읽는다. 말풍선 앞에는 보낸 사람("나", 상대 닉네임)을 숨겨서 둔다.
 */
export function ChatMessageList({ room, messages, now }: { room: ChatRoom; messages: ChatMessage[]; now: Date }) {
  const days = groupChatMessages(messages, now);
  return (
    <div role="log" aria-label="대화 내용" className="flex flex-col gap-8">
      <p className="text-center text-xs text-text-muted">{room.projectName} 모집 건으로 열린 1대1 대화방이에요.</p>
      {days.map((day) => (
        <section key={day.key} aria-labelledby={`day-${day.key}`} className="flex flex-col gap-4">
          <h2 id={`day-${day.key}`} className={dayDividerClass}>
            {day.label}
          </h2>
          <ol className="flex flex-col">
            {day.items.map(({ message, startsRun, endsRun }, index) => (
              <li
                key={message.id}
                data-message
                data-from={message.from}
                className={cn(bubbleRowClass(message.from), index > 0 && (startsRun ? "mt-3" : "mt-1"))}
              >
                <p className={bubbleClass(message.from, endsRun)}>
                  <span className="sr-only">{message.from === "me" ? "나" : room.partner.nickname}: </span>
                  {message.text}
                </p>
                {endsRun && (
                  <time dateTime={message.sentAt} className={bubbleMetaClass}>
                    {formatClock(message.sentAt)}
                  </time>
                )}
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
