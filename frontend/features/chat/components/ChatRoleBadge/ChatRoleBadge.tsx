import { Badge, type BadgeTone } from "@/components/ui/Badge/Badge";
import { CHAT_ROLE_LABEL, type ChatRole } from "@/features/chat/types";
import styles from "./ChatRoleBadge.module.css";

/* 강조색을 더하지 않고 바탕·테두리로 나눈다. 테스터는 칩 회색 바탕, 개발자는 바탕 없이 재단 회색 테두리 (11-02 리뷰 제안) */
const TONE = { tester: "neutral", developer: "outline" } as const satisfies Record<ChatRole, BadgeTone>;

/** 대화 상대의 역할 배지. 채팅 카드와 채팅방 머리가 같이 쓴다 */
export function ChatRoleBadge({ role }: { role: ChatRole }) {
  return (
    <Badge data-partner-role={role} tone={TONE[role]} className={styles.root}>
      {CHAT_ROLE_LABEL[role]}
    </Badge>
  );
}
