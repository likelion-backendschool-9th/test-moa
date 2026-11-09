import type { ChatMessage } from "@/features/chat/types";

/** 새 서버 목록 바로 앞의 순번이 없으면, 중간이 빈 대화를 합치지 않고 최신 목록으로 교체한다 */
export function shouldReplaceChatMessages(current: Pick<ChatMessage, "seq">[], incoming: Pick<ChatMessage, "seq">[]) {
  const first = incoming[0]?.seq;
  return first !== undefined && first > 1 && !current.some(message => message.seq === first - 1);
}
