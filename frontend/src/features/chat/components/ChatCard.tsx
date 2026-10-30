import Link from "next/link";
import { formatChatTime } from "@/lib/format";
import type { ChatRoom } from "../types";
import { ChatCardMenu } from "./ChatCardMenu";
import { ChatThumb } from "./ChatThumb";

/**
 * 채팅방 카드 한 장. 프로젝트 사진, 프로젝트명, 최근 일시, 요청자·응답자, 최근 메시지 미리보기, 더보기 버튼 순서다.
 * 카드 전체가 채팅방 링크이고(링크의 ::after가 카드를 덮는다), 더보기 버튼은 링크 밖에 둬서 따로 누른다.
 */
export function ChatCard({ room, now }: { room: ChatRoom; now: Date }) {
  const roomHref = `/my/chats/${room.roomKey}`;
  return (
    <article className="group relative flex items-start gap-4 rounded-2xl bg-surface-muted p-4 md:p-5">
      <ChatThumb projectName={room.projectName} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="min-w-0 truncate text-base font-extrabold">
            <Link
              href={roomHref}
              className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-accent"
            >
              {room.projectName}
              <span className="sr-only"> 채팅방</span>
            </Link>
          </h2>
          <time dateTime={room.lastMessageAt} className="shrink-0 text-xs text-text-muted tabular-nums">
            {formatChatTime(room.lastMessageAt, now)}
          </time>
        </div>
        <dl className="flex flex-wrap gap-x-3 text-sm">
          <div className="flex gap-1.5">
            <dt className="text-text-muted">요청자</dt>
            <dd className="font-semibold">{room.requester}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-text-muted">응답자</dt>
            <dd className="font-semibold">{room.responder}</dd>
          </div>
        </dl>
        <p className="mt-1 line-clamp-1 text-sm text-text-muted">{room.lastMessage}</p>
      </div>
      <ChatCardMenu projectName={room.projectName} roomHref={roomHref} recruitmentHref={`/recruitments/${room.recruitmentSlug}`} />
    </article>
  );
}
