import { ChatTextIcon } from "@phosphor-icons/react/ssr";
import styles from "./FeedbackMarker.module.css";

/** 피드백 칸 왼쪽의 표시. 모집글 상세의 테스트 항목과 같은 번호이고, 번호가 없는 기타 의견은 아이콘이다 */
export function FeedbackMarker({ number }: { number?: number }) {
  return (
    <span aria-hidden data-testid={number ? "feedback-number" : undefined} className={styles.root}>
      {number ?? <ChatTextIcon size={16} weight="bold" />}
    </span>
  );
}
