import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getDemoDataMode } from "@/lib/demo";
import { getSession } from "@/lib/session";
import { buildChatRooms } from "./mock";
import { CHATS_PATH, type ChatQuery } from "./query";
import { CHAT_ROOM_NAME_MAX, type ChatInboxData, type ChatRoom } from "./types";

/*
 * 채팅 데이터 접근. 지금은 목업을 돌려준다.
 * 실제 API를 붙일 때는 이 파일의 함수 본문만 바꾸고 시그니처는 유지한다.
 */

const SLOW_DELAY_MS = 1500;

/* 시연용으로 대화방 이름 변경·삭제를 브라우저 세션 쿠키에 저장한다. 브라우저를 닫으면 처음 상태로 돌아간다 */
const CHAT_STATE_COOKIE = "demo-chat";

type ChatOverrides = {
  /** 삭제한 대화방 */
  hidden: string[];
  /** 바꾼 대화방 이름 */
  names: Record<string, string>;
};

const byLatest = (a: ChatRoom, b: ChatRoom) => b.lastMessageAt.localeCompare(a.lastMessageAt);
const byOldest = (a: ChatRoom, b: ChatRoom) => a.lastMessageAt.localeCompare(b.lastMessageAt);

async function readOverrides(): Promise<ChatOverrides> {
  const raw = (await cookies()).get(CHAT_STATE_COOKIE)?.value;
  if (!raw) return { hidden: [], names: {} };
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(raw));
    const value = (parsed ?? {}) as Partial<Record<keyof ChatOverrides, unknown>>;
    const hidden = Array.isArray(value.hidden) ? value.hidden.filter((key): key is string => typeof key === "string") : [];
    const names = Object.fromEntries(
      Object.entries(value.names && typeof value.names === "object" ? value.names : {}).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    );
    return { hidden, names };
  } catch {
    return { hidden: [], names: {} };
  }
}

async function writeOverrides(overrides: ChatOverrides) {
  (await cookies()).set(CHAT_STATE_COOKIE, encodeURIComponent(JSON.stringify(overrides)), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });
}

/** 로그인한 회원의 대화방 중 roomKey가 있으면 그 회원 역할을, 아니면 null */
async function findMemberRoom(roomKey: string) {
  const session = await getSession();
  if (session.role === "guest") return null;
  return buildChatRooms(session.role, new Date()).some((room) => room.roomKey === roomKey) ? session.role : null;
}

/** 로그인한 회원이 들어가 있는 채팅방을 검색 조건으로 거른다. 비로그인이면 로그인으로 보낸다 */
export async function getChatInbox(query: ChatQuery): Promise<ChatInboxData> {
  const session = await getSession();
  if (session.role === "guest") redirect(`/login?next=${encodeURIComponent(CHATS_PATH)}`);
  const mode = await getDemoDataMode();
  const overrides = await readOverrides();
  if (mode === "slow") await new Promise((resolve) => setTimeout(resolve, SLOW_DELAY_MS));
  /* 최근 일시는 요청 시각 기준이라 미리 렌더링하지 않는다 */
  await connection();
  const now = new Date();
  const all = (mode === "empty" ? [] : buildChatRooms(session.role, now))
    .filter((room) => !overrides.hidden.includes(room.roomKey))
    .map((room) => (overrides.names[room.roomKey] ? { ...room, roomName: overrides.names[room.roomKey] } : room));
  const keyword = query.q.toLowerCase();
  const searched = all.filter(
    (room) =>
      !keyword ||
      [room.roomName ?? "", room.projectName, room.partner.nickname].some((text) => text.toLowerCase().includes(keyword)),
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

/** 대화방 이름을 바꾼다. 앞뒤 공백을 빼고 최대 글자 수까지 자르며, 빈 이름은 무시한다 */
export async function renameChatRoom(roomKey: string, name: string) {
  const trimmed = name.trim().slice(0, CHAT_ROOM_NAME_MAX);
  if (!trimmed || !(await findMemberRoom(roomKey))) return;
  const overrides = await readOverrides();
  await writeOverrides({ ...overrides, names: { ...overrides.names, [roomKey]: trimmed } });
}

/** 대화방을 채팅함에서 지운다 */
export async function deleteChatRoom(roomKey: string) {
  if (!(await findMemberRoom(roomKey))) return;
  const overrides = await readOverrides();
  await writeOverrides({ ...overrides, hidden: [...new Set([...overrides.hidden, roomKey])] });
}
