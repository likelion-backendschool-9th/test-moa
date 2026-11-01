"use server";

import { redirect } from "next/navigation";
import { deleteChatRoom, renameChatRoom, sendChatMessage } from "./api";
import { CHATS_PATH } from "./query";

/*
 * 채팅의 서버 액션. 데이터 계층(api.ts)만 부른다.
 * 쿠키를 바꾸면 Next가 현재 페이지를 서버에서 다시 그려 목록·탭 수·대화 내용에 바로 반영된다.
 */

export async function renameChatRoomAction(roomKey: string, name: string) {
  if (typeof roomKey !== "string" || typeof name !== "string") return;
  await renameChatRoom(roomKey, name);
}

/** leave가 true면(채팅방 안에서 지웠을 때) 지운 뒤 채팅함으로 보낸다. 사라진 방을 다시 그리지 않기 위해서다 */
export async function deleteChatRoomAction(roomKey: string, leave = false) {
  if (typeof roomKey !== "string") return;
  await deleteChatRoom(roomKey);
  if (leave === true) redirect(CHATS_PATH);
}

export async function sendChatMessageAction(roomKey: string, text: string) {
  if (typeof roomKey !== "string" || typeof text !== "string") return;
  await sendChatMessage(roomKey, text);
}
