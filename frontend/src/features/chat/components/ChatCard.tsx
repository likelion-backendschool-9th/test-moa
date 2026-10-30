import Link from "next/link";
import { cn } from "@/lib/cn";
import { formatChatTime, isTodayInSeoul } from "@/lib/format";
import type { ChatRoom } from "../types";
import { ChatCardMenu } from "./ChatCardMenu";
import { ChatThumb } from "./ChatThumb";

/**
 * 채팅방 카드 한 장. 프로젝트 사진, 프로젝트명, 최근 일시, "요청자 | 응답자", 최근 메시지 미리보기, 더보기 버튼 순서다.
 * 카드 전체가 채팅방 링크이고(링크의 ::after가 카드를 덮는다), 더보기 버튼은 링크 밖에 둬서 따로 누른다.
 * 강조색은 오늘 온 대화의 일시와 hover 때 프로젝트명에만 쓴다.
 */
export function ChatCard({ room, now }: { room: ChatRoom; now: Date }) {
  const roomHref = `/my/chats/${room.roomKey}`;
  const today = isTodayInSeoul(room.lastMessageAt, now);
  return (
    <article className="group relative flex items-start gap-4 rounded-2xl bg-surface-muted p-5 sm:gap-5 md:p-6">
      <ChatThumb projectName={room.projectName} />
      <div className="flex min-w-0 flex-1 flex-col gap-2 pt-0.5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="min-w-0 truncate text-lg font-extrabold transition-colors duration-300 ease-brand group-hover:text-accent">
            <Link
              href={roomHref}
              className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-accent"
            >
              {room.projectName}
              <span className="sr-only"> 채팅방</span>
            </Link>
          </h2>
          <time
            dateTime={room.lastMessageAt}
            data-today={today || undefined}
            className={cn("flex shrink-0 items-center gap-1.5 text-xs tabular-nums", today ? "font-bold text-accent" : "text-text-muted")}
          >
            {today && <span aria-hidden className="size-1.5 rounded-full bg-accent" />}
            {formatChatTime(room.lastMessageAt, now)}
          </time>
        </div>
        {/* 화면에는 "요청자 | 응답자" 닉네임만 보이고, 보조 기술에는 역할 이름을 함께 읽힌다 */}
        <p className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          <span data-role="requester" className="truncate">
            <span className="sr-only">요청자 </span>
            {room.requester}
          </span>
          <span aria-hidden className="text-text-muted opacity-50">
            |
          </span>
          <span data-role="responder" className="truncate">
            <span className="sr-only">응답자 </span>
            {room.responder}
          </span>
        </p>
        <p data-preview className="mt-1 line-clamp-1 text-sm leading-relaxed text-text-muted">
          {room.lastMessage}
        </p>
      </div>
      <ChatCardMenu projectName={room.projectName} roomHref={roomHref} recruitmentHref={`/recruitments/${room.recruitmentSlug}`} />
    </article>
  );
}
