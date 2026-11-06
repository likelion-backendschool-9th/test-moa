import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { getMyPageSummary } from "@/features/my/api";
import { ActivitySummary } from "@/features/my/components/ActivitySummary";
import { cardClass } from "@/features/my/components/card-styles";
import { CreditSummaryCard } from "@/features/my/components/CreditSummaryCard";
import { ProfileHeader } from "@/features/my/components/ProfileHeader";
import { RecentCredits } from "@/features/my/components/RecentCredits";
import { SubscriptionCard } from "@/features/my/components/SubscriptionCard";
import { TodoList } from "@/features/my/components/TodoList";

export const metadata: Metadata = { title: "마이페이지" };

/* 제목은 정적 셸에 두고, 세션을 읽는 대시보드만 Suspense 안에서 스트리밍한다 */
export default function MyPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold tracking-[-0.03em]">마이페이지</h1>
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard />
      </Suspense>
    </div>
  );
}

async function Dashboard() {
  const summary = await getMyPageSummary();
  return (
    <div className="flex flex-col gap-4">
      <ProfileHeader profile={summary.profile} />
      <TodoList todos={summary.todos} />
      {summary.activity && <ActivitySummary activity={summary.activity} />}
      <div className="grid gap-4 md:grid-cols-2">
        <CreditSummaryCard credits={summary.credits} />
        {summary.subscription && <SubscriptionCard subscription={summary.subscription} />}
      </div>
      <RecentCredits entries={summary.recentCredits} now={new Date()} />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="마이페이지 불러오는 중" className="flex flex-col gap-4">
      <div className={cardClass}>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-2 w-full max-w-md" />
      </div>
      <div className={cardClass}>
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} className={cardClass}>
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-9 w-28" />
          </div>
        ))}
      </div>
    </div>
  );
}
