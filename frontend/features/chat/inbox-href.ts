import { useSyncExternalStore } from "react";
import { CHATS_PATH } from "@/features/chat/query";

/*
 * 마지막으로 본 채팅함 주소(검색·역할·정렬 포함). 채팅방의 "채팅함" 링크가 이 주소로 돌아가서, 채팅함에서 고른 조건이 풀리지 않게 한다.
 * 이 브라우저 탭 안에서만 기억한다. 서버 렌더링과 처음 그릴 때는 조건 없는 채팅함이다. 클라이언트 컴포넌트에서만 쓴다.
 */
let lastHref = CHATS_PATH;
const listeners = new Set<() => void>();

export function rememberInboxHref(href: string) {
  if (href === lastHref) return;
  lastHref = href;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useInboxHref() {
  return useSyncExternalStore(
    subscribe,
    () => lastHref,
    () => CHATS_PATH,
  );
}
