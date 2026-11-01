import { LinkButton } from "@/components/ui/LinkButton";
import { formatCredits, formatWon } from "@/lib/format";
import type { SubscriptionPlan } from "../types";
import { cardClass, cardHeaderClass, cardTitleClass } from "./card-styles";

/** 결제 안내. 구독 상품별 기간과 가격(현금·크레딧), 구독 결제에 쓸 수 있는 크레딧을 보여 준다 */
export function SubscriptionPayment({ plans, payableCredits }: { plans: SubscriptionPlan[]; payableCredits: number }) {
  return (
    <section aria-labelledby="subscription-payment-heading" className={cardClass}>
      <div className={cardHeaderClass}>
        <h2 id="subscription-payment-heading" className={cardTitleClass}>
          결제 안내
        </h2>
        <LinkButton href="/my/credits" variant="secondary" size="sm">
          크레딧 내역
        </LinkButton>
      </div>
      <ul aria-label="구독 상품" className="flex flex-col gap-3">
        {plans.map((plan) => (
          <li key={plan.id} className="flex flex-col gap-3 rounded-xl bg-surface p-4">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-base font-extrabold">{plan.name}</h3>
              <span className="text-sm text-text-muted tabular-nums">{plan.periodDays}일</span>
            </div>
            <dl className="flex flex-col gap-1 text-sm">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-text-muted">현금</dt>
                <dd className="font-semibold tabular-nums">{formatWon(plan.cashPrice)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-text-muted">크레딧</dt>
                <dd className="text-2xl font-extrabold tracking-[-0.03em] tabular-nums">{formatCredits(plan.creditPrice)}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
      <dl className="flex items-center justify-between gap-4 text-sm">
        <dt className="text-text-muted">구독 결제에 쓸 수 있는 크레딧</dt>
        <dd className="font-semibold tabular-nums">{formatCredits(payableCredits)}</dd>
      </dl>
      <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-text-muted">
        <li>가입 크레딧도 구독 결제에 쓸 수 있어요.</li>
        <li>크레딧으로 결제하면 현금보다 우대 가격이 적용돼요.</li>
      </ul>
    </section>
  );
}
