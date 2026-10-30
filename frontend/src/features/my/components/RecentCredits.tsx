import Link from "next/link";
import { formatCredits, formatDate } from "@/lib/format";
import type { CreditEntry } from "../types";
import { cardClass, cardTitleClass } from "./card-styles";

/** 최근 크레딧 변동. 최신순 */
export function RecentCredits({ entries }: { entries: CreditEntry[] }) {
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
        <ul className="flex flex-col divide-y divide-line">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-center gap-4 py-3 text-sm">
              <span className="w-16 shrink-0 text-xs text-text-muted tabular-nums">{formatDate(entry.occurredAt)}</span>
              <span className="flex-1 truncate">{entry.label}</span>
              <span className={entry.amount > 0 ? "font-semibold text-accent tabular-nums" : "font-semibold tabular-nums"}>
                {entry.amount > 0 ? "+" : ""}
                {formatCredits(entry.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
