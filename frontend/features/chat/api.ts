import "server-only";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { getDemoDataMode } from "@/demo/mode";
import { getSession, type Role } from "@/features/session/session";
import { buildChatThreads, chatMemberNickname, type ChatThreadSeed } from "@/features/chat/mock";
import { CHATS_PATH, type ChatQuery } from "@/features/chat/query";
import {
  CHAT_MESSAGE_MAX,
  CHAT_ROOM_NAME_MAX,
  type ChatInboxData,
  type ChatMessage,
  type ChatRoom,
  type ChatRoomData,
} from "@/features/chat/types";

/*
 * 채팅 데이터 접근. 지금은 목업을 돌려준다.
 * 실제 API를 붙일 때는 이 파일의 함수 본문만 바꾸고 시그니처는 유지한다.
 */

const SLOW_DELAY_MS = 1500;

/*
 * 시연용으로 대화방 이름 변경·삭제와 보낸 메시지를 브라우저 세션 쿠키에 저장한다. 브라우저를 닫으면 처음 상태로 돌아간다.
 * 이름 변경·삭제는 내 채팅함에만 적용되므로 회원마다 쿠키를 따로 둔다("demo-chat-tester" 꼴).
 * 보낸 메시지는 같은 방의 두 회원이 함께 보므로 쿠키 하나에 두고, 보낸 회원을 같이 담아 보는 회원 기준으로 나·상대를 나눈다.
 */
const CHAT_STATE_COOKIE = "demo-chat";
const CHAT_SENT_COOKIE = "demo-chat-sent";
/* 쿠키 한 개는 약 4KB까지라, 보낸 메시지 쿠키 값이 이 길이를 넘으면 오래된 것부터 지운다 */
const CHAT_SENT_COOKIE_MAX = 3600;

const COOKIE_OPTIONS = { path: "/", httpOnly: true, sameSite: "lax" } as const;

type ChatOverrides = {
  /** 삭제한 대화방 */
  hidden: string[];
  /** 바꾼 대화방 이름 */
  names: Record<string, string>;
};

/** 회원이 보낸 메시지 한 건. sender는 보낸 회원의 닉네임이다 */
type SentMessage = { roomKey: string; sender: string; text: string; sentAt: string };

/** 채팅방이 있을 수 있는 로그인 회원 */
type Member = Exclude<Role, "guest">;

const byLatest = (a: ChatRoom, b: ChatRoom) => b.lastMessageAt.localeCompare(a.lastMessageAt);
const byOldest = (a: ChatRoom, b: ChatRoom) => a.lastMessageAt.localeCompare(b.lastMessageAt);

const stateCookieName = (member: Member) => `${CHAT_STATE_COOKIE}-${member}`;

async function readOverrides(member: Member): Promise<ChatOverrides> {
  const raw = (await cookies()).get(stateCookieName(member))?.value;
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

async function writeOverrides(member: Member, overrides: ChatOverrides) {
  (await cookies()).set(stateCookieName(member), encodeURIComponent(JSON.stringify(overrides)), COOKIE_OPTIONS);
}

/* 보낸 회원이 없는 예전 형식의 메시지는 누가 보냈는지 알 수 없어 버린다 */
function isSentMessage(value: unknown): value is SentMessage {
  const item = value as Partial<Record<keyof SentMessage, unknown>> | null;
  return (
    typeof item?.roomKey === "string" &&
    typeof item.sender === "string" &&
    typeof item.text === "string" &&
    typeof item.sentAt === "string" &&
    !Number.isNaN(Date.parse(item.sentAt))
  );
}

/* 한글은 encodeURIComponent로 한 글자에 9자가 되어 base64url(4자)로 담는다 */
const encodeSent = (list: SentMessage[]) => Buffer.from(JSON.stringify(list)).toString("base64url");

async function readSent(): Promise<SentMessage[]> {
  const raw = (await cookies()).get(CHAT_SENT_COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    return Array.isArray(parsed) ? parsed.filter(isSentMessage) : [];
  } catch {
    return [];
  }
}

async function writeSent(list: SentMessage[]) {
  let kept = list;
  while (kept.length > 1 && encodeSent(kept).length > CHAT_SENT_COOKIE_MAX) kept = kept.slice(1);
  (await cookies()).set(CHAT_SENT_COOKIE, encodeSent(kept), COOKIE_OPTIONS);
}

/** 방마다 처음 보낸 메시지의 시각. 목업 대화 기록을 이 시각 기준으로 계산한다 */
function firstSentAt(sent: SentMessage[]) {
  const anchors: Record<string, string> = {};
  for (const message of sent) anchors[message.roomKey] ??= message.sentAt;
  return anchors;
}

/** 목업 대화방에 바꾼 이름, 보낸 메시지를 입힌다. 보낸 메시지는 보는 회원(me)이 보냈으면 나, 아니면 상대다. 삭제한 방은 뺀다 */
function applyMemberState(
  threads: ChatThreadSeed[],
  overrides: ChatOverrides,
  sent: SentMessage[],
  me: string | null,
): ChatThreadSeed[] {
  return threads
    .filter(({ room }) => !overrides.hidden.includes(room.roomKey))
    .map(({ room, messages }) => {
      const added = sent
        .filter((message) => message.roomKey === room.roomKey)
        .map(
          ({ sender, text, sentAt }, index): ChatMessage => ({
            id: `${room.roomKey}-sent-${index + 1}`,
            from: sender === me ? "me" : "partner",
            text,
            sentAt,
          }),
        );
      const all = [...messages, ...added];
      const last = all[all.length - 1];
      const name = overrides.names[room.roomKey];
      return {
        room: { ...room, ...(name && { roomName: name }), lastMessage: last.text, lastMessageAt: last.sentAt },
        messages: all,
      };
    });
}

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
