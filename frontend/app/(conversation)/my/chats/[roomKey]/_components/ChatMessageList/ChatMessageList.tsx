import { cn } from "@/lib/cn";
import { formatClock } from "@/lib/format";
import { groupChatMessages } from "@/features/chat/thread";
import type { ChatMessage, ChatRoom } from "@/features/chat/types";
import { ChatBubble, ChatBubbleRow, ChatBubbleTime } from "../ChatBubble/ChatBubble";
import { DayDivider } from "../DayDivider/DayDivider";
import styles from "./ChatMessageList.module.css";

/**
 * 채팅방의 대화 내용. 맨 위에 어느 모집 건의 대화방인지 한 줄로 알리고, 날짜(h2)마다 메시지를 묶는다.
 * 날짜 구분은 가운데 흐린 먹 글자 양옆에 1px 재단 회색 선이다.
 * 같은 사람이 이어 보낸 말풍선은 붙이고, 같은 분 묶음의 마지막에만 시각을 붙인다.
 * role="log"라 새 메시지가 붙으면 보조 기술이 읽는다. 말풍선 앞에는 보낸 사람("나", 상대 닉네임)을 숨겨서 둔다.
 */
export function ChatMessageList({ room, messages, now, partnerLastReadSeq }: { room: ChatRoom; messages: ChatMessage[]; now: Date; partnerLastReadSeq?: number }) {
  const days = groupChatMessages(messages, now);
  return (
    <div role="log" aria-label="대화 내용" className={styles.root}>
      <p className={styles.text}>{room.projectName} 모집 건으로 열린 1대1 대화방이에요.</p>
      {days.map((day) => (
        <section key={day.key} aria-labelledby={`day-${day.key}`} className={styles.root2}>
          <DayDivider id={`day-${day.key}`}>{day.label}</DayDivider>
          <ol className={styles.list}>
            {day.items.map(({ message, startsRun, endsRun }, index) => (
              <ChatBubbleRow
                key={message.id}
                data-message
                data-from={message.from}
                from={message.from}
                className={cn(index > 0 && (startsRun ? styles.startsRun : styles.continuesRun))}
              >
                <ChatBubble from={message.from} endsRun={endsRun}>
                  <span className={styles.srOnly}>{message.from === "me" ? "나" : room.partner.nickname}: </span>
                  {message.text}
                </ChatBubble>
                {(endsRun || (message.from === "me" && partnerLastReadSeq !== undefined && message.seq > partnerLastReadSeq)) && (
                  <span className={styles.meta}>
                    {message.from === "me" && partnerLastReadSeq !== undefined && message.seq > partnerLastReadSeq && (
                      <span className={styles.unread}><span aria-hidden>1</span><span className={styles.srOnly}>안 읽음</span></span>
                    )}
                    {endsRun && <ChatBubbleTime dateTime={message.sentAt}>{formatClock(message.sentAt)}</ChatBubbleTime>}
                  </span>
                )}
              </ChatBubbleRow>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
