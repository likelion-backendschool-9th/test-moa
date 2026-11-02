import Link from "next/link";
import { cn } from "@/lib/cn";
import { cardClass, cardTitleClass } from "@/features/my/components/card-styles";
import { LEDGER_TYPE_LABEL, LEDGER_TYPES, type CreditEntry, type LedgerType } from "../types";
import { DayGroups } from "./DayGroups";
import { LedgerRow } from "./LedgerRow";

const filterHref = (type: LedgerType) => (type === "all" ? "/my/credits" : `/my/credits?type=${type}`);

/** 전체 크레딧 내역과 받은·쓴 필터. 필터는 링크라 상태가 URL에 남는다 */
export function LedgerList({ entries, type }: { entries: CreditEntry[]; type: LedgerType }) {
  return (
    <section aria-labelledby="ledger-heading" className={cardClass}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="ledger-heading" className={cardTitleClass}>
          크레딧 내역
        </h2>
        <nav aria-label="내역 필터">
          <ul className="flex gap-1">
            {LEDGER_TYPES.map((item) => {
              const active = item === type;
              return (
                <li key={item}>
                  <Link
                    href={filterHref(item)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex rounded-full px-4 py-2 text-sm font-bold transition-colors duration-300 ease-brand",
                      active ? "bg-text text-surface" : "bg-surface-strong text-text hover:bg-line",
                    )}
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
        <p className="py-3 text-sm text-text-muted">
          {type === "all" ? "아직 크레딧 내역이 없어요" : `${LEDGER_TYPE_LABEL[type]} 내역이 없어요`}
        </p>
      ) : (
        <DayGroups items={entries} dateOf={(entry) => entry.occurredAt} idPrefix="ledger-day">
          {(entry) => <LedgerRow key={entry.id} entry={entry} />}
        </DayGroups>
      )}
    </section>
  );
}
