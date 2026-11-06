import { cn } from "@/lib/cn";
import type { ChatMessage } from "../types";

/*
 * 말풍선 모양. 대화 내용(ChatMessageList)과 보내는 중 말풍선(ChatComposer)이 같이 쓴다.
 * 내 메시지는 강조색 바탕 + 강조 위 글씨(메인 색, 11-01 요청), 상대 메시지는 교정지 바탕 + 먹 글씨.
 * 내 말풍선은 바탕이 강조색이라 글을 선택하면 선택 색을 뒤집어 보이게 한다.
 */

/** 말풍선 한 줄. 내 메시지는 오른쪽, 상대 메시지는 왼쪽에 붙고 시각은 말풍선 바깥쪽에 온다 */
export function bubbleRowClass(from: ChatMessage["from"]) {
  return cn("flex items-end gap-2", from === "me" && "flex-row-reverse");
}

/** endsRun: 묶음의 마지막 말풍선이면 말하는 쪽 아래 모서리를 덜 둥글린다 */
export function bubbleClass(from: ChatMessage["from"], endsRun: boolean) {
  return cn(
    "max-w-4/5 rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap wrap-break-word",
    from === "me"
      ? "bg-accent text-on-accent selection:bg-on-accent selection:text-accent"
      : "bg-surface-muted text-text",
    endsRun && (from === "me" ? "rounded-br-md" : "rounded-bl-md"),
  );
}

export const bubbleMetaClass = "shrink-0 pb-0.5 text-xs text-text-muted tabular-nums";

/** 날짜 구분. 가운데 흐린 먹 글자 양옆에 1px 재단 회색 선 */
export const dayDividerClass =
  "flex items-center gap-3 text-xs font-semibold text-text-muted before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line";
