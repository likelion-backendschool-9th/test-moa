import {
  AccountCard,
  AccountCardTitle,
} from "@/app/(site)/my/(account)/_components/AccountCard/AccountCard";
import {
  RESTRICTION_LABEL,
  SANCTION_TYPE_LABEL,
  type MySanction,
} from "@/features/member/types";
import { formatDate } from "@/lib/format";
import styles from "./MySanctions.module.css";

function period(sanction: MySanction) {
  if (sanction.type === "WARNING") return formatDate(sanction.startedAt);
  const end = sanction.endsAt ? formatDate(sanction.endsAt) : "해제할 때까지";
  return `${formatDate(sanction.startedAt)} ~ ${end}`;
}

function state(sanction: MySanction) {
  if (sanction.releasedAt) return "해제됨";
  if (sanction.active) return "제한 중";
  return sanction.type === "WARNING" ? "경고" : "끝남";
}

/** 내가 받은 경고·정지(#86). 신고자와 증거는 없다 */
export function MySanctions({ sanctions }: { sanctions: MySanction[] }) {
  return (
    <AccountCard as="section" aria-labelledby="my-sanctions-heading">
      <AccountCardTitle id="my-sanctions-heading">받은 제재</AccountCardTitle>
      {sanctions.length === 0 ? (
        <p className={styles.empty}>받은 제재가 없어요.</p>
      ) : (
        <ul className={styles.list}>
          {sanctions.map((sanction) => (
            <li key={sanction.id} className={styles.row}>
              <div className={styles.main}>
                <span className={styles.type}>
                  {SANCTION_TYPE_LABEL[sanction.type]}
                  {sanction.restrictions.length > 0 &&
                    ` · ${sanction.restrictions.map((r) => RESTRICTION_LABEL[r]).join(", ")} 제한`}
                </span>
                <p className={styles.reason}>{sanction.reason}</p>
              </div>
              <div className={styles.meta}>
                <span className={styles.state}>{state(sanction)}</span>
                <span>{period(sanction)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AccountCard>
  );
}
