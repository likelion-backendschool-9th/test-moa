import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { PARTICIPATIONS_PATH, participationsPath } from "@/lib/participation-paths";
import { Container } from "@/components/ui/Container";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  getParticipationCounts,
  getParticipations,
  getParticipationSummary,
  getUpcomingDeadlines,
} from "@/features/participation/api";
import { DeadlinePanel, DeadlinePanelSkeleton } from "@/features/participation/components/DeadlinePanel";
import { NoParticipations, ParticipationList } from "@/features/participation/components/ParticipationList";
import { ParticipationSkeleton } from "@/features/participation/components/ParticipationSkeleton";
import { ParticipationTabs } from "@/features/participation/components/ParticipationTabs";
import { parseParticipationTab, type ParticipationTab, type ParticipationView } from "@/features/participation/types";
import { readParticipationView } from "@/features/participation/view-preference";
import { formatCredits } from "@/lib/format";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "참여 테스트" };

type SearchParams = PageProps<"/testers/recruitments">["searchParams"];

/* 제목과 탭은 데이터를 기다리지 않고, 요약·마감 일정·목록만 Suspense 안에서 스트리밍된다 */
export default function ParticipationsPage({ searchParams }: PageProps<"/testers/recruitments">) {
  return (
    <Container className="flex flex-col gap-8 pt-8">
      <Suspense fallback={null}>
        <LoginGate searchParams={searchParams} />
      </Suspense>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-[-0.03em]">참여 테스트</h1>
        <Suspense fallback={<Skeleton className="h-5 w-64 max-w-full" />}>
          <SummarySlot />
        </Suspense>
      </div>
      <Suspense fallback={<DeadlinePanelSkeleton />}>
        <DeadlineSlot />
      </Suspense>
      <div className="flex flex-col gap-6">
        <Suspense fallback={<ParticipationTabs />}>
          <TabsSlot searchParams={searchParams} />
        </Suspense>
        {/* 처음 보내는 HTML에서는 고른 보기 방식(쿠키)을 몰라서 스켈레톤은 ListSlot 안에서만 그린다 */}
        <Suspense fallback={null}>
          <ListSlot searchParams={searchParams} />
        </Suspense>
      </div>
    </Container>
  );
}

/** 비로그인은 로그인으로 보낸다. 돌아올 주소에 탭까지 남긴다 */
async function LoginGate({ searchParams }: { searchParams: SearchParams }) {
  const [session, params] = await Promise.all([getSession(), searchParams]);
  if (session.role !== "guest") return null;
  const tab = parseParticipationTab(params.tab);
  const path = params.tab === tab ? participationsPath(tab) : PARTICIPATIONS_PATH;
  redirect(`/login?next=${encodeURIComponent(path)}`);
}

async function SummarySlot() {
  const summary = await getParticipationSummary();
  return (
    <p className="text-sm text-text-muted">
      제출할 피드백 <span className="font-semibold text-text tabular-nums">{summary.feedbackToSubmit}개</span> · 지급 대기{" "}
      <span className="font-semibold text-text tabular-nums">{formatCredits(summary.payoutPendingCredits)}</span>
    </p>
  );
}

async function DeadlineSlot() {
  const items = await getUpcomingDeadlines();
  if (items.length === 0) return null;
  await connection();
  return <DeadlinePanel items={items} now={new Date()} />;
}

async function TabsSlot({ searchParams }: { searchParams: SearchParams }) {
  const tab = parseParticipationTab((await searchParams).tab);
  return (
    <Suspense fallback={<ParticipationTabs active={tab} />}>
      <TabsWithCounts tab={tab} />
    </Suspense>
  );
}

async function TabsWithCounts({ tab }: { tab: ParticipationTab }) {
  return <ParticipationTabs active={tab} counts={await getParticipationCounts()} />;
}

/* 고른 보기 방식은 바로 읽히므로, 데이터를 기다리는 동안 같은 배치의 스켈레톤을 보여 준다 */
async function ListSlot({ searchParams }: { searchParams: SearchParams }) {
  const [params, view] = await Promise.all([searchParams, readParticipationView()]);
  const tab = parseParticipationTab(params.tab);
  return (
    <Suspense fallback={<ParticipationSkeleton view={view} />}>
      <ListWithData tab={tab} urlTab={params.tab === tab ? tab : undefined} view={view} />
    </Suspense>
  );
}

type ListWithDataProps = { tab: ParticipationTab; urlTab?: ParticipationTab; view: ParticipationView };

async function ListWithData({ tab, urlTab, view }: ListWithDataProps) {
  const [session, items] = await Promise.all([getSession(), getParticipations(tab)]);
  if (session.role !== "tester") return <NoParticipations />;
  await connection();
  return <ParticipationList tab={tab} view={view} urlTab={urlTab} items={items} now={new Date()} />;
}
