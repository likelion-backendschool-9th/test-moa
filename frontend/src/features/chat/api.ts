import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getDemoDataMode } from "@/lib/demo";
import { getSession } from "@/lib/session";
import { buildChatRooms } from "./mock";
import { CHATS_PATH, type ChatQuery } from "./query";
import type { ChatInboxData, ChatRoom } from "./types";

/*
 * 채팅 데이터 접근. 지금은 목업을 돌려준다.
 * 실제 API를 붙일 때는 이 파일의 함수 본문만 바꾸고 시그니처는 유지한다.
 */

const SLOW_DELAY_MS = 1500;

const byLatest = (a: ChatRoom, b: ChatRoom) => b.lastMessageAt.localeCompare(a.lastMessageAt);
const byOldest = (a: ChatRoom, b: ChatRoom) => a.lastMessageAt.localeCompare(b.lastMessageAt);

/** 로그인한 회원이 들어가 있는 채팅방을 검색 조건으로 거른다. 비로그인이면 로그인으로 보낸다 */
export async function getChatInbox(query: ChatQuery): Promise<ChatInboxData> {
  const session = await getSession();
  if (session.role === "guest") redirect(`/login?next=${encodeURIComponent(CHATS_PATH)}`);
  const mode = await getDemoDataMode();
  if (mode === "slow") await new Promise((resolve) => setTimeout(resolve, SLOW_DELAY_MS));
  /* 최근 일시는 요청 시각 기준이라 미리 렌더링하지 않는다 */
  await connection();
  const now = new Date();
  const all = mode === "empty" ? [] : buildChatRooms(session.role, now);
  const keyword = query.q.toLowerCase();
  const searched = all.filter(
    (room) => !keyword || [room.projectName, room.partner.nickname].some((text) => text.toLowerCase().includes(keyword)),
  );
  const rooms = searched.filter((room) => !query.role || room.myRole === query.role).sort(query.sort === "oldest" ? byOldest : byLatest);
  return {
    rooms,
    total: all.length,
    counts: {
      all: searched.length,
      tester: searched.filter((room) => room.myRole === "tester").length,
      developer: searched.filter((room) => room.myRole === "developer").length,
    },
    now: now.toISOString(),
  };
}
