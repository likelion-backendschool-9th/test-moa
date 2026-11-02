import { cn } from "@/lib/cn";
import { cardClass, cardTitleClass } from "@/features/my/components/card-styles";
import { formatWon } from "@/lib/format";
import { WITHDRAWAL_STATUS_LABEL, type Withdrawal, type WithdrawalStatus } from "../types";
import { EntryTime } from "./EntryTime";

/*
 * 상태는 라이트·다크 모두 대비가 높은 조합만 쓴다.
 * 지급 완료는 강조색 면, 처리 중은 먹 반전, 반려는 칩 회색 면에 먹 글씨와 흐린 먹 테두리
 */
const STATUS_CLASS: Record<WithdrawalStatus, string> = {
  requested: "bg-text text-surface",
  paid: "bg-accent text-on-accent",
  rejected: "bg-surface-strong text-text ring-1 ring-inset ring-text-muted",
};

/** 지난 출금 요청. 반려는 이유를 함께 보여 준다 */
export function WithdrawalHistory({ withdrawals }: { withdrawals: Withdrawal[] }) {
  return (
    <section aria-labelledby="withdrawal-history-heading" className={cardClass}>
      <h2 id="withdrawal-history-heading" className={cardTitleClass}>
        출금 내역
      </h2>
      {withdrawals.length === 0 ? (
        <p className="py-3 text-sm text-text-muted">아직 출금 요청이 없어요</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {withdrawals.map((item) => (
            <li key={item.id} className="flex flex-col gap-1 py-3">
              <div className="flex items-center gap-4 text-sm">
                <EntryTime iso={item.requestedAt} />
                <span className="flex-1 font-semibold tabular-nums">{formatWon(item.amount)}</span>
                <span className={cn("shrink-0 rounded-full px-3 py-1 text-sm font-bold", STATUS_CLASS[item.status])}>
                  {WITHDRAWAL_STATUS_LABEL[item.status]}
                </span>
              </div>
              <p className="pl-20 text-xs text-text-muted">
                {item.bank} {item.accountMasked}
                {item.rejectReason && ` · ${item.rejectReason}`}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
