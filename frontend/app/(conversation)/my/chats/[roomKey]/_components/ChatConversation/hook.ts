import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { shouldReplaceChatMessages } from "@/features/chat/message-window";
import type { ChatMessage, ChatRoomData } from "@/features/chat/types";

function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]) {
  const bySeq = new Map(current.map(message => [message.seq, message]));
  for (const message of incoming) bySeq.set(message.seq, message);
  return [...bySeq.values()].sort((a, b) => a.seq - b.seq);
}

export function useChatConversation(data: ChatRoomData) {
  const router = useRouter();
  const [source, setSource] = useState(data);
  const [stored, setStored] = useState(data.messages);
  const [hasMore, setHasMore] = useState(data.hasMore);
  const [readOnly, setReadOnly] = useState(data.room.readOnly);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const anchor = useRef<{ element: Element; top: number } | null>(null);
  // 서버 목록과 이어질 때만 이전 대화를 남긴다. 목업은 쿠키로 다시 그린 값을 쓴다.
  if (source !== data) {
    setSource(data);
    setReadOnly(data.room.readOnly);
    if (shouldReplaceChatMessages(stored, data.messages)) {
      setStored(data.messages);
      setHasMore(data.hasMore);
    } else {
      setStored(current => mergeMessages(current, data.messages));
    }
  }
  const messages = data.live ? stored : data.messages;
  const before = messages[0]?.seq;

  const loadPrevious = useCallback(async () => {
    if (busy.current || !hasMore || before === undefined) return;
    busy.current = true;
    setLoading(true);
    setFailed(false);
    try {
      const response = await fetch(`/api/chats/${encodeURIComponent(data.room.roomKey)}/messages?before=${before}`, { cache: "no-store" });
      if (response.status === 401 || response.status === 404) {
        router.refresh();
        return;
      }
      if (!response.ok) throw new Error("이전 메시지 조회 실패");
      const slice: { messages: ChatMessage[]; hasMore: boolean } = await response.json();
      const element = listRef.current?.querySelector("[data-message]");
      if (element) anchor.current = { element, top: element.getBoundingClientRect().top };
      setStored(current => mergeMessages(current, slice.messages));
      setHasMore(slice.hasMore);
    } catch {
      setFailed(true);
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, [before, data.room.roomKey, hasMore, router]);

  useLayoutEffect(() => {
    const previous = anchor.current;
    if (!previous) return;
    window.scrollBy({ top: previous.element.getBoundingClientRect().top - previous.top, behavior: "instant" });
    anchor.current = null;
  }, [stored]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || failed) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) void loadPrevious();
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, failed, loadPrevious]);

  function onSent(result: ChatMessage | { readOnly: true }) {
    if ("readOnly" in result) setReadOnly(true);
    else setStored(current => mergeMessages(current, [result]));
  }

  return { messages, readOnly: data.room.readOnly || readOnly, loading, failed, hasMore, sentinelRef, listRef, loadPrevious, onSent };
}
