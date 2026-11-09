"use client";

import { Button } from "@/components/ui/Button/Button";
import type { ChatRoomData } from "@/features/chat/types";
import { ChatComposer } from "../ChatComposer/ChatComposer";
import { ChatMessageList } from "../ChatMessageList/ChatMessageList";
import { useChatConversation } from "./hook";

/** 이전 대화와 새로 저장한 메시지를 함께 유지한다 */
export function ChatConversation({ data, className }: { data: ChatRoomData; className: string }) {
  const { messages, readOnly, loading, failed, hasMore, sentinelRef, listRef, loadPrevious, onSent } = useChatConversation(data);
  const last = messages[messages.length - 1];
  return (
    <>
      <div className={className} ref={listRef}>
        {hasMore && <div ref={sentinelRef} aria-hidden />}
        {loading && <p role="status">이전 메시지를 불러오는 중이에요.</p>}
        {failed && (
          <div role="alert">
            <p>이전 메시지를 불러오지 못했어요.</p>
            <Button type="button" variant="secondary" onClick={loadPrevious} disabled={loading}>다시 시도</Button>
          </div>
        )}
        <ChatMessageList room={data.room} messages={messages} now={new Date(data.now)} />
      </div>
      <ChatComposer roomKey={data.room.roomKey} lastMessage={last ?? null} now={data.now} readOnly={readOnly} onSent={onSent} />
    </>
  );
}
