import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessDenied } from "@/app/(site)/admin/_components/AccessDenied/AccessDenied";
import { Container } from "@/components/ui/Container/Container";
import { getAdminSummary, getOldestPending, getRecentRequests } from "@/app/(site)/admin/_lib/summary";
import { requireAdmin } from "@/features/session/guard";
import { AdminShell, AdminShellSkeleton } from "@/app/(site)/admin/_components/AdminShell/AdminShell";
import { OldestPendingPanel, OldestPendingPanelSkeleton } from "@/app/(site)/admin/_components/OldestPendingPanel/OldestPendingPanel";
import { PendingSummary, PendingSummarySkeleton } from "@/app/(site)/admin/_components/PendingSummary/PendingSummary";
import { RecentRequests, RecentRequestsSkeleton } from "@/app/(site)/admin/_components/RecentRequests/RecentRequests";

export const metadata: Metadata = { title: "운영자 홈" };

/* 세션(쿠키)은 Suspense 안에서만 읽는다. 권한 확인 전에는 제목·탭 자리 스켈레톤만 보인다 */
export default function AdminHomePage() {
  return (
    <Suspense fallback={<AdminShellSkeleton />}>
      <AdminHome />
    </Suspense>
  );
}

async function AdminHome() {
  if (!(await requireAdmin("/admin"))) return <AccessDenied pageName="운영자 페이지" />;
  return (
    <AdminShell path="/admin" title="운영자 홈">
      <Container className="flex flex-col gap-20 pt-10">
        <Suspense fallback={<PendingSummarySkeleton />}>
          <SummarySlot />
        </Suspense>
        <Suspense fallback={<OldestPendingPanelSkeleton />}>
          <OldestSlot />
        </Suspense>
        <Suspense fallback={<RecentRequestsSkeleton />}>
          <RecentSlot />
        </Suspense>
      </Container>
    </AdminShell>
  );
}

async function SummarySlot() {
  return <PendingSummary summary={await getAdminSummary()} />;
}

async function OldestSlot() {
  const { now, items } = await getOldestPending(5);
  return <OldestPendingPanel items={items} now={now} />;
}

async function RecentSlot() {
  return <RecentRequests {...await getRecentRequests(3)} />;
}
