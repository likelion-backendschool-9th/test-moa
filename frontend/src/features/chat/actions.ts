"use server";

import { deleteChatRoom, renameChatRoom } from "./api";

/*
 * 채팅함의 서버 액션. 데이터 계층(api.ts)만 부른다.
 * 쿠키를 바꾸면 Next가 현재 페이지를 서버에서 다시 그려 목록·탭 수·검색 결과에 바로 반영된다.
 */

export async function renameChatRoomAction(roomKey: string, name: string) {
  if (typeof roomKey !== "string" || typeof name !== "string") return;
  await renameChatRoom(roomKey, name);
}

export async function deleteChatRoomAction(roomKey: string) {
  if (typeof roomKey !== "string") return;
  await deleteChatRoom(roomKey);
}
