import type { ChatQuery } from "@/features/chat/query";
import type { ChatMessage, ChatRole, ChatRoom } from "@/features/chat/types";

type BackendRole = "DEVELOPER" | "TESTER";

/** 백엔드 방 응답. 채팅방 상세에는 최근 메시지가 없다 */
export type ChatRoomResponse = {
  roomKey: string;
  recruitmentId: number;
  projectName: string;
  roomName: string | null;
  projectImage: string | null;
  myRole: BackendRole;
  partner: { nickname: string; role: BackendRole };
  readOnly: boolean;
  unreadCount?: number;
  partnerLastReadSeq?: number;
  lastMessage?: string | null;
  lastMessageAt?: string;
};

export type ChatMessageResponse = {
  seq: number;
  from: "me" | "partner";
  text: string;
  sentAt: string;
};

const roles: Record<BackendRole, ChatRole> = { DEVELOPER: "developer", TESTER: "tester" };

export function toChatInboxPath(query: ChatQuery) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.role) params.set("role", query.role.toUpperCase());
  params.set("sort", query.sort.toUpperCase());
  return `/api/v1/chats?${params}`;
}

export function toChatRoom(room: ChatRoomResponse): ChatRoom {
  return {
    roomKey: room.roomKey,
    recruitmentSlug: null,
    projectName: room.projectName,
    roomName: room.roomName ?? undefined,
    projectImage: room.projectImage ?? undefined,
    myRole: roles[room.myRole],
    partner: { nickname: room.partner.nickname, role: roles[room.partner.role] },
    readOnly: room.readOnly,
    ...(room.unreadCount !== undefined && { unreadCount: room.unreadCount }),
    ...(room.partnerLastReadSeq !== undefined && { partnerLastReadSeq: room.partnerLastReadSeq }),
    lastMessage: room.lastMessage ?? null,
    lastMessageAt: room.lastMessageAt ?? "",
  };
}

/** 응답 시각 문자열에는 시간대를 덧붙이지 않는다(#193) */
export function toChatMessage(message: ChatMessageResponse): ChatMessage {
  return { ...message, id: String(message.seq) };
}
