import { CaretLeftIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { HideFooter } from "@/components/layout/HideFooter";
import { Container } from "@/components/ui/Container";
import { getChatRoom, getChatRoomTitle } from "@/features/chat/api";
import { ChatRoomSkeleton, ChatRoomView } from "@/features/chat/components/ChatRoomView";
import { CHATS_PATH } from "@/features/chat/query";

type RoomPageProps = PageProps<"/my/chats/[roomKey]">;

/* 쿠키를 읽는 메타데이터라 본문의 대화방(Suspense 안)과 함께 요청 때 만든다 */
export async function generateMetadata({ params }: RoomPageProps): Promise<Metadata> {
  const title = await getChatRoomTitle((await params).roomKey);
  return { title: title ? `${title} 채팅방` : "채팅방" };
}

/*
 * "채팅함" 링크는 정적 셸에 두고, 세션과 대화 기록을 읽는 대화방만 Suspense 안에서 스트리밍한다.
 * 푸터를 빼고 본문이 화면 아래까지 채워서, 대화가 짧아도 입력창이 화면 아래에 온다.
 */
export default function ChatRoomPage({ params }: RoomPageProps) {
  return (
    <Container className="flex flex-1 flex-col pt-6 md:pt-8">
      <HideFooter />
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
        <Link
          href={CHATS_PATH}
          className="mb-5 -ml-1.5 inline-flex items-center gap-1 self-start rounded-full py-1.5 pr-3 pl-1.5 text-sm font-semibold text-text-muted transition-colors duration-300 ease-brand hover:bg-surface-strong hover:text-text"
        >
          <CaretLeftIcon aria-hidden size={16} weight="bold" />
          채팅함
        </Link>
        <Suspense fallback={<ChatRoomSkeleton />}>
          <RoomSlot params={params} />
        </Suspense>
      </div>
    </Container>
  );
}

async function RoomSlot({ params }: { params: RoomPageProps["params"] }) {
  const { roomKey } = await params;
  return <ChatRoomView data={await getChatRoom(roomKey)} />;
}
