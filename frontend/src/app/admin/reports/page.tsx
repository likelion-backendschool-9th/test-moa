import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessDenied } from "@/components/AccessDenied";
import { Container } from "@/components/ui/Container";
import { getReports, requireAdmin } from "@/features/admin/api";
import { AdminShell, AdminShellSkeleton } from "@/features/admin/components/AdminShell";
import { ProcessedNotice, ReportList, ReportListSkeleton, ReportTabs } from "@/features/admin/components/ReportList";
import { isReportDecision, type ListTab } from "@/features/admin/types";

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
  const processed = isReportDecision(params.processed) ? params.processed : null;
  return (
    <AdminShell path="/admin/reports" title="신고·제재 관리">
      <Container className="flex flex-col gap-6 pt-10">
        {processed && <ProcessedNotice decision={processed} held={params.held === "1"} />}
        <ReportTabs current={tab} />
        <Suspense key={tab} fallback={<ReportListSkeleton />}>
          <ReportListSlot tab={tab} />
        </Suspense>
      </Container>
    </AdminShell>
  );
}

async function ReportListSlot({ tab }: { tab: ListTab }) {
  const { now, reports } = await getReports(tab);
  return <ReportList reports={reports} tab={tab} now={now} />;
}
