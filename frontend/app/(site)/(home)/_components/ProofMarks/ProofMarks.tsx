import { cn } from "@/lib/cn";
import styles from "./ProofMarks.module.css";
/** 교정쇄의 네 모서리 재단선. 장식이라 보조 기술에서는 숨긴다 (고침 #60: 오른쪽 위 CMYK 색 막대를 뺐다) */
export function ProofMarks() {
  return (
    <div aria-hidden className={styles.root}>
      <span className={cn(styles.corner, styles.label)} />
      <span className={cn(styles.corner, styles.label2)} />
      <span className={cn(styles.corner, styles.label3)} />
      <span className={cn(styles.corner, styles.label4)} />
    </div>
  );
}
