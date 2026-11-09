import { formatDate, formatDday } from "@/lib/format";
import type { Subscription, SubscriptionPlan } from "@/features/subscription/types";
import { AccountCard, AccountCardHeader, AccountCardTitle } from "@/app/(site)/my/(account)/_components/AccountCard/AccountCard";
import styles from "./SubscriptionStatus.module.css";

/** 내 구독 상태. 구독 중이면 이용 중인 상품, 남은 기간, 만료일을 보여 준다 */
export function SubscriptionStatus({
  subscription,
  plan,
  now,
}: {
  subscription: Subscription;
  /** 구독 중인 상품. 미구독이면 없다 */
  plan?: SubscriptionPlan;
  now: Date;
}) {
  const active = subscription.status === "active";
  return (
    <AccountCard as="section" aria-labelledby="subscription-status-heading">
      <AccountCardHeader>
        <AccountCardTitle id="subscription-status-heading">
          내 구독
        </AccountCardTitle>
        {active && (
          <span className={styles.label}>구독 중</span>
        )}
      </AccountCardHeader>
      {active ? (
        <>
          <dl className={styles.list}>
            <div className={styles.box}>
              <dt className={styles.term}>이용 중인 상품</dt>
              <dd className={styles.value}>{plan?.name ?? "구독"}</dd>
            </div>
            <div className={styles.box2}>
              <dt className={styles.term2}>남은 기간</dt>
              <dd className={styles.value}>{formatDday(subscription.expiresAt, now)}</dd>
            </div>
            <div className={styles.box3}>
              <dt className={styles.term3}>만료일</dt>
              <dd className={styles.value}>{formatDate(subscription.expiresAt)}</dd>
            </div>
          </dl>
          <p className={styles.text}>만료일까지 구독 혜택을 그대로 쓸 수 있어요.</p>
        </>
      ) : (
        <>
          <p className={styles.value}>구독하지 않았어요</p>
          <p className={styles.text2}>지금은 무료로 모집 글을 올리고 피드백을 받을 수 있어요.</p>
        </>
      )}
    </AccountCard>
  );
}
