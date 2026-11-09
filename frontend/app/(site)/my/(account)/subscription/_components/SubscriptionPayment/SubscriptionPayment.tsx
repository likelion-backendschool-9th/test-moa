import { LinkButton } from "@/components/ui/LinkButton/LinkButton";
import { formatCredits, formatWon } from "@/lib/format";
import type { SubscriptionPlan } from "@/features/subscription/types";
import { AccountCard, AccountCardHeader, AccountCardTitle } from "@/app/(site)/my/(account)/_components/AccountCard/AccountCard";
import styles from "./SubscriptionPayment.module.css";

type SubscriptionPaymentProps = {
  plans: SubscriptionPlan[];
  payableCredits: number;
  /** 구독 중이면 결제 버튼이 연장이 된다 */
  active: boolean;
};

/** 결제 안내. 구독 상품별 기간과 가격(현금·크레딧), 구독 결제에 쓸 수 있는 크레딧, 구독 결제로 가는 이 화면의 주 버튼과 혜택을 보는 공개 소개 링크를 둔다 */
export function SubscriptionPayment({ plans, payableCredits, active }: SubscriptionPaymentProps) {
  return (
    <AccountCard as="section" aria-labelledby="subscription-payment-heading">
      <AccountCardHeader>
        <AccountCardTitle id="subscription-payment-heading">
          결제 안내
        </AccountCardTitle>
        <LinkButton href="/my/credits" variant="secondary" size="sm">
          크레딧 내역
        </LinkButton>
      </AccountCardHeader>
      <ul aria-label="구독 상품" className={styles.list}>
        {plans.map((plan) => (
          <li key={plan.id} className={styles.root}>
            <div className={styles.box}>
              <h3 className={styles.name}>{plan.name}</h3>
              <span className={styles.label}>{plan.periodDays}일</span>
            </div>
            <dl className={styles.list2}>
              <div className={styles.box2}>
                <dt className={styles.term}>현금</dt>
                <dd className={styles.value}>{formatWon(plan.cashPrice)}</dd>
              </div>
              <div className={styles.box3}>
                <dt className={styles.term2}>크레딧</dt>
                <dd className={styles.value2}>{formatCredits(plan.creditPrice)}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
      <dl className={styles.list3}>
        <dt className={styles.term3}>구독 결제에 쓸 수 있는 크레딧</dt>
        <dd className={styles.value3}>{formatCredits(payableCredits)}</dd>
      </dl>
      <ul className={styles.list4}>
        <li>이벤트 크레딧도 구독 결제에 쓸 수 있어요.</li>
        <li>크레딧으로 결제하면 현금보다 우대 가격이 적용돼요.</li>
      </ul>
      <div className={styles.actions}>
        <LinkButton href="/my/subscription/checkout">
          {active ? "구독 연장하기" : "구독하기"}
        </LinkButton>
        <LinkButton href="/subscription" variant="secondary">
          혜택 보기
        </LinkButton>
      </div>
    </AccountCard>
  );
}
