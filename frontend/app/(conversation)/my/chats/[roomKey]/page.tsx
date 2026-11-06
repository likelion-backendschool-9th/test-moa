import type { Metadata } from "next";
import { Suspense } from "react";
import { Main } from "@/app/_components/Main";
import { Container } from "@/components/ui/Container";
import { getChatRoom, getChatRoomTitle } from "@/features/chat/api";
import { ChatRoomSkeleton, ChatRoomView } from "@/features/chat/components/ChatRoomView";
import { ChatsBackLink } from "@/features/chat/components/ChatsBackLink";

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
    <Main className="flex flex-col">
    <Container className="flex flex-1 flex-col pt-6 md:pt-8">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
        <ChatsBackLink />
        <Suspense fallback={<ChatRoomSkeleton />}>
          <RoomSlot params={params} />
        </Suspense>
      </div>
    </Container>
    </Main>
  );
}

async function RoomSlot({ params }: { params: RoomPageProps["params"] }) {
  const { roomKey } = await params;
  return <ChatRoomView data={await getChatRoom(roomKey)} />;
}
