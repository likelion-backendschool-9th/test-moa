import type { Metadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/ui/Container";
import { getChatInbox } from "@/features/chat/api";
import { ChatInbox, ChatInboxSkeleton } from "@/app/(site)/my/chats/_components/ChatInbox";
import { parseChatQuery } from "@/features/chat/query";

export const metadata: Metadata = { title: "채팅함" };

/* 제목은 정적 셸에 두고, 세션과 검색 조건을 읽는 목록만 Suspense 안에서 스트리밍한다 */
export default function ChatsPage({ searchParams }: PageProps<"/my/chats">) {
  return (
    <Container className="py-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-extrabold tracking-[-0.03em]">채팅함</h1>
          <p className="text-sm text-text-muted">구독 모집 건에서 나눈 1대1 대화를 모아 봐요.</p>
        </div>
        <Suspense fallback={<ChatInboxSkeleton />}>
          <InboxSlot searchParams={searchParams} />
        </Suspense>
      </div>
    </Container>
  );
}

async function InboxSlot({ searchParams }: { searchParams: PageProps<"/my/chats">["searchParams"] }) {
  const query = parseChatQuery(await searchParams);
  return <ChatInbox query={query} inbox={await getChatInbox(query)} />;
}
