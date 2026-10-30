import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/LinkButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { CHATS_PATH, type ChatQuery } from "../query";
import type { ChatInboxData } from "../types";
import { ChatCard } from "./ChatCard";
import { ChatFilters } from "./ChatFilters";

/** 채팅함 본문. 채팅방이 없으면 빈 상태, 있으면 검색 영역과 카드 목록을 그린다 */
export function ChatInbox({ query, inbox }: { query: ChatQuery; inbox: ChatInboxData }) {
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
    <div className="flex flex-col gap-6">
      <ChatFilters query={query} projects={inbox.projects} total={inbox.total} />
      <p aria-live="polite" className="text-sm font-semibold text-text-muted">
        채팅방 {inbox.rooms.length}개
      </p>
      {inbox.rooms.length > 0 ? (
        <ul aria-label="채팅 목록" className="stagger-children flex flex-col gap-4">
          {inbox.rooms.map((room) => (
            /* 더보기 메뉴가 열린 카드는 다음 카드 위로 올라온다 */
            <li key={room.roomKey} className="relative animate-rise-in has-[[aria-expanded=true]]:z-(--z-popover)">
              <ChatCard room={room} now={now} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title="조건에 맞는 채팅방이 없어요"
          description="검색어를 바꾸거나 프로젝트 선택을 풀어 보세요."
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
    <div aria-busy="true" aria-label="채팅함 불러오는 중" className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <Skeleton className="h-12 w-full rounded-full sm:max-w-sm" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-9 w-28 rounded-full" />
        </div>
      </div>
      <div className="flex flex-col gap-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="flex items-start gap-4 rounded-2xl bg-surface-muted p-5 sm:gap-5 md:p-6">
            <Skeleton className="size-14 shrink-0 rounded-xl md:size-16" />
            <div className="flex flex-1 flex-col gap-3 pt-0.5">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-full max-w-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
