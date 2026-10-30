import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AccessDenied } from "@/components/AccessDenied";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { getReport, getReportKeys, isReportKey, requireAdmin } from "@/features/admin/api";
import { AdminShell, AdminShellSkeleton } from "@/features/admin/components/AdminShell";
import {
  ReportDetail,
  ReportDetailSkeleton,
  ReviewForm,
  ReviewResult,
  type ReviewFormError,
} from "@/features/admin/components/ReportDetail";

export const metadata: Metadata = { title: "신고 상세" };

/*
 * 신고 키를 미리 알려 두면 params를 Suspense 밖에서 읽을 수 있다. 그래서 없는 키는 데이터를 읽기 전에 맞춤 404 화면을 보여 준다.
 * Partial Prefetching이 켜져 있어 미리 만든 틀이 먼저 나가므로 응답 상태는 200이다(docs/frontend-admin-reports.md S118).
 */
export function generateStaticParams() {
  return getReportKeys().map((reportKey) => ({ reportKey }));
}

export default async function ReportDetailPage({ params, searchParams }: PageProps<"/admin/reports/[reportKey]">) {
  const { reportKey } = await params;
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
  const { error: errorParam } = await searchParams;
  const error: ReviewFormError | null = errorParam === "decision" || errorParam === "memo" ? errorParam : null;
  return (
    <AdminShell path="/admin/reports" title="신고·제재 관리">
      <Container className="pt-10">
        {/* 읽고 판단하는 화면이라 줄 길이를 줄인다 */}
        <div className="flex max-w-3xl flex-col gap-6">
          <Suspense fallback={<ReportDetailSkeleton />}>
            <DetailSlot reportKey={reportKey} error={error} />
          </Suspense>
        </div>
      </Container>
    </AdminShell>
  );
}

async function DetailSlot({ reportKey, error }: { reportKey: string; error: ReviewFormError | null }) {
  const { now, report } = await getReport(reportKey);
  if (!report) return <EmptyState title="신고를 찾을 수 없어요" description="시연용 데이터에 이 신고가 없어요." />;
  return (
    <>
      <ReportDetail report={report} now={now} />
      {report.review ? <ReviewResult report={report} now={now} /> : <ReviewForm report={report} error={error} />}
    </>
  );
}
