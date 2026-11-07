import Link from "next/link";
import { DayGroups } from "@/app/(site)/my/(account)/_components/DayGroups";
import { LedgerRow } from "@/app/(site)/my/(account)/_components/LedgerRow";
import type { CreditEntry } from "@/features/credit/types";
import { cardClass, cardTitleClass } from "./card-styles";

/** 최근 크레딧 변동. 최신순 */
export function RecentCredits({ entries, now }: { entries: CreditEntry[]; now: Date }) {
  return (
    <section aria-labelledby="my-recent-credits-heading" className={cardClass}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="my-recent-credits-heading" className={cardTitleClass}>
          최근 크레딧 내역
        </h2>
        <Link href="/my/credits" className="text-sm font-semibold text-text-muted hover:text-text">
          전체 보기
        </Link>
      </div>
      {entries.length === 0 ? (
        <p className="text-sm text-text-muted">아직 크레딧 내역이 없어요</p>
      ) : (
        <DayGroups items={entries} dateOf={(entry) => entry.occurredAt} idPrefix="recent-credit-day" now={now}>
          {(entry) => <LedgerRow key={entry.id} entry={entry} />}
        </DayGroups>
      )}
    </section>
  );
}
