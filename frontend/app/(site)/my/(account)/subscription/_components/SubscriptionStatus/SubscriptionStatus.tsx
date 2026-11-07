import { formatDate, formatDday } from "@/lib/format";
import type { RecruitQuota, Subscription, SubscriptionPlan } from "@/features/subscription/types";
import { cardClass, cardHeaderClass, cardTitleClass } from "../../../_components/card-styles";

/** 값은 모두 같은 크기로, 이름은 그 위에 작게 둔다 */
const valueClass = "text-2xl font-extrabold tracking-[-0.03em] tabular-nums";

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
    <section aria-labelledby="subscription-status-heading" className={cardClass}>
      <div className={cardHeaderClass}>
        <h2 id="subscription-status-heading" className={cardTitleClass}>
          내 구독
        </h2>
        {active && (
          <span className="rounded-full bg-accent-soft px-3 py-1 text-sm font-extrabold text-accent">구독 중</span>
        )}
      </div>
      {active ? (
        <>
          <dl className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1">
              <dt className="text-sm text-text-muted">이용 중인 상품</dt>
              <dd className={valueClass}>{plan?.name ?? "구독"}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-sm text-text-muted">남은 기간</dt>
              <dd className={valueClass}>{formatDday(subscription.expiresAt, now)}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-sm text-text-muted">만료일</dt>
              <dd className={valueClass}>{formatDate(subscription.expiresAt)}</dd>
            </div>
          </dl>
          <p className="text-sm text-text-muted">만료일까지 구독 혜택을 그대로 쓸 수 있어요.</p>
        </>
      ) : (
        <>
          <p className={valueClass}>구독하지 않았어요</p>
          <p className="text-sm text-text-muted">지금은 무료로 모집 글을 올리고 피드백을 받을 수 있어요.</p>
        </>
      )}
      <QuotaMeter quota={recruitQuota} hint={active ? null : `구독하면 월 ${upgradeLimit}명까지 모집할 수 있어요.`} />
    </section>
  );
}

/** 이번 달 모집 인원 사용량. 구독 혜택 가운데 남은 양이 있는 것은 이것뿐이다 */
function QuotaMeter({ quota, hint }: { quota: RecruitQuota; hint: string | null }) {
  const left = Math.max(quota.limit - quota.used, 0);
  const percent = Math.min((quota.used / quota.limit) * 100, 100);
  return (
    <div className="mt-auto flex flex-col gap-2 border-t border-line pt-4">
      <div className="flex items-baseline justify-between gap-4">
        <h3 id="recruit-quota-heading" className="text-sm text-text-muted">
          이번 달 모집 인원
        </h3>
        <p className={valueClass}>{left}명 남음</p>
      </div>
      <div
        role="meter"
        aria-labelledby="recruit-quota-heading"
        aria-valuemin={0}
        aria-valuemax={quota.limit}
        aria-valuenow={quota.used}
        aria-valuetext={`${quota.limit}명 중 ${quota.used}명 사용`}
        className="h-2 overflow-hidden rounded-full bg-surface-strong"
      >
        <div className="h-full rounded-full bg-text" style={{ width: `${percent}%` }} />
      </div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm text-text-muted">
        <span className="tabular-nums">
          {quota.used} / {quota.limit}명
        </span>
        <span>{formatDate(quota.resetsAt)}에 다시 채워져요</span>
      </div>
      {hint && <p className="text-sm text-text-muted">{hint}</p>}
    </div>
  );
}
