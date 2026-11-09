import type { ChatMessage } from "@/features/chat/types";

/** 새 서버 목록 바로 앞의 순번이 없으면, 중간이 빈 대화를 합치지 않고 최신 목록으로 교체한다 */
export function shouldReplaceChatMessages(current: Pick<ChatMessage, "seq">[], incoming: Pick<ChatMessage, "seq">[]) {
  const first = incoming[0]?.seq;
  return first !== undefined && first > 1 && !current.some(message => message.seq === first - 1);
}

/** 서버 응답과 전송 응답을 순번으로 합쳐 중복을 없앤다 */
export function mergeChatMessages(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const bySeq = new Map(current.map(message => [message.seq, message]));
  for (const message of incoming) bySeq.set(message.seq, message);
  return [...bySeq.values()].sort((a, b) => a.seq - b.seq);
}
