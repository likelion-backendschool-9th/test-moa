import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import type { ChatRoomData } from "@/features/chat/types";
import { ChatConversation } from "../ChatConversation/ChatConversation";
import { ChatRoomHeader } from "../ChatRoomHeader/ChatRoomHeader";
import styles from "./ChatRoomView.module.css";

/** 채팅방 본문. 머리 → 대화 내용 → 아래에 붙는 입력창 */
export function ChatRoomView({ data }: { data: ChatRoomData }) {
  return (
    <>
      <ChatRoomHeader room={data.room} />
      <ChatConversation key={data.room.roomKey} data={data} className={styles.box} />
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
