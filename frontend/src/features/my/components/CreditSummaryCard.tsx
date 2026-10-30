import { LinkButton } from "@/components/ui/LinkButton";
import { formatCredits } from "@/lib/format";
import { cashableCredits, totalCredits, type CreditBalance } from "../types";
import { cardClass, cardHeaderClass, cardTitleClass } from "./card-styles";

/** 보유 크레딧과 그 구성. 승인 대기 보상은 잔액과 따로 보여 주고, 출금할 크레딧이 있을 때만 출금 신청을 보여 준다 */
export function CreditSummaryCard({ credits }: { credits: CreditBalance }) {
  const cashable = cashableCredits(credits);
  const rows = [
    { label: "현금화 가능", value: cashable },
    { label: "구독 결제 전용", value: credits.signup },
    { label: "출금 처리 중", value: credits.pendingWithdrawal },
  ];
  return (
    <section aria-labelledby="my-credits-heading" className={cardClass}>
      <div className={cardHeaderClass}>
        <h2 id="my-credits-heading" className={cardTitleClass}>
          크레딧
        </h2>
        <div className="flex flex-wrap gap-2">
          <LinkButton href="/my/credits" variant="secondary" size="sm">
            크레딧 내역
          </LinkButton>
          {cashable > 0 && (
            <LinkButton href="/my/credits/withdrawals" variant="secondary" size="sm">
              출금 신청
            </LinkButton>
          )}
        </div>
      </div>
      <p className="text-2xl font-extrabold tracking-[-0.03em] tabular-nums">{formatCredits(totalCredits(credits))}</p>
      {credits.pendingReward > 0 && (
        <p className="text-sm text-text-muted">
          승인 대기 <span className="font-semibold text-text tabular-nums">{formatCredits(credits.pendingReward)}</span>
          {" "}· 확인되면 잔액에 더해져요
        </p>
      )}
      <dl className="flex flex-col gap-2 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4">
            <dt className="text-text-muted">{row.label}</dt>
            <dd className="font-semibold tabular-nums">{formatCredits(row.value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
