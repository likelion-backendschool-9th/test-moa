import type { ComponentProps } from "react";
import { Card } from "@/components/ui/Card/Card";
import { cn } from "@/lib/cn";
import type { ChatMessage } from "@/features/chat/types";
import styles from "./ChatBubble.module.css";

/*
 * 말풍선 모양. 대화 내용(ChatMessageList)과 보내는 중 말풍선(ChatComposer)이 같이 쓴다.
 * 내 메시지는 강조색 바탕 + 강조 위 글씨(메인 색, 11-01 요청), 상대 메시지는 교정지 면(Card) + 먹 글씨.
 * 내 말풍선은 바탕이 강조색이라 글을 선택하면 선택 색을 뒤집어 보이게 한다.
 */

type From = ChatMessage["from"];

/** 말풍선 한 줄. 내 메시지는 오른쪽, 상대 메시지는 왼쪽에 붙고 시각은 말풍선 바깥쪽에 온다 */
export function ChatBubbleRow({ from, className, ...props }: { from: From } & ComponentProps<"li">) {
  return <li {...props} className={cn(styles.row, from === "me" && styles.rowMe, className)} />;
}

/** endsRun: 묶음의 마지막 말풍선이면 말하는 쪽 아래 모서리를 덜 둥글린다 */
export function ChatBubble({ from, endsRun, className, ...props }: { from: From; endsRun: boolean } & ComponentProps<"p">) {
  if (from === "me") return <p {...props} className={cn(styles.bubble, styles.me, endsRun && styles.endsMe, className)} />;
  return <Card as="p" {...props} className={cn(styles.bubble, styles.partner, endsRun && styles.endsPartner, className)} />;
}

/** 말풍선 옆 시각이나 "보내는 중" */
export function ChatBubbleTime({ className, ...props }: ComponentProps<"time">) {
  return <time {...props} className={cn(styles.time, className)} />;
}

export function ChatBubbleNote({ className, ...props }: ComponentProps<"span">) {
  return <span {...props} className={cn(styles.time, className)} />;
}
