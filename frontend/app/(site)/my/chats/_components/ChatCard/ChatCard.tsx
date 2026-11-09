import Link from "next/link";
import { Badge } from "@/components/ui/Badge/Badge";
import { cn } from "@/lib/cn";
import { formatChatTime, isTodayInSeoul } from "@/lib/format";
import type { ChatRoom } from "@/features/chat/types";
import { ChatCardMenu } from "@/features/chat/components/ChatCardMenu/ChatCardMenu";
import { ChatRoleBadge } from "@/features/chat/components/ChatRoleBadge/ChatRoleBadge";
import { ChatThumb } from "@/features/chat/components/ChatThumb/ChatThumb";
import { Card } from "@/components/ui/Card/Card";
import styles from "./ChatCard.module.css";

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
export function ChatCard({ room, now, eager = false }: { room: ChatRoom; now: Date; eager?: boolean }) {
  const roomHref = `/my/chats/${room.roomKey}`;
  const title = room.roomName ?? room.projectName;
  const today = isTodayInSeoul(room.lastMessageAt, now);
  return (
    <Card as="article" data-hover-card className={styles.root}>
      <ChatThumb projectName={room.projectName} imageUrl={room.projectImage} eager={eager} />
      <div className={styles.box}>
        <div className={styles.box2}>
          <div className={styles.box3}>
            <h2 className={styles.title}>
              <Link
                href={roomHref}
                className={styles.link}
              >
                {title}
                <span className={styles.srOnly}> 채팅방</span>
              </Link>
            </h2>
            <time
              dateTime={room.lastMessageAt}
              data-today={today || undefined}
              className={cn(styles.today, today ? styles.todayToday : styles.todayNotToday)}
            >
              {today && <span aria-hidden className={styles.label} />}
              {formatChatTime(room.lastMessageAt, now)}
            </time>
          </div>
          <p className={styles.text}>
            <span className={styles.srOnly2}>대화 상대 </span>
            {room.readOnly && <><Badge tone="muted">종료</Badge>{" "}</>}
            <ChatRoleBadge role={room.partner.role} />{" "}
            <span data-partner className={styles.partner}>
              {room.partner.nickname}
            </span>
          </p>
          <p data-preview className={styles.preview}>
            {room.lastMessage ?? "아직 대화가 없어요"}
          </p>
        </div>
        <ChatCardMenu roomKey={room.roomKey} title={title} className={styles.chatCardMenu} />
      </div>
    </Card>
  );
}
