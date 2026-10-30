import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getDemoDataMode } from "@/lib/demo";
import { getSession } from "@/lib/session";
import { buildChatRooms } from "./mock";
import { CHATS_PATH, type ChatQuery } from "./query";
import type { ChatInboxData, ChatProjectOption, ChatRoom } from "./types";

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
  const rooms = all
    .filter((room) => !query.project || room.recruitmentSlug === query.project)
    .filter((room) => !keyword || [room.projectName, room.requester, room.responder].some((text) => text.toLowerCase().includes(keyword)))
    .sort(query.sort === "oldest" ? byOldest : byLatest);
  return { rooms, total: all.length, projects: toProjectOptions(all), now: now.toISOString() };
}

/** 프로젝트별 드롭다운 항목. 프로젝트 이름 가나다순이고 프로젝트마다 채팅방 수를 센다 */
function toProjectOptions(rooms: ChatRoom[]): ChatProjectOption[] {
  const options = new Map<string, ChatProjectOption>();
  for (const room of rooms) {
    const option = options.get(room.recruitmentSlug) ?? { slug: room.recruitmentSlug, name: room.projectName, count: 0 };
    options.set(room.recruitmentSlug, { ...option, count: option.count + 1 });
  }
  return [...options.values()].sort((a, b) => a.name.localeCompare(b.name, "ko"));
}
