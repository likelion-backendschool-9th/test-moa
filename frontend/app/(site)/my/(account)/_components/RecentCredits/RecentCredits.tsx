import Link from "next/link";
import { DayGroups } from "@/app/(site)/my/(account)/_components/DayGroups/DayGroups";
import { LedgerRow } from "@/app/(site)/my/(account)/_components/LedgerRow/LedgerRow";
import type { CreditEntry } from "@/features/credit/types";
import { AccountCard, AccountCardTitle } from "@/app/(site)/my/(account)/_components/AccountCard/AccountCard";
import styles from "./RecentCredits.module.css";

/** 최근 크레딧 변동. 최신순 */
export function RecentCredits({ entries, now }: { entries: CreditEntry[]; now: Date }) {
  return (
    <AccountCard as="section" aria-labelledby="my-recent-credits-heading">
      <div className={styles.box}>
        <AccountCardTitle id="my-recent-credits-heading">
          최근 크레딧 내역
        </AccountCardTitle>
        <Link href="/my/credits" className={styles.link}>
          전체 보기
        </Link>
      </div>
      {entries.length === 0 ? (
        <p className={styles.text}>아직 크레딧 내역이 없어요</p>
      ) : (
        <DayGroups items={entries} dateOf={(entry) => entry.occurredAt} idPrefix="recent-credit-day" now={now}>
          {(entry) => <LedgerRow key={entry.id} entry={entry} />}
        </DayGroups>
      )}
    </AccountCard>
  );
}
