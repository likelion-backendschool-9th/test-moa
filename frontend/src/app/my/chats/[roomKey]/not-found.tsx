import { Container } from "@/components/ui/Container";
import { LinkButton } from "@/components/ui/LinkButton";
import { CHATS_PATH } from "@/features/chat/query";

/** 없거나 삭제했거나 내가 들어가 있지 않은 대화방 */
export default function ChatRoomNotFound() {
  return (
    <Container className="py-8">
      <div className="mx-auto flex max-w-3xl flex-col items-start gap-3 rounded-2xl bg-surface-muted p-8">
        <h1 className="text-lg font-semibold">대화방을 찾을 수 없어요</h1>
        <p className="text-sm text-text-muted">삭제했거나 내가 들어가 있지 않은 대화방이에요. 채팅함에서 다시 골라 주세요.</p>
        <LinkButton href={CHATS_PATH} variant="secondary" className="mt-2">
          채팅함으로
        </LinkButton>
      </div>
    </Container>
  );
}
