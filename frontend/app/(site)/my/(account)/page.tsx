import type { Metadata } from "next";
import { unstable_rethrow } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { getLeaveNotice, getMyPageSummary, getMySanctions } from "@/features/member/api";
import { AccountMenu } from "@/app/(site)/my/(account)/_components/AccountMenu/AccountMenu";
import { getMyReports } from "@/features/report/api";
import { isBackendAuth } from "@/lib/backend";
import { MyReports } from "@/app/(site)/my/(account)/_components/MyReports/MyReports";
import { MySanctions } from "@/app/(site)/my/(account)/_components/MySanctions/MySanctions";
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

/**
 * 카드 하나의 조회 실패가 마이페이지 전체를 오류 화면으로 만들지 않게, 실패하면 "failed"로 바꿔 그 카드만 안내한다.
 * Next의 리다이렉트·동적 렌더링 신호는 그대로 다시 던진다
 */
async function orFailed<T>(load: Promise<T>): Promise<T | "failed"> {
  try {
    return await load;
  } catch (error) {
    unstable_rethrow(error);
    return "failed";
  }
}

async function Dashboard() {
  /* 내 신고·받은 제재는 실제 로그인(AUTH_MODE=backend)에서만 백엔드에서 읽는다(#85·#86) */
  const [summary, notice, reports, sanctions] = await Promise.all([
    getMyPageSummary(),
    getLeaveNotice("/my"),
    isBackendAuth ? orFailed(getMyReports()) : Promise.resolve(null),
    isBackendAuth ? orFailed(getMySanctions()) : Promise.resolve(null),
  ]);
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
      {sanctions && <MySanctions sanctions={sanctions === "failed" ? null : sanctions} />}
      {reports && <MyReports reports={reports === "failed" ? null : reports} />}
      <AccountMenu notice={notice} email={summary.profile.email} providers={summary.profile.providers} />
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
