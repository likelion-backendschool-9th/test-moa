import Link from "next/link";
import type { ChatRoom } from "@/features/chat/types";
import { ChatCardMenu } from "@/features/chat/components/ChatCardMenu/ChatCardMenu";
import { ChatRoleBadge } from "@/features/chat/components/ChatRoleBadge/ChatRoleBadge";
import { ChatThumb } from "@/features/chat/components/ChatThumb/ChatThumb";
import styles from "./ChatRoomHeader.module.css";

/**
 * 채팅방 머리. 왼쪽 작은 프로젝트 이미지(4:3), 대화방 이름(h1), 그 아래 [역할 배지 + 대화 상대 닉네임 · 모집 글 링크],
 * 맨 오른쪽 더보기(채팅 카드와 같은 메뉴, 삭제하면 채팅함으로 돌아간다). 내 닉네임은 쓰지 않는다.
 * 앱 헤더 높이가 화면 폭마다 달라 위에 붙이지 않고 페이지와 함께 스크롤된다.
 */
export function ChatRoomHeader({ room }: { room: ChatRoom }) {
  const title = room.roomName ?? room.projectName;
  return (
    <header className={styles.root}>
      <ChatThumb projectName={room.projectName} imageUrl={room.projectImage} size="header" />
      <div className={styles.box}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.text}>
          <span className={styles.srOnly}>대화 상대 </span>
          <ChatRoleBadge role={room.partner.role} />{" "}
          <span data-partner className={styles.partner}>
            {room.partner.nickname}
          </span>
          <span aria-hidden className={styles.label}>
            ·
          </span>
          <Link
            href={`/recruitments/${room.recruitmentSlug}`}
            className={styles.link}
          >
            {room.projectName} 모집 글
          </Link>
        </p>
      </div>
      <ChatCardMenu roomKey={room.roomKey} title={title} leaveOnDelete className={styles.chatCardMenu} />
    </header>
  );
}
