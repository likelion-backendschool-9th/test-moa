import Link from "next/link";
import { cn } from "@/lib/cn";
import { LEDGER_TYPE_LABEL, LEDGER_TYPES, type CreditEntry, type LedgerType } from "@/features/credit/types";
import { DayGroups } from "../../../_components/DayGroups/DayGroups";
import { LedgerRow } from "../../../_components/LedgerRow/LedgerRow";
import { AccountCard, AccountCardTitle } from "@/app/(site)/my/(account)/_components/AccountCard/AccountCard";
import styles from "./LedgerList.module.css";

const filterHref = (type: LedgerType) => (type === "all" ? "/my/credits" : `/my/credits?type=${type}`);

/** 전체 크레딧 내역과 받은·쓴 필터. 필터는 링크라 상태가 URL에 남는다 */
export function LedgerList({ entries, type, now }: { entries: CreditEntry[]; type: LedgerType; now: Date }) {
  return (
    <AccountCard as="section" aria-labelledby="ledger-heading">
      <div className={styles.box}>
        <AccountCardTitle id="ledger-heading">
          크레딧 내역
        </AccountCardTitle>
        <nav aria-label="내역 필터">
          <ul className={styles.list}>
            {LEDGER_TYPES.map((item) => {
              const active = item === type;
              return (
                <li key={item}>
                  <Link
                    href={filterHref(item)}
                    aria-current={active ? "page" : undefined}
                    className={cn(styles.link, active ? styles.linkActive : styles.linkNotActive)}
                  >
                    {LEDGER_TYPE_LABEL[item]}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
      {entries.length === 0 ? (
        <p className={styles.text}>
          {type === "all" ? "아직 크레딧 내역이 없어요" : `${LEDGER_TYPE_LABEL[type]} 내역이 없어요`}
        </p>
      ) : (
        <DayGroups items={entries} dateOf={(entry) => entry.occurredAt} idPrefix="ledger-day" now={now}>
          {(entry) => <LedgerRow key={entry.id} entry={entry} />}
        </DayGroups>
      )}
    </AccountCard>
  );
}
