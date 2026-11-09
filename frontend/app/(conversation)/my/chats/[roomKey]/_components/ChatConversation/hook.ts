import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { markChatReadAction } from "@/features/chat/actions";
import { subscribeChatEvents, refreshChatUnreadCount } from "@/app/_components/ChatEvents/hook";
import { shouldReplaceChatMessages, mergeChatMessages } from "@/features/chat/message-window";
import type { ChatMessage, ChatRoomData } from "@/features/chat/types";

export function useChatConversation(data: ChatRoomData) {
  const router = useRouter();
  const [source, setSource] = useState(data);
  const [stored, setStored] = useState(data.messages);
  const [hasMore, setHasMore] = useState(data.hasMore);
  const [partnerLastReadSeq, setPartnerLastReadSeq] = useState(data.room.partnerLastReadSeq ?? 0);
  const afterCursor = useRef(data.messages.at(-1)?.seq ?? 0);
  const readCursor = useRef(0);
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
    setPartnerLastReadSeq(current => Math.max(current, data.room.partnerLastReadSeq ?? 0));
    if (shouldReplaceChatMessages(stored, data.messages)) {
      setStored(data.messages);
      setHasMore(data.hasMore);
    } else {
      setStored(current => mergeChatMessages(current, data.messages));
    }
  }
  const messages = data.live ? stored : data.messages;
  const before = messages[0]?.seq;
  const lastSeq = messages.at(-1)?.seq ?? 0;
  const roomKey = data.room.roomKey;
  const live = data.live;

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
      setStored(current => mergeChatMessages(current, slice.messages));
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

  // after의 커서는 전송 응답으로 건너뛰지 않는다. 재연결 때 모든 페이지를 받아 빈 구간을 채운다.
  useEffect(() => {
    if (!live) return;
    let active = true;
    let running = false;
    let wanted = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    async function catchUp() {
      wanted = true;
      if (running) return;
      running = true;
      clearTimeout(retry);
      try {
        while (active && wanted) {
          wanted = false;
          let more = true;
          while (active && more) {
            const response = await fetch(`/api/chats/${encodeURIComponent(roomKey)}/messages?after=${afterCursor.current}`, { cache: "no-store", signal: controller.signal });
            if (response.status === 401 || response.status === 404) {
              router.refresh();
              return;
            }
            if (!response.ok) throw new Error("새 메시지 조회 실패");
            const slice: { messages: ChatMessage[]; hasMore: boolean } = await response.json();
            if (!active) return;
            const next = slice.messages.at(-1)?.seq ?? afterCursor.current;
            if (slice.hasMore && next <= afterCursor.current) throw new Error("메시지 순번이 이어지지 않아요");
            setStored(current => mergeChatMessages(current, slice.messages));
            afterCursor.current = Math.max(afterCursor.current, next);
            more = slice.hasMore;
          }
        }
      } catch {
        if (active) retry = setTimeout(() => { void catchUp(); }, 1000);
      } finally {
        running = false;
      }
    }
    const unsubscribe = subscribeChatEvents(event => {
      if (event.type === "ready" || (event.type === "message" && event.roomKey === roomKey)) void catchUp();
      if (event.type === "read" && event.roomKey === roomKey && event.reader === "partner") {
        setPartnerLastReadSeq(current => Math.max(current, event.lastReadSeq));
      }
    });
    const onVisible = () => { if (document.visibilityState === "visible") void catchUp(); };
    document.addEventListener("visibilitychange", onVisible);
    // 구독 이전에 메시지가 왔거나 ready를 놓친 경우도 같은 커서부터 확인한다.
    void catchUp();
    return () => {
      active = false;
      controller.abort();
      clearTimeout(retry);
      unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [live, roomKey, router]);

  useEffect(() => {
    if (!live || lastSeq === 0) return;
    let active = true;
    let running = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    async function readVisible() {
      if (running || document.visibilityState !== "visible" || lastSeq <= readCursor.current) return;
      running = true;
      try {
        // 요청하는 순간 보이는 대화의 마지막 순번이다. 내 메시지만 있어도 이 순번을 보낸다.
        const result = await markChatReadAction(roomKey, lastSeq);
        if (!active) return;
        if (result.ok) {
          readCursor.current = Math.max(readCursor.current, lastSeq);
          refreshChatUnreadCount();
        } else {
          retry = setTimeout(() => { void readVisible(); }, 1000);
        }
      } catch {
        if (active) retry = setTimeout(() => { void readVisible(); }, 1000);
      } finally {
        running = false;
      }
    }
    const onVisible = () => { if (document.visibilityState === "visible") void readVisible(); };
    document.addEventListener("visibilitychange", onVisible);
    void readVisible();
    return () => {
      active = false;
      clearTimeout(retry);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [live, lastSeq, roomKey, router]);

  function onSent(result: ChatMessage | { readOnly: true }) {
    if ("readOnly" in result) setReadOnly(true);
    else setStored(current => mergeChatMessages(current, [result]));
  }

  return { messages, partnerLastReadSeq: live ? partnerLastReadSeq : undefined, readOnly: data.room.readOnly || readOnly, loading, failed, hasMore, sentinelRef, listRef, loadPrevious, onSent };
}
