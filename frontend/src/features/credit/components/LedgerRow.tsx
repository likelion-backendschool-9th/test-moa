import { formatCredits, formatTime24 } from "@/lib/format";
import type { CreditEntry } from "../types";

/** 크레딧 내역 한 줄. 왼쪽 시각 열, 이름, 금액 순이고 받은 크레딧은 강조색 +, 쓴 크레딧은 - */
export function LedgerRow({ entry }: { entry: CreditEntry }) {
  return (
    <li className="flex items-center gap-3 py-3 text-sm">
      <time dateTime={entry.occurredAt} className="w-10 shrink-0 text-xs text-text-muted tabular-nums">
        {formatTime24(entry.occurredAt)}
      </time>
      <span className="min-w-0 flex-1 truncate">{entry.label}</span>
      <span className={entry.amount > 0 ? "font-semibold text-accent tabular-nums" : "font-semibold tabular-nums"}>
        {entry.amount > 0 ? "+" : ""}
        {formatCredits(entry.amount)}
      </span>
    </li>
  );
}
