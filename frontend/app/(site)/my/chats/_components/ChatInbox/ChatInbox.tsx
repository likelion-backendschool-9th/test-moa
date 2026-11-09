"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { shouldRefreshChatInbox } from "@/features/chat/realtime";
import { useChatEvents, requestChatRefresh } from "@/app/_components/ChatEvents/hook";
import { EmptyState } from "@/components/ui/EmptyState/EmptyState";
import { LinkButton } from "@/components/ui/LinkButton/LinkButton";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { CHATS_PATH, toChatsHref, type ChatQuery } from "@/features/chat/query";
import { CHAT_ROLE_LABEL, type ChatInboxData, type ChatRole } from "@/features/chat/types";
import { ChatCard } from "../ChatCard/ChatCard";
import { ChatFilters } from "../ChatFilters/ChatFilters";
import { Card } from "@/components/ui/Card/Card";
import styles from "./ChatInbox.module.css";

/** 역할 탭에 채팅방이 없을 때의 안내 */
const ROLE_EMPTY_DESCRIPTION: Record<ChatRole, string> = {
  tester: "구독 모집에 선정되면 개발자와 나눈 채팅이 여기에 모여요.",
  developer: "내 프로젝트에서 선정한 테스터와 나눈 채팅이 여기에 모여요.",
};

/** 채팅함 본문. 채팅방이 없으면 빈 상태, 있으면 검색 영역과 카드 목록을 그린다 */
export function ChatInbox({ query, inbox }: { query: ChatQuery; inbox: ChatInboxData }) {
  const router = useRouter();
  // 돌아온 화면은 이전 목록이 보존될 수 있어 구독 직후의 ready로도 맞춘다
  useChatEvents(useCallback(event => {
    if (shouldRefreshChatInbox(event)) requestChatRefresh(() => router.refresh());
  }, [router]));
  if (inbox.total === 0) {
    return (
      <EmptyState
        title="아직 채팅이 없어요"
        description="채팅은 구독 모집 건의 개발자와 선정된 테스터가 1대1로 나눠요."
        action={
          <LinkButton href="/recruitments" variant="secondary">
            테스트 둘러보기
          </LinkButton>
        }
      />
    );
  }

  const now = new Date(inbox.now);
  return (
    <div className={styles.root}>
      <ChatFilters query={query} counts={inbox.counts} />
      <p aria-live="polite" className={styles.text}>
        채팅방 {inbox.rooms.length}개
      </p>
      {inbox.rooms.length > 0 ? (
        <ul aria-label="채팅 목록" className={styles.list}>
          {inbox.rooms.map((room, index) => (
            /* 더보기 메뉴가 열린 카드는 다음 카드 위로 올라온다. 첫 카드 이미지는 화면에서 가장 큰 요소라 바로 불러온다 */
            <li key={room.roomKey} className={styles.root2}>
              <ChatCard room={room} now={now} eager={index === 0} />
            </li>
          ))}
        </ul>
      ) : query.role && !query.q ? (
        <EmptyState
          title={`${CHAT_ROLE_LABEL[query.role]}로 나눈 채팅이 없어요`}
          description={ROLE_EMPTY_DESCRIPTION[query.role]}
          action={
            <LinkButton href={toChatsHref({ ...query, role: null })} scroll={false} variant="secondary">
              전체 보기
            </LinkButton>
          }
        />
      ) : (
        <EmptyState
          title="조건에 맞는 채팅방이 없어요"
          description="검색어를 바꾸거나 역할 탭을 전체로 바꿔 보세요."
          action={
            <LinkButton href={CHATS_PATH} scroll={false} variant="secondary">
              조건 초기화
            </LinkButton>
          }
        />
      )}
    </div>
  );
}

/** 검색 영역과 카드 모양을 그대로 본뜬 스켈레톤 */
export function ChatInboxSkeleton() {
  return (
    <div aria-busy="true" aria-label="채팅함 불러오는 중" className={styles.chatInboxSkeleton}>
      <div className={styles.chatInboxSkeletonBox}>
        <Skeleton className={styles.chatInboxSkeletonSkeleton} />
        <div className={styles.chatInboxSkeletonBox2}>
          <Skeleton className={styles.chatInboxSkeletonSkeleton2} />
          <Skeleton className={styles.chatInboxSkeletonSkeleton3} />
        </div>
      </div>
      <div className={styles.chatInboxSkeletonBox3}>
        {Array.from({ length: 4 }, (_, index) => (
          <Card as="div" key={index} className={styles.chatInboxSkeleton2}>
            <Skeleton className={styles.chatInboxSkeletonSkeleton4} />
            <div className={styles.chatInboxSkeletonBox4}>
              <Skeleton className={styles.chatInboxSkeletonSkeleton5} />
              <Skeleton className={styles.chatInboxSkeletonSkeleton6} />
              <Skeleton className={styles.chatInboxSkeletonSkeleton7} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
