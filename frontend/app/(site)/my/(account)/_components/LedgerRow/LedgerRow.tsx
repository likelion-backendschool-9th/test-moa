import { formatClock, formatCredits } from "@/lib/format";
import type { CreditEntry } from "@/features/credit/types";
import { FlowIcon } from "../FlowIcon/FlowIcon";

/** 크레딧 내역 한 줄. 받음·나감 원, 이름과 그 아래 시각, 금액 순이고 받은 크레딧은 강조색 +, 쓴 크레딧은 - */
export function LedgerRow({ entry }: { entry: CreditEntry }) {
  return (
    <li className="flex items-center gap-3 py-2.5 text-sm">
      <FlowIcon incoming={entry.amount > 0} />
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
