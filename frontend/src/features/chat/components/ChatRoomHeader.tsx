import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { CHAT_ROLE_LABEL, type ChatRoom } from "../types";
import { ChatCardMenu } from "./ChatCardMenu";
import { ChatThumb } from "./ChatThumb";

/**
 * 채팅방 머리. 왼쪽 작은 프로젝트 이미지(4:3), 대화방 이름(h1), 그 아래 [역할 배지 + 대화 상대 닉네임 · 모집 글 링크],
 * 맨 오른쪽 더보기(채팅 카드와 같은 메뉴, 삭제하면 채팅함으로 돌아간다). 내 닉네임은 쓰지 않는다.
 * 앱 헤더 높이가 화면 폭마다 달라 위에 붙이지 않고 페이지와 함께 스크롤된다.
 */
export function ChatRoomHeader({ room }: { room: ChatRoom }) {
  const title = room.roomName ?? room.projectName;
  return (
    <header className="flex items-center gap-4">
      <ChatThumb projectName={room.projectName} imageUrl={room.projectImage} size="header" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h1 className="truncate text-2xl font-extrabold tracking-[-0.03em]">{title}</h1>
        <p className="flex min-w-0 items-center gap-2 text-sm">
          <span className="sr-only">대화 상대 </span>
          <Badge data-partner-role className="shrink-0">
            {CHAT_ROLE_LABEL[room.partner.role]}
          </Badge>{" "}
          <span data-partner className="truncate">
            {room.partner.nickname}
          </span>
          <span aria-hidden className="text-text-muted">
            ·
          </span>
          <Link
            href={`/recruitments/${room.recruitmentSlug}`}
            className="shrink-0 text-text-muted transition-colors duration-300 ease-brand hover:text-text hover:underline"
          >
            {room.projectName} 모집 글
          </Link>
        </p>
      </div>
      <ChatCardMenu roomKey={room.roomKey} title={title} leaveOnDelete className="-mr-1.5" />
    </header>
  );
}
