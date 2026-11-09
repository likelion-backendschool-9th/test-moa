import { REVIEW_SEVERITY_LABEL, type ReviewSeverity } from "@/features/recruitment/types";
import styles from "./SeverityTag.module.css";

/** 리뷰 그룹 심각도 딱지. 치명 빨강, 높음 주황, 보통 파랑, 사소 회색 */
export function SeverityTag({ severity }: { severity: ReviewSeverity }) {
  return (
    <span data-severity={severity} className={styles.tag}>
      {REVIEW_SEVERITY_LABEL[severity]}
    </span>
  );
}
