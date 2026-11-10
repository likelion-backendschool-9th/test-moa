import type { Metadata } from "next";
import { Suspense } from "react";
import { LinkButton } from "@/components/ui/LinkButton/LinkButton";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { getSubscriptionOverview } from "@/features/subscription/api";
import { usesPlan } from "@/features/subscription/types";
import { PaymentHistory } from "@/app/(site)/my/(account)/subscription/_components/PaymentHistory/PaymentHistory";
import { SubscriptionExpiry } from "@/app/(site)/my/(account)/subscription/_components/SubscriptionExpiry/SubscriptionExpiry";
import { SubscriptionPayment } from "@/app/(site)/my/(account)/subscription/_components/SubscriptionPayment/SubscriptionPayment";
import { SubscriptionStatus } from "@/app/(site)/my/(account)/subscription/_components/SubscriptionStatus/SubscriptionStatus";
import { isBackendAuth } from "@/lib/backend";
import { formatDate } from "@/lib/format";
import { AccountCard } from "@/app/(site)/my/(account)/_components/AccountCard/AccountCard";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "구독" };

type SearchParams = PageProps<"/my/subscription">["searchParams"];

/* 제목은 정적 셸에 두고, 세션을 읽는 본문만 Suspense 안에서 스트리밍한다 */
export default function SubscriptionPage({ searchParams }: PageProps<"/my/subscription">) {
  return (
    <div className={styles.subscriptionPage}>
      <h1 className={styles.subscriptionPageTitle}>구독</h1>
      <Suspense fallback={<SubscriptionSkeleton />}>
        <Overview searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Overview({ searchParams }: { searchParams: SearchParams }) {
  const [{ subscription, plans, payableCredits, now }, { notice }] = await Promise.all([
    getSubscriptionOverview(),
    searchParams,
  ]);
  if (!subscription) {
    return (
      <AccountCard as="section">
        <p className={styles.overviewText}>운영자 계정은 구독 대상이 아니에요</p>
        <div>
          <LinkButton href="/my" variant="secondary" size="sm">
            마이페이지
          </LinkButton>
        </div>
      </AccountCard>
    );
  }
  const active = subscription.status === "active";
  return (
    <div className={styles.overview}>
      {/* 구독 결제에서 돌아왔다 */}
      {notice === "paid" && active && (
        <p role="status" className={styles.overviewText2}>
          결제했어요. {formatDate(subscription.expiresAt)}까지 구독 혜택을 쓸 수 있어요.{!isBackendAuth && " 시연용이라 실제로 결제되지 않고 이 브라우저에만 남아요."}
        </p>
      )}
      <div className={styles.overviewBox}>
        <SubscriptionStatus
          subscription={subscription}
          plan={plans.find((plan) => usesPlan(subscription, plan))}
          now={new Date(now)}
        />
        <SubscriptionPayment plans={plans} payableCredits={payableCredits} active={active} />
      </div>
      {/* 결제 내역은 따로 읽어서, 읽지 못해도 구독 화면은 그대로 열린다 */}
      <Suspense fallback={null}>
        <PaymentHistory />
      </Suspense>
      {active && <SubscriptionExpiry />}
    </div>
  );
}

function SubscriptionSkeleton() {
  return (
    <div aria-busy="true" aria-label="구독 정보 불러오는 중" className={styles.subscriptionSkeleton}>
      <div className={styles.subscriptionSkeletonBox}>
        {Array.from({ length: 2 }, (_, index) => (
          <AccountCard key={index}>
            <Skeleton className={styles.subscriptionSkeletonSkeleton} />
            <Skeleton className={styles.subscriptionSkeletonSkeleton2} />
            <Skeleton className={styles.subscriptionSkeletonSkeleton3} />
          </AccountCard>
        ))}
      </div>
    </div>
  );
}
