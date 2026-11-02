import { formatClock, formatCredits } from "@/lib/format";
import type { CreditEntry } from "../types";

/** 크레딧 내역 한 줄. 이름 아래에 시각을 두고, 받은 크레딧은 강조색 +, 쓴 크레딧은 - */
export function LedgerRow({ entry }: { entry: CreditEntry }) {
  return (
    <li className="flex items-center gap-4 py-3 text-sm">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate">{entry.label}</span>
        <time dateTime={entry.occurredAt} className="text-xs text-text-muted tabular-nums">
          {formatClock(entry.occurredAt)}
        </time>
      </div>
      <span className={entry.amount > 0 ? "font-semibold text-accent tabular-nums" : "font-semibold tabular-nums"}>
        {entry.amount > 0 ? "+" : ""}
        {formatCredits(entry.amount)}
      </span>
    </li>
  );
}
