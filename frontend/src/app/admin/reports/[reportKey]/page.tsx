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

/* 키를 미리 알려 두고, 없는 키는 데이터를 읽기 전에 맞춤 404 화면을 보여 준다(docs/frontend-admin-reports.md S427) */
export function generateStaticParams() {
  return getReportKeys().map((reportKey) => ({ reportKey }));
}

/*
 * params는 주소마다 달라서, generateStaticParams로 키를 알려 둬도 Suspense 안에서 읽는다.
 * 밖에서 읽으면 링크마다 같이 쓰는 앱 셸이 주소에 묶여 instant-shell-url-data 진단이 나온다
 * (Next 문서 02-guides/optimizing-prefetching.md, adopting-partial-prefetching.md).
 */
export default function ReportDetailPage({ params, searchParams }: PageProps<"/admin/reports/[reportKey]">) {
  return (
    <Suspense fallback={<AdminShellSkeleton />}>
      <Detail params={params} searchParams={searchParams} />
    </Suspense>
  );
}

type DetailProps = Pick<PageProps<"/admin/reports/[reportKey]">, "params" | "searchParams">;

async function Detail({ params, searchParams }: DetailProps) {
  const { reportKey } = await params;
  if (!isReportKey(reportKey)) notFound();
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
