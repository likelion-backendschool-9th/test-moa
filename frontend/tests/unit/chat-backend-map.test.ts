import { expect, test } from "@playwright/test";
import { isStartChatInput, toChatInboxPath, toChatMessage, toChatRoom, toChatStartFailureMessage, type ChatRoomResponse } from "@/features/chat/backend-map";

const room: ChatRoomResponse = {
  roomKey: "room-54", recruitmentId: 54, projectName: "북로그", roomName: null,
  projectImage: null, myRole: "DEVELOPER", partner: { nickname: "윤슬", role: "TESTER" },
  readOnly: false, lastMessage: "안녕하세요", lastMessageAt: "2026-11-09T01:00:00Z",
};

test("#54-S2 검색어·역할·정렬을 백엔드 조회 경로로 바꾼다", () => {
  expect(toChatInboxPath({ q: "북로그", role: "tester", sort: "oldest" })).toBe("/api/v1/chats?q=%EB%B6%81%EB%A1%9C%EA%B7%B8&role=TESTER&sort=OLDEST");
  expect(toChatInboxPath({ q: "", role: null, sort: "latest" })).toBe("/api/v1/chats?sort=LATEST");
});

test("#54-S3 역할과 선택 필드를 화면 자료로 바꾸고 시각은 그대로 둔다", () => {
  expect(toChatRoom(room)).toEqual({
    roomKey: "room-54", recruitmentSlug: null, projectName: "북로그", roomName: undefined,
    projectImage: undefined, myRole: "developer", partner: { nickname: "윤슬", role: "tester" },
    readOnly: false, lastMessage: "안녕하세요", lastMessageAt: room.lastMessageAt,
  });
  expect(toChatRoom({ ...room, myRole: "TESTER", partner: { nickname: "서재지기", role: "DEVELOPER" }, roomName: "1차", projectImage: "/project.png", readOnly: true, unreadCount: 3, partnerLastReadSeq: 7 })).toMatchObject({
    myRole: "tester", partner: { role: "developer" }, roomName: "1차", projectImage: "/project.png", readOnly: true, unreadCount: 3, partnerLastReadSeq: 7,
  });
  for (const sentAt of ["2026-11-09T01:00:00Z", "2026-11-09T10:00:00+09:00", "2026-11-09T10:00:00"]) {
    expect(toChatMessage({ seq: 7, from: "partner", text: "안녕하세요", sentAt })).toEqual({ id: "7", seq: 7, from: "partner", text: "안녕하세요", sentAt });
  }
});

test("#54-S4 메시지가 없는 방은 null을 유지한다", () => {
  expect(toChatRoom({ ...room, lastMessage: null }).lastMessage).toBeNull();
});

test("#195-S8 채팅 시작 실패를 상황에 맞는 안내로 바꾼다", () => {
  expect(toChatStartFailureMessage("SUBSCRIPTION_REQUIRED")).toBe("구독 중일 때만 새 채팅을 시작할 수 있어요");
  expect(toChatStartFailureMessage("CHAT_READ_ONLY")).toBe("모집이 끝나 새 채팅을 시작할 수 없어요");
  expect(toChatStartFailureMessage("INVALID_INPUT")).toBe("확정된 테스터와만 채팅할 수 있어요");
  expect(toChatStartFailureMessage("NOT_FOUND")).toBe("테스터 정보를 찾지 못했어요. 새로고침해 주세요");
  for (const code of ["BACKEND_UNAVAILABLE", "INTERNAL_ERROR", "UNKNOWN", ""]) {
    expect(toChatStartFailureMessage(code)).toBe("채팅을 시작하지 못했어요. 잠시 후 다시 시도해 주세요");
  }
});

test("#195-S18 참가 id가 숫자 문자열이고 돌아올 주소가 모집 관리 경로일 때만 통과한다", () => {
  expect(isStartChatInput("12", "/developer/recruitments/2")).toBe(true);
  for (const registerId of ["1a", "", 12, undefined]) {
    expect(isStartChatInput(registerId, "/developer/recruitments/2")).toBe(false);
  }
  for (const nextPath of ["/login", "//evil", "/developer/recruitments", undefined]) {
    expect(isStartChatInput("12", nextPath)).toBe(false);
  }
});
