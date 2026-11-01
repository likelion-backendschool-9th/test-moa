import { Skeleton } from "@/components/ui/Skeleton";
import type { ChatRoomData } from "../types";
import { ChatComposer } from "./ChatComposer";
import { ChatMessageList } from "./ChatMessageList";
import { ChatRoomHeader } from "./ChatRoomHeader";

/** 채팅방 본문. 머리 → 대화 내용 → 아래에 붙는 입력창 */
export function ChatRoomView({ data }: { data: ChatRoomData }) {
  const { room, messages } = data;
  return (
    <>
      <ChatRoomHeader room={room} />
      <div className="mt-10">
        <ChatMessageList room={room} messages={messages} now={new Date(data.now)} />
      </div>
      <ChatComposer roomKey={room.roomKey} lastMessageId={messages[messages.length - 1]?.id ?? null} />
    </>
  );
}

/** 머리·말풍선·입력창 모양을 그대로 본뜬 스켈레톤 */
export function ChatRoomSkeleton() {
  return (
    <div aria-busy="true" aria-label="대화방 불러오는 중" className="flex flex-1 flex-col">
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-16 rounded-xl" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="mt-10 flex flex-col gap-3">
        <Skeleton className="mx-auto h-3 w-56" />
        <Skeleton className="mt-5 h-11 w-3/5 rounded-2xl" />
        <Skeleton className="h-11 w-2/5 self-end rounded-2xl" />
        <Skeleton className="h-11 w-1/2 rounded-2xl" />
        <Skeleton className="h-11 w-1/3 self-end rounded-2xl" />
      </div>
      <div className="mt-auto pt-8 pb-4 md:pb-6">
        <Skeleton className="h-14 w-full rounded-2xl" />
      </div>
    </div>
  );
}
