import { SiteFrame } from "@/app/_components/SiteFrame/SiteFrame";
import { Container } from "@/components/ui/Container/Container";
import { LinkButton } from "@/components/ui/LinkButton/LinkButton";
import { CHATS_PATH } from "@/features/chat/query";
import { Card } from "@/components/ui/Card/Card";
import styles from "./not-found.module.css";

/** 없거나 삭제했거나 내가 들어가 있지 않은 대화방. 대화 화면이 아니라서 푸터를 그대로 둔다 */
export default function ChatRoomNotFound() {
  return (
    <SiteFrame>
      <Container className={styles.chatRoomNotFoundContainer}>
        <Card as="div" className={styles.chatRoomNotFoundBox}>
          <h1 className={styles.chatRoomNotFoundTitle}>대화방을 찾을 수 없어요</h1>
          <p className={styles.chatRoomNotFoundText}>삭제했거나 내가 들어가 있지 않은 대화방이에요. 채팅함에서 다시 골라 주세요.</p>
          <LinkButton href={CHATS_PATH} variant="secondary" className={styles.chatRoomNotFoundButton}>
            채팅함으로
          </LinkButton>
        </Card>
      </Container>
    </SiteFrame>
  );
}
