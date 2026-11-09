import type { ReactNode } from "react";
import { CheckIcon } from "@phosphor-icons/react/ssr";
import { Badge } from "@/components/ui/Badge/Badge";
import { Card } from "@/components/ui/Card/Card";
import { LinkButton } from "@/components/ui/LinkButton/LinkButton";
import { cn } from "@/lib/cn";
import { formatCredits, formatWon } from "@/lib/format";
import type { FreePlan, Subscription, SubscriptionPlan } from "@/features/subscription/types";
import styles from "./SubscriptionIntroCards.module.css";

const CHECKOUT = "/my/subscription/checkout";
const CHECKOUT_LOGIN = `/login?next=${encodeURIComponent(CHECKOUT)}`;

const FREE_BLURB = "모집을 올려 테스터를 모아 보세요";
const PLAN_BLURB = "추가 보상·채팅·상단 노출·AI 분석까지 구독으로 열어요";

type SubscriptionIntroCardsProps = {
  freePlan: FreePlan;
  plans: SubscriptionPlan[];
  subscription: Subscription | null;
  isGuest: boolean;
};

/** 공개 구독 소개의 무료·구독 카드. 상품 목록을 그대로 그려 상품이 늘면 카드도 는다 */
export function SubscriptionIntroCards({ freePlan, plans, subscription, isGuest }: SubscriptionIntroCardsProps) {
  const activePlanId = subscription?.status === "active" ? subscription.planId : null;
  const isAdmin = subscription === null;

  return (
    <div className={styles.grid}>
      <PlanCard
        name={freePlan.name}
        blurb={FREE_BLURB}
        price="무료"
        features={freePlan.benefits}
        className={styles.freeOrder}
      />
      {plans.map((plan) => {
        const using = activePlanId === plan.id;
        return (
          <PlanCard
            key={plan.id}
            name={plan.name}
            blurb={PLAN_BLURB}
            price={`${plan.periodDays}일 ${formatWon(plan.cashPrice)}`}
            creditPrice={formatCredits(plan.creditPrice)}
            features={plan.benefits}
            emphasized
            using={using}
            className={styles.planOrder}
            action={
              isAdmin ? (
                <p className={styles.adminNote}>운영자 계정은 구독 대상이 아니에요</p>
              ) : (
                <LinkButton href={isGuest ? CHECKOUT_LOGIN : CHECKOUT} className={styles.action}>
                  {using ? "구독 연장하기" : "구독하기"}
                </LinkButton>
              )
            }
          />
        );
      })}
    </div>
  );
}

function PlanCard({
  name,
  blurb,
  price,
  creditPrice,
  features,
  emphasized,
  using,
  action,
  className,
}: {
  name: string;
  blurb: string;
  price: string;
  creditPrice?: string;
  features: string[];
  /** 구독 상품. 가격을 더 크게 두고 주 버튼을 붙인다 */
  emphasized?: boolean;
  using?: boolean;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <Card as="section" aria-label={name} data-emphasized={emphasized || undefined} className={cn(styles.card, className)}>
      <div className={styles.head}>
        <div className={styles.nameRow}>
          <h2 className={styles.name}>{name}</h2>
          {using && <Badge>이용 중</Badge>}
        </div>
        <p className={styles.blurb}>{blurb}</p>
      </div>
      <div className={styles.priceBox}>
        <p className={cn(styles.price, emphasized && styles.priceEmphasized)}>{price}</p>
        {creditPrice && <p className={styles.creditPrice}>{creditPrice}</p>}
      </div>
      {/* 혜택이 없으면 빈 목록을 그리지 않는다(빈 간격과 스크린리더의 빈 목록을 막는다) */}
      {features.length > 0 && (
        <ul className={styles.features}>
          {features.map((feature, index) => (
            /* 서버가 같은 문구를 두 번 저장하는 것을 막지 않아 순서를 키에 더한다 */
            <li key={`${index}-${feature}`} className={styles.feature}>
              <CheckIcon aria-hidden size={20} weight="bold" className={styles.check} />
              <span className={cn(emphasized && styles.featureEmphasized)}>{feature}</span>
            </li>
          ))}
        </ul>
      )}
      {/* 카드 높이가 달라도 버튼 줄이 맞게 맨 아래에 붙인다 */}
      {action && <div className={styles.actionBox}>{action}</div>}
    </Card>
  );
}
