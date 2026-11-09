"use client";

import { useEffect } from "react";
import { connectChatEvents, refreshChatUnreadCount, setChatUnreadCount } from "./hook";

/** 백엔드 모드의 로그인 일반 회원만 탭마다 하나 연결한다. 목업에서는 이 컴포넌트를 그리지 않는다 */
export function ChatEvents({ unreadCount }: { unreadCount: number }) {
  useEffect(() => { setChatUnreadCount(unreadCount); }, [unreadCount]);
  useEffect(() => connectChatEvents(refreshChatUnreadCount), []);
  return null;
}
