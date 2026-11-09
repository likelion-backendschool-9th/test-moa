"use server";

import { revalidatePath } from "next/cache";
import { isBackendAuth } from "@/lib/backend";
import { redirect } from "next/navigation";
import { deleteChatRoom, renameChatRoom, sendChatMessage, markChatRead } from "@/features/chat/api";
import { CHATS_PATH } from "@/features/chat/query";

/*
 * 채팅의 서버 액션. 데이터 계층(api.ts)만 부른다.
 * 쿠키를 바꾸면 Next가 현재 페이지를 서버에서 다시 그려 목록·탭 수·대화 내용에 바로 반영된다.
 */

export async function renameChatRoomAction(roomKey: string, name: string) {
  if (typeof roomKey !== "string" || typeof name !== "string") return { ok: false };
  const result = await renameChatRoom(roomKey, name);
  if (!result.ok) return result;
  if (isBackendAuth) {
    revalidatePath(CHATS_PATH);
    revalidatePath(`${CHATS_PATH}/${roomKey}`);
  }
  return result;
}

/** leave가 true면(채팅방 안에서 지웠을 때) 지운 뒤 채팅함으로 보낸다. 사라진 방을 다시 그리지 않기 위해서다 */
export async function deleteChatRoomAction(roomKey: string, leave = false) {
  if (typeof roomKey !== "string") return { ok: false };
  const result = await deleteChatRoom(roomKey);
  if (!result.ok) return result;
  if (isBackendAuth) revalidatePath(CHATS_PATH);
  if (leave === true) redirect(CHATS_PATH);
  return result;
}

export async function sendChatMessageAction(roomKey: string, text: string) {
  if (typeof roomKey !== "string" || typeof text !== "string") return;
  const result = await sendChatMessage(roomKey, text);
  if (isBackendAuth && result) revalidatePath(CHATS_PATH);
  return result;
}

export async function markChatReadAction(roomKey: string, seq: number) {
  if (typeof roomKey !== "string" || !Number.isSafeInteger(seq) || seq < 0) return { ok: false as const, status: 400 };
  return markChatRead(roomKey, seq);
}
