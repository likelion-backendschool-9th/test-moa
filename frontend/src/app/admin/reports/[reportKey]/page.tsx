import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AccessDenied } from "@/components/AccessDenied";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { getReport, getReportKeys, isReportKey, requireAdmin } from "@/features/admin/api";
import { AdminShell, AdminShellSkeleton } from "@/features/admin/components/AdminShell";
import { ReportDetail, ReportDetailSkeleton, ReviewForm, ReviewResult } from "@/features/admin/components/ReportDetail";

export const metadata: Metadata = { title: "신고 상세" };

/* 신고 키를 미리 알려 두면 params를 Suspense 밖에서 읽을 수 있다. 그래야 없는 키에 404를 보낸다 */
export function generateStaticParams() {
  return getReportKeys().map((reportKey) => ({ reportKey }));
}

export default async function ReportDetailPage({ params, searchParams }: PageProps<"/admin/reports/[reportKey]">) {
  const { reportKey } = await params;
  /* 응답이 시작되기 전에 불러야 404 상태가 나간다 */
  if (!isReportKey(reportKey)) notFound();
  return (
    <Suspense fallback={<AdminShellSkeleton />}>
      <Detail reportKey={reportKey} searchParams={searchParams} />
    </Suspense>
  );
}

type DetailProps = {
  reportKey: string;
  searchParams: PageProps<"/admin/reports/[reportKey]">["searchParams"];
};

async function Detail({ reportKey, searchParams }: DetailProps) {
  if (!(await requireAdmin(`/admin/reports/${reportKey}`))) return <AccessDenied pageName="신고·제재 관리" />;
  const showError = (await searchParams).error === "decision";
  return (
    <AdminShell path="/admin/reports" title="신고·제재 관리">
      <Container className="pt-10">
        {/* 읽고 판단하는 화면이라 줄 길이를 줄인다 */}
        <div className="flex max-w-3xl flex-col gap-6">
          <Suspense fallback={<ReportDetailSkeleton />}>
            <DetailSlot reportKey={reportKey} showError={showError} />
          </Suspense>
        </div>
      </Container>
    </AdminShell>
  );
}

async function DetailSlot({ reportKey, showError }: { reportKey: string; showError: boolean }) {
  const { now, report } = await getReport(reportKey);
  if (!report) return <EmptyState title="신고를 찾을 수 없어요" description="시연용 데이터에 이 신고가 없어요." />;
  return (
    <>
      <ReportDetail report={report} now={now} />
      {report.review ? <ReviewResult report={report} now={now} /> : <ReviewForm report={report} showError={showError} />}
    </>
  );
}
