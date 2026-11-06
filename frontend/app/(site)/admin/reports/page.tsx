import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessDenied } from "@/app/(site)/admin/_components/AccessDenied";
import { Container } from "@/components/ui/Container";
import { getReports, requireAdmin } from "@/features/admin/api";
import { AdminShell, AdminShellSkeleton } from "@/app/(site)/admin/_components/AdminShell";
import { ProcessedNotice, ReportList, ReportListSkeleton, ReportTabs, ReportTargetFilters } from "@/app/(site)/admin/reports/_components/ReportList";
import { isReportDecision, parseReportTargetFilter, type ListTab, type ReportTargetFilter } from "@/features/admin/types";

export const metadata: Metadata = { title: "신고·제재 관리" };

/* 세션과 검색 조건은 Suspense 안에서 읽는다. 권한 확인 전에는 제목·탭 자리 스켈레톤만 보인다 */
export default function ReportsPage({ searchParams }: PageProps<"/admin/reports">) {
  return (
    <Suspense fallback={<AdminShellSkeleton />}>
      <Reports searchParams={searchParams} />
    </Suspense>
  );
}

async function Reports({ searchParams }: { searchParams: PageProps<"/admin/reports">["searchParams"] }) {
  if (!(await requireAdmin("/admin/reports"))) return <AccessDenied pageName="신고·제재 관리" />;
  const params = await searchParams;
  const tab: ListTab = params.tab === "done" ? "done" : "pending";
  const target = parseReportTargetFilter(params.target);
  const processed = isReportDecision(params.processed) ? params.processed : null;
  return (
    <AdminShell path="/admin/reports" title="신고·제재 관리">
      <Container className="flex flex-col gap-6 pt-10">
        {processed && <ProcessedNotice decision={processed} held={params.held === "1"} />}
        <ReportTabs current={tab} target={target} />
        <ReportTargetFilters tab={tab} current={target} />
        <Suspense key={`${tab}-${target}`} fallback={<ReportListSkeleton />}>
          <ReportListSlot tab={tab} target={target} />
        </Suspense>
      </Container>
    </AdminShell>
  );
}

async function ReportListSlot({ tab, target }: { tab: ListTab; target: ReportTargetFilter }) {
  const { now, reports } = await getReports(tab, target);
  return <ReportList reports={reports} tab={tab} target={target} now={now} />;
}
