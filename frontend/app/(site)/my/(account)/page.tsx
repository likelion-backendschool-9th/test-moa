import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { getMyPageSummary } from "@/features/member/api";
import { ActivitySummary } from "@/app/(site)/my/(account)/_components/ActivitySummary/ActivitySummary";
import { CreditSummaryCard } from "@/app/(site)/my/(account)/_components/CreditSummaryCard/CreditSummaryCard";
import { ProfileHeader } from "@/app/(site)/my/(account)/_components/ProfileHeader/ProfileHeader";
import { RecentCredits } from "@/app/(site)/my/(account)/_components/RecentCredits/RecentCredits";
import { SubscriptionCard } from "@/app/(site)/my/(account)/_components/SubscriptionCard/SubscriptionCard";
import { TodoList } from "@/app/(site)/my/(account)/_components/TodoList/TodoList";
import { AccountCard } from "@/app/(site)/my/(account)/_components/AccountCard/AccountCard";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "마이페이지" };

/* 제목은 정적 셸에 두고, 세션을 읽는 대시보드만 Suspense 안에서 스트리밍한다 */
export default function MyPage() {
  return (
    <div className={styles.myPage}>
      <h1 className={styles.myPageTitle}>마이페이지</h1>
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard />
      </Suspense>
    </div>
  );
}

async function Dashboard() {
  const summary = await getMyPageSummary();
  return (
    <div className={styles.dashboard}>
      <ProfileHeader profile={summary.profile} />
      <TodoList todos={summary.todos} />
      {summary.activity && <ActivitySummary activity={summary.activity} />}
      <div className={styles.dashboardBox}>
        <CreditSummaryCard credits={summary.credits} />
        {summary.subscription && <SubscriptionCard subscription={summary.subscription} />}
      </div>
      <RecentCredits entries={summary.recentCredits} now={new Date()} />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="마이페이지 불러오는 중" className={styles.dashboardSkeleton}>
      <AccountCard>
        <Skeleton className={styles.dashboardSkeletonSkeleton} />
        <Skeleton className={styles.dashboardSkeletonSkeleton2} />
      </AccountCard>
      <AccountCard>
        <Skeleton className={styles.dashboardSkeletonSkeleton3} />
        <Skeleton className={styles.dashboardSkeletonSkeleton4} />
        <Skeleton className={styles.dashboardSkeletonSkeleton5} />
      </AccountCard>
      <div className={styles.dashboardSkeletonBox}>
        {Array.from({ length: 2 }, (_, index) => (
          <AccountCard key={index}>
            <Skeleton className={styles.dashboardSkeletonSkeleton6} />
            <Skeleton className={styles.dashboardSkeletonSkeleton7} />
            <Skeleton className={styles.dashboardSkeletonSkeleton8} />
          </AccountCard>
        ))}
      </div>
    </div>
  );
}
