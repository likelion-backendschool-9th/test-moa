import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/LinkButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { CHATS_PATH, toChatsHref, type ChatQuery } from "../query";
import { CHAT_ROLE_LABEL, type ChatInboxData, type ChatRole } from "../types";
import { ChatCard } from "./ChatCard";
import { ChatFilters } from "./ChatFilters";

/** 역할 탭에 채팅방이 없을 때의 안내 */
const ROLE_EMPTY_DESCRIPTION: Record<ChatRole, string> = {
  tester: "구독 모집에 선정되면 개발자와 나눈 채팅이 여기에 모여요.",
  developer: "내 프로젝트에서 선정한 테스터와 나눈 채팅이 여기에 모여요.",
};

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
      <ChatFilters query={query} counts={inbox.counts} />
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
    <div aria-busy="true" aria-label="채팅함 불러오는 중" className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <Skeleton className="h-12 w-full rounded-full" />
        <div className="flex items-center justify-between gap-6">
          <Skeleton className="h-10 w-56 rounded-full" />
          <Skeleton className="h-5 w-28" />
        </div>
      </div>
      <div className="flex flex-col gap-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="flex rounded-2xl bg-surface-muted">
            <Skeleton className="w-24 shrink-0 self-stretch rounded-none rounded-l-2xl sm:w-36 md:w-44" />
            <div className="flex flex-1 flex-col gap-3 p-5 md:p-6">
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-full max-w-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
