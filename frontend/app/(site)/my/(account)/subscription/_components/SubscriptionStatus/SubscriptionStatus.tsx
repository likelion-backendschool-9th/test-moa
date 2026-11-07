import { formatDate, formatDday } from "@/lib/format";
import type { RecruitQuota, Subscription, SubscriptionPlan } from "@/features/subscription/types";
import { AccountCard, AccountCardHeader, AccountCardTitle } from "@/app/(site)/my/(account)/_components/AccountCard/AccountCard";
import styles from "./SubscriptionStatus.module.css";

/** 내 구독 상태. 구독 중이면 이용 중인 상품, 남은 기간, 만료일을 보여 준다 */
export function SubscriptionStatus({
  subscription,
  plan,
  recruitQuota,
  upgradeLimit,
  now,
}: {
  subscription: Subscription;
  /** 구독 중인 상품. 미구독이면 없다 */
  plan?: SubscriptionPlan;
  recruitQuota: RecruitQuota;
  /** 구독하면 늘어나는 한도. 미구독 회원에게 안내한다 */
  upgradeLimit: number;
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
      <QuotaMeter quota={recruitQuota} hint={active ? null : `구독하면 월 ${upgradeLimit}명까지 모집할 수 있어요.`} />
    </AccountCard>
  );
}

/** 이번 달 모집 인원 사용량. 구독 혜택 가운데 남은 양이 있는 것은 이것뿐이다 */
function QuotaMeter({ quota, hint }: { quota: RecruitQuota; hint: string | null }) {
  const left = Math.max(quota.limit - quota.used, 0);
  const percent = Math.min((quota.used / quota.limit) * 100, 100);
  return (
    <div className={styles.quotaMeter}>
      <div className={styles.quotaMeterBox}>
        <h3 id="recruit-quota-heading" className={styles.quotaMeterTitle}>
          이번 달 모집 인원
        </h3>
        <p className={styles.value}>{left}명 남음</p>
      </div>
      <div
        role="meter"
        aria-labelledby="recruit-quota-heading"
        aria-valuemin={0}
        aria-valuemax={quota.limit}
        aria-valuenow={quota.used}
        aria-valuetext={`${quota.limit}명 중 ${quota.used}명 사용`}
        className={styles.quotaMeterBox2}
      >
        <div className={styles.quotaMeterBox3} style={{ width: `${percent}%` }} />
      </div>
      <div className={styles.quotaMeterBox4}>
        <span className={styles.quotaMeterLabel}>
          {quota.used} / {quota.limit}명
        </span>
        <span>{formatDate(quota.resetsAt)}에 다시 채워져요</span>
      </div>
      {hint && <p className={styles.quotaMeterHint}>{hint}</p>}
    </div>
  );
}
