import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { formatChatTime, isTodayInSeoul } from "@/lib/format";
import { CHAT_ROLE_LABEL, type ChatRoom } from "../types";
import { ChatCardMenu } from "./ChatCardMenu";
import { ChatThumb } from "./ChatThumb";

/**
 * 채팅방 카드 한 장. 왼쪽은 카드 높이를 다 채우는 프로젝트 이미지, 선 없이 바로 옆에
 * [대화방 이름 … 최근 일시·더보기], [역할 배지 + 대화 상대 닉네임], [최근 메시지 미리보기] 순서다. 내 닉네임은 쓰지 않는다.
 * 대화방 이름은 회원이 바꾼 이름이 있으면 그것, 없으면 프로젝트명이다.
 * 글자는 모두 최근 메시지와 같은 크기(0.875rem)이고, 대화방 이름만 역할 탭과 같은 굵기(700)다.
 * 이름·닉네임은 먹, 메시지·일시는 흐린 먹으로 색을 나눈다.
 * 카드 전체가 채팅방 링크이고(링크의 ::after가 카드를 덮는다), 더보기 버튼은 링크 밖에 둬서 따로 누른다.
 * 더보기 메뉴가 카드 밖으로 나와야 해서 카드에 overflow-hidden을 쓰지 않고, 이미지 면이 왼쪽 모서리를 직접 둥글린다.
 * 강조색은 오늘 온 대화의 일시와 hover 때 프로젝트명에만 쓴다.
 */
export function ChatCard({ room, now }: { room: ChatRoom; now: Date }) {
  const roomHref = `/my/chats/${room.roomKey}`;
  const title = room.roomName ?? room.projectName;
  const today = isTodayInSeoul(room.lastMessageAt, now);
  return (
    <article className="group relative flex rounded-2xl bg-surface-muted">
      <ChatThumb projectName={room.projectName} imageUrl={room.projectImage} />
      <div className="flex min-w-0 flex-1 items-start gap-3 px-5 py-4 md:px-6">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="min-w-0 truncate text-sm leading-relaxed font-bold transition-colors duration-300 ease-brand group-hover:text-accent">
              <Link
                href={roomHref}
                className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-accent"
              >
                {title}
                <span className="sr-only"> 채팅방</span>
              </Link>
            </h2>
            <time
              dateTime={room.lastMessageAt}
              data-today={today || undefined}
              className={cn("flex shrink-0 items-center gap-1.5 text-xs tabular-nums", today ? "text-accent" : "text-text-muted")}
            >
              {today && <span aria-hidden className="size-1.5 rounded-full bg-accent" />}
              {formatChatTime(room.lastMessageAt, now)}
            </time>
          </div>
          <p className="flex min-w-0 items-center gap-2 text-sm">
            <span className="sr-only">대화 상대 </span>
            <Badge data-partner-role className="shrink-0">
              {CHAT_ROLE_LABEL[room.partner.role]}
            </Badge>{" "}
            <span data-partner className="truncate">
              {room.partner.nickname}
            </span>
          </p>
          <p data-preview className="line-clamp-1 text-sm leading-relaxed text-text-muted">
            {room.lastMessage}
          </p>
        </div>
        <ChatCardMenu roomKey={room.roomKey} title={title} />
      </div>
    </article>
  );
}
