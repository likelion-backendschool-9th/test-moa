import { formatClock, formatCredits } from "@/lib/format";
import type { CreditEntry } from "@/features/credit/types";
import { FlowIcon } from "../FlowIcon/FlowIcon";
import styles from "./LedgerRow.module.css";

/** 크레딧 내역 한 줄. 받음·나감 원, 이름과 그 아래 시각, 금액 순이고 받은 크레딧은 강조색 +, 쓴 크레딧은 - */
export function LedgerRow({ entry }: { entry: CreditEntry }) {
  return (
    <li className={styles.root}>
      <FlowIcon incoming={entry.amount > 0} />
      <div className={styles.box}>
        <span className={styles.label}>{entry.label}</span>
        <time dateTime={entry.occurredAt} className={styles.time}>
          {formatClock(entry.occurredAt)}
        </time>
      </div>
      <span className={entry.amount > 0 ? styles.labelOn : styles.labelOff}>
        {entry.amount > 0 ? "+" : ""}
        {formatCredits(entry.amount)}
      </span>
    </li>
  );
}
