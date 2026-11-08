import { cn } from "@/lib/cn";
import styles from "./ProofStamp.module.css";
const PLACEMENT = {
  /* 썸네일 오른쪽 위에 이름과 겹치지 않게 겹쳐 찍는다 */
  corner: styles.placementCorner,
  bottomRight: styles.placementBottomRight,
  /* 768px 이상에서 글줄 안에 놓는다 (예: 홈 배너 진행 흐름의 마지막 줄) */
  inline: styles.placementInline,
  /* 768px 미만에서 면의 오른쪽 아래 가장자리에 걸쳐 찍는다. 좁은 글줄을 비워 두려고 inline과 짝으로 쓴다 */
  edge: styles.placementEdge,
};

/** 교정 도장. 두 줄 테두리의 평면 표식 */
export function ProofStamp({ label, placement = "corner", paper = false }: { label: string; placement?: keyof typeof PLACEMENT; paper?: boolean }) {
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox="0 0 160 64"
      className={cn(styles.root, paper ? styles.paper : styles.ink, PLACEMENT[placement])}
    >
      {paper && <rect x="3" y="3" width="154" height="58" rx="10" className={styles.rect} />}
      <rect x="3" y="3" width="154" height="58" rx="10" fill="none" stroke="currentColor" strokeWidth="4" />
      <rect x="10" y="10" width="140" height="44" rx="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <text x="80" y="40" textAnchor="middle" fill="currentColor" fontSize="22" fontWeight="800" letterSpacing="2">
        {label}
      </text>
    </svg>
  );
}
