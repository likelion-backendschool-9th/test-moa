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

/** 참가 id는 숫자 문자열, 돌아올 주소는 모집 관리 경로일 때만 채팅을 시작한다 */
export function isStartChatInput(registerId: unknown, nextPath: unknown): boolean {
  return typeof registerId === "string" && /^\d+$/.test(registerId)
    && typeof nextPath === "string" && nextPath.startsWith("/developer/recruitments/");
}

/** 채팅을 여는 상황에 맞춰 백엔드 실패를 안내한다 */
export function toChatStartFailureMessage(code: string): string {
  switch (code) {
    case "SUBSCRIPTION_REQUIRED": return "구독 중일 때만 새 채팅을 시작할 수 있어요";
    case "CHAT_READ_ONLY": return "모집이 끝나 새 채팅을 시작할 수 없어요";
    case "INVALID_INPUT": return "확정된 테스터와만 채팅할 수 있어요";
    case "NOT_FOUND": return "테스터 정보를 찾지 못했어요. 새로고침해 주세요";
    default: return "채팅을 시작하지 못했어요. 잠시 후 다시 시도해 주세요";
  }
}

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
