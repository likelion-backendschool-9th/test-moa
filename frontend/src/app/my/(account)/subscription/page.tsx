import type { Metadata } from "next";
import { Suspense } from "react";
import { LinkButton } from "@/components/ui/LinkButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { getSubscriptionOverview } from "@/features/my/api";
import { cardClass } from "@/features/my/components/card-styles";
import { PlanComparison } from "@/features/my/components/PlanComparison";
import { SubscriptionExpiry } from "@/features/my/components/SubscriptionExpiry";
import { SubscriptionPayment } from "@/features/my/components/SubscriptionPayment";
import { SubscriptionStatus } from "@/features/my/components/SubscriptionStatus";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "구독" };

type SearchParams = PageProps<"/my/subscription">["searchParams"];

/* 제목은 정적 셸에 두고, 세션을 읽는 본문만 Suspense 안에서 스트리밍한다 */
export default function SubscriptionPage({ searchParams }: PageProps<"/my/subscription">) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold tracking-[-0.03em]">구독</h1>
      <Suspense fallback={<SubscriptionSkeleton />}>
        <Overview searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Overview({ searchParams }: { searchParams: SearchParams }) {
  const [{ subscription, freePlan, plans, recruitQuota, payableCredits, now }, { notice }] = await Promise.all([
    getSubscriptionOverview(),
    searchParams,
  ]);
  if (!subscription) {
    return (
      <section className={cardClass}>
        <p className="text-lg font-extrabold">운영자 계정은 구독 대상이 아니에요</p>
        <div>
          <LinkButton href="/my" variant="secondary" size="sm">
            마이페이지
          </LinkButton>
        </div>
      </section>
    );
  }
  const active = subscription.status === "active";
  const currentPlanId = active ? subscription.planId : null;
  return (
    <div className="flex flex-col gap-4">
      {/* 구독 결제에서 돌아왔다 */}
      {notice === "paid" && active && (
        <p role="status" className="rounded-2xl bg-accent-soft px-5 py-4 text-sm font-semibold text-accent">
          결제했어요. {formatDate(subscription.expiresAt)}까지 구독 혜택을 쓸 수 있어요. 시연용이라 실제로 결제되지 않고 이 브라우저에만 남아요.
        </p>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <SubscriptionStatus
          subscription={subscription}
          plan={plans.find((plan) => plan.id === currentPlanId)}
          recruitQuota={recruitQuota}
          upgradeLimit={Math.max(...plans.map((plan) => plan.monthlyLimit))}
          now={new Date(now)}
        />
        <SubscriptionPayment plans={plans} payableCredits={payableCredits} active={active} />
      </div>
      <PlanComparison freePlan={freePlan} plans={plans} currentPlanId={currentPlanId} />
      {active && <SubscriptionExpiry />}
    </div>
  );
}

function SubscriptionSkeleton() {
  return (
    <div aria-busy="true" aria-label="구독 정보 불러오는 중" className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} className={cardClass}>
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-full max-w-sm" />
          </div>
        ))}
      </div>
      <div className={cardClass}>
        <Skeleton className="h-6 w-24" />
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-8 w-full" />
        ))}
      </div>
    </div>
  );
}
