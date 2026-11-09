import { expect, test } from "@playwright/test";
import { toChatInboxPath, toChatMessage, toChatRoom, type ChatRoomResponse } from "@/features/chat/backend-map";

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
