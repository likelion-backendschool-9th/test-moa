import type { ChatMessage } from "@/features/chat/types";

/** 처음 열 때와 내가 보냈을 때는 끝으로, 상대의 새 메시지는 화면 아래에서 200px 안에 있을 때만 따라간다 */
export function shouldScrollChatToEnd(firstOpen: boolean, lastFrom: ChatMessage["from"] | undefined, distanceFromBottom: number) {
  return firstOpen || lastFrom === "me" || distanceFromBottom <= 200;
}
