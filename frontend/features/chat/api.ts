import {
  applyMemberState,
  buildChatThreads,
  chatMemberNickname,
  firstSentAt,
  readOverrides,
  readSent,
  writeOverrides,
  writeSent,
} from "@/demo/chat";
import { getDemoDataMode } from "@/demo/mode";
import { CHATS_PATH, type ChatQuery } from "@/features/chat/query";
import {
  CHAT_MESSAGE_MAX,
  CHAT_ROOM_NAME_MAX,
  type ChatInboxData,
  type ChatRoom,
  type ChatRoomData,
} from "@/features/chat/types";
import { getSession, type Role } from "@/features/session/session";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import "server-only";

/*
 * 채팅 데이터 접근. 지금은 목업을 돌려준다.
 * 실제 API를 붙일 때는 이 파일의 함수 본문만 바꾸고 시그니처는 유지한다.
 */

const SLOW_DELAY_MS = 1500;

/** 채팅방이 있을 수 있는 로그인 회원 */
type Member = Exclude<Role, "guest">;

const byLatest = (a: ChatRoom, b: ChatRoom) => b.lastMessageAt.localeCompare(a.lastMessageAt);
const byOldest = (a: ChatRoom, b: ChatRoom) => a.lastMessageAt.localeCompare(b.lastMessageAt);

/**
 * 로그인한 회원의 대화방과 대화 기록. 비로그인이면 nextPath로 돌아오는 로그인으로 보낸다.
 * 시연용 데이터 상황(empty·slow)과 쿠키에 저장한 이름 변경·삭제·보낸 메시지를 반영한다.
 */
async function loadMemberThreads(nextPath: string) {
  const session = await getSession();
  if (session.role === "guest") redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  const mode = await getDemoDataMode();
  const [overrides, sent] = await Promise.all([readOverrides(session.role), readSent()]);
  if (mode === "slow") await new Promise((resolve) => setTimeout(resolve, SLOW_DELAY_MS));
  /* 일시는 요청 시각 기준이라 미리 렌더링하지 않는다 */
  await connection();
  const now = new Date();
  const threads = mode === "empty" ? [] : buildChatThreads(session.role, now, firstSentAt(sent));
  return { threads: applyMemberState(threads, overrides, sent, chatMemberNickname(session.role)), now };
}

/** 로그인한 회원이 들어가 있고 삭제하지 않은 대화방이면 그 회원, 아니면 null */
async function roomMember(roomKey: string): Promise<Member | null> {
  const { role } = await getSession();
  if (role === "guest") return null;
  const { hidden } = await readOverrides(role);
  const joined = !hidden.includes(roomKey) && buildChatThreads(role, new Date()).some(({ room }) => room.roomKey === roomKey);
  return joined ? role : null;
}

/** 로그인한 회원이 들어가 있는 채팅방을 검색 조건으로 거른다. 비로그인이면 로그인으로 보낸다 */
export async function getChatInbox(query: ChatQuery): Promise<ChatInboxData> {
  const { threads, now } = await loadMemberThreads(CHATS_PATH);
  const all = threads.map(({ room }) => room);
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

/** 채팅방 하나와 대화 기록. 비로그인이면 로그인으로, 없거나 삭제했거나 내가 없는 방이면 404로 보낸다 */
export async function getChatRoom(roomKey: string): Promise<ChatRoomData> {
  const { threads, now } = await loadMemberThreads(`${CHATS_PATH}/${roomKey}`);
  const thread = threads.find(({ room }) => room.roomKey === roomKey);
  if (!thread) notFound();
  return { ...thread, now: now.toISOString() };
}

/** 문서 제목에 쓸 대화방 이름. 열 수 없는 방이면 null */
export async function getChatRoomTitle(roomKey: string): Promise<string | null> {
  const session = await getSession();
  if (session.role === "guest" || (await getDemoDataMode()) === "empty") return null;
  const { hidden, names } = await readOverrides(session.role);
  if (hidden.includes(roomKey)) return null;
  await connection();
  const thread = buildChatThreads(session.role, new Date()).find(({ room }) => room.roomKey === roomKey);
  return thread ? (names[roomKey] ?? thread.room.projectName) : null;
}

/** 대화방 이름을 바꾼다. 앞뒤 공백을 빼고 최대 글자 수까지 자르며, 빈 이름은 무시한다 */
export async function renameChatRoom(roomKey: string, name: string) {
  const trimmed = name.trim().slice(0, CHAT_ROOM_NAME_MAX);
  const member = trimmed ? await roomMember(roomKey) : null;
  if (!member) return;
  const overrides = await readOverrides(member);
  await writeOverrides(member, { ...overrides, names: { ...overrides.names, [roomKey]: trimmed } });
}

/** 대화방을 내 채팅함에서 지운다. 상대의 채팅함에는 그대로 있다 */
export async function deleteChatRoom(roomKey: string) {
  const member = await roomMember(roomKey);
  if (!member) return;
  const overrides = await readOverrides(member);
  await writeOverrides(member, { ...overrides, hidden: [...new Set([...overrides.hidden, roomKey])] });
}

/** 메시지를 보낸다. 앞뒤 공백을 빼고 최대 글자 수까지 자르며(가운데 줄바꿈은 둔다), 빈 메시지는 무시한다 */
export async function sendChatMessage(roomKey: string, text: string) {
  const trimmed = text.trim().slice(0, CHAT_MESSAGE_MAX);
  const member = trimmed ? await roomMember(roomKey) : null;
  const sender = member && chatMemberNickname(member);
  if (!sender) return;
  const sent = await readSent();
  await writeSent([...sent, { roomKey, sender, text: trimmed, sentAt: new Date().toISOString() }]);
}
