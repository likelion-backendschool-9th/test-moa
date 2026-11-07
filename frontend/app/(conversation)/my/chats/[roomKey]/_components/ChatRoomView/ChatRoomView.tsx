import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import type { ChatRoomData } from "@/features/chat/types";
import { ChatComposer } from "../ChatComposer/ChatComposer";
import { ChatMessageList } from "../ChatMessageList/ChatMessageList";
import { ChatRoomHeader } from "../ChatRoomHeader/ChatRoomHeader";
import styles from "./ChatRoomView.module.css";

/** 채팅방 본문. 머리 → 대화 내용 → 아래에 붙는 입력창 */
export function ChatRoomView({ data }: { data: ChatRoomData }) {
  const { room, messages } = data;
  const last = messages[messages.length - 1];
  return (
    <>
      <ChatRoomHeader room={room} />
      <div className={styles.box}>
        <ChatMessageList room={room} messages={messages} now={new Date(data.now)} />
      </div>
      <ChatComposer
        roomKey={room.roomKey}
        lastMessage={last ? { id: last.id, from: last.from, sentAt: last.sentAt } : null}
        now={data.now}
      />
    </>
  );
}

/** 머리·말풍선·입력창 모양을 그대로 본뜬 스켈레톤 */
export function ChatRoomSkeleton() {
  return (
    <div aria-busy="true" aria-label="대화방 불러오는 중" className={styles.chatRoomSkeleton}>
      <div className={styles.chatRoomSkeletonBox}>
        <Skeleton className={styles.chatRoomSkeletonSkeleton} />
        <div className={styles.chatRoomSkeletonBox2}>
          <Skeleton className={styles.chatRoomSkeletonSkeleton2} />
          <Skeleton className={styles.chatRoomSkeletonSkeleton3} />
        </div>
      </div>
      <div className={styles.chatRoomSkeletonBox3}>
        <Skeleton className={styles.chatRoomSkeletonSkeleton4} />
        <Skeleton className={styles.chatRoomSkeletonSkeleton5} />
        <Skeleton className={styles.chatRoomSkeletonSkeleton6} />
        <Skeleton className={styles.chatRoomSkeletonSkeleton7} />
        <Skeleton className={styles.chatRoomSkeletonSkeleton8} />
      </div>
      <div className={styles.chatRoomSkeletonBox4}>
        <Skeleton className={styles.chatRoomSkeletonSkeleton9} />
      </div>
    </div>
  );
}
