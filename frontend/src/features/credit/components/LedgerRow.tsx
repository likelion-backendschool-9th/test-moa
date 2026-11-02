import { formatCredits } from "@/lib/format";
import type { CreditEntry } from "../types";
import { EntryTime } from "./EntryTime";

/** 크레딧 내역 한 줄. 받은 크레딧은 강조색 +, 쓴 크레딧은 - */
export function LedgerRow({ entry }: { entry: CreditEntry }) {
  return (
    <li className="flex items-center gap-4 py-3 text-sm">
      <EntryTime iso={entry.occurredAt} />
      <span className="flex-1 truncate">{entry.label}</span>
      <span className={entry.amount > 0 ? "font-semibold text-accent tabular-nums" : "font-semibold tabular-nums"}>
        {entry.amount > 0 ? "+" : ""}
        {formatCredits(entry.amount)}
      </span>
    </li>
  );
}
