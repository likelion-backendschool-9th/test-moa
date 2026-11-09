"use client";

import { nextChatRetryDelay } from "@/features/chat/realtime";
import { useEffect, useSyncExternalStore } from "react";

export type ChatEvent =
  | { type: "ready" }
  | { type: "message"; roomKey: string; seq: number }
  | { type: "read"; roomKey: string; reader: "me" | "partner"; lastReadSeq: number };

const listeners = new Set<(event: ChatEvent) => void>();
const countListeners = new Set<() => void>();
let source: EventSource | null = null;
let unreadCount: number | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | undefined;
let unreadTimer: ReturnType<typeof setTimeout> | undefined;
let unreadRequest: AbortController | undefined;

/** SSE 알림과 읽음 처리 뒤의 조회를 300ms 안에서 한 번으로 묶는다. 실패하면 표시 중인 수를 유지한다 */
export function refreshChatUnreadCount() {
  if (unreadTimer !== undefined) return;
  unreadTimer = setTimeout(async () => {
    unreadTimer = undefined;
    unreadRequest?.abort();
    const controller = new AbortController();
    unreadRequest = controller;
    try {
      const response = await fetch("/api/chats/unread", { cache: "no-store", signal: controller.signal });
      if (!response.ok) return;
      const data: { count: unknown } = await response.json();
      if (!controller.signal.aborted && typeof data.count === "number" && Number.isSafeInteger(data.count) && data.count >= 0) {
        setChatUnreadCount(data.count);
      }
    } catch { /* 다음 이벤트에서 다시 조회하며, 기존 수는 유지한다 */ }
    finally { if (unreadRequest === controller) unreadRequest = undefined; }
  }, 300);
}

export function requestChatRefresh(refresh: () => void) {
  if (refreshTimer !== undefined) return;
  refreshTimer = setTimeout(() => {
    refreshTimer = undefined;
    refresh();
  }, 300);
}

export function subscribeChatEvents(listener: (event: ChatEvent) => void) {
  listeners.add(listener);
  // 연결이 먼저 준비됐어도 뒤늦게 열린 방은 빠진 메시지를 확인한다.
  if (source?.readyState === EventSource.OPEN) listener({ type: "ready" });
  return () => { listeners.delete(listener); };
}

export function useChatEvents(listener: (event: ChatEvent) => void) {
  useEffect(() => subscribeChatEvents(listener), [listener]);
}

export function setChatUnreadCount(count: number | null) {
  unreadCount = count;
  countListeners.forEach(listener => listener());
}

function subscribeCount(listener: () => void) {
  countListeners.add(listener);
  return () => { countListeners.delete(listener); };
}

export function useChatUnreadCount(initial?: number) {
  const count = useSyncExternalStore(subscribeCount, () => unreadCount ?? initial ?? 0, () => initial ?? 0);
  return initial === undefined ? 0 : count;
}

/** 백엔드 일반 회원의 연결. CONNECTING은 브라우저에 맡기고 CLOSED만 새로 연다 */
export function connectChatEvents(onEvent: (event: ChatEvent) => void) {
  if (source) return () => {};
  let stopped = false;
  let retryDelay = 1000;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

  function openConnection() {
    if (stopped) return;
    const connection = new EventSource("/api/chats/events");
    source = connection;
    const emit = (event: ChatEvent) => {
      if (stopped || source !== connection) return;
      listeners.forEach(listener => listener(event));
      onEvent(event);
    };
    connection.addEventListener("ready", () => {
      if (stopped || source !== connection) return;
      retryDelay = 1000;
      clearTimeout(reconnectTimer);
      reconnectTimer = undefined;
      emit({ type: "ready" });
    });
    connection.addEventListener("error", () => {
      if (stopped || source !== connection || connection.readyState !== EventSource.CLOSED || reconnectTimer !== undefined) return;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = undefined;
        if (stopped) return;
        connection.close();
        openConnection();
      }, retryDelay);
      retryDelay = nextChatRetryDelay(retryDelay);
    });
    connection.addEventListener("message", (event: MessageEvent<string>) => {
      try {
        const data = JSON.parse(event.data);
        if (typeof data.roomKey === "string" && Number.isSafeInteger(data.seq)) emit({ type: "message", roomKey: data.roomKey, seq: data.seq });
      } catch { /* 잘못된 이벤트는 다음 알림 또는 ready에서 다시 맞춘다 */ }
    });
    connection.addEventListener("read", (event: MessageEvent<string>) => {
      try {
        const data = JSON.parse(event.data);
        if (typeof data.roomKey === "string" && (data.reader === "me" || data.reader === "partner") && Number.isSafeInteger(data.lastReadSeq)) {
          emit({ type: "read", roomKey: data.roomKey, reader: data.reader, lastReadSeq: data.lastReadSeq });
        }
      } catch { /* 다음 알림 또는 ready에서 다시 맞춘다 */ }
    });
  }

  openConnection();
  return () => {
    stopped = true;
    clearTimeout(reconnectTimer);
    source?.close();
    source = null;
    clearTimeout(refreshTimer);
    refreshTimer = undefined;
    clearTimeout(unreadTimer);
    unreadTimer = undefined;
    unreadRequest?.abort();
    unreadRequest = undefined;
    setChatUnreadCount(null);
  };
}
