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

export const metadata: Metadata = { title: "구독" };

/* 제목은 정적 셸에 두고, 세션을 읽는 본문만 Suspense 안에서 스트리밍한다 */
export default function SubscriptionPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold tracking-[-0.03em]">구독</h1>
      <Suspense fallback={<SubscriptionSkeleton />}>
        <Overview />
      </Suspense>
    </div>
  );
}

async function Overview() {
  const { subscription, freePlan, plans, recruitQuota, payableCredits, now } = await getSubscriptionOverview();
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
      <div className="grid gap-4 lg:grid-cols-2">
        <SubscriptionStatus
          subscription={subscription}
          plan={plans.find((plan) => plan.id === currentPlanId)}
          recruitQuota={recruitQuota}
          upgradeLimit={Math.max(...plans.map((plan) => plan.monthlyLimit))}
          now={new Date(now)}
        />
        <SubscriptionPayment plans={plans} payableCredits={payableCredits} />
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
