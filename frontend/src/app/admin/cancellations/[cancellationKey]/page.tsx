import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AccessDenied } from "@/components/AccessDenied";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { getCancellation, getCancellationKeys, isCancellationKey, requireAdmin } from "@/features/admin/api";
import { AdminShell, AdminShellSkeleton } from "@/features/admin/components/AdminShell";
import { CancellationDetail, CancellationDetailSkeleton, CancellationResult } from "@/features/admin/components/CancellationDetail";
import { CancellationForm } from "@/features/admin/components/CancellationForm";

export const metadata: Metadata = { title: "모집 취소 요청 상세" };

/* 신고 상세와 같은 이유로 키를 미리 알려 두고, 없는 키는 데이터를 읽기 전에 맞춤 404 화면을 보여 준다 */
export function generateStaticParams() {
  return getCancellationKeys().map((cancellationKey) => ({ cancellationKey }));
}

export default async function CancellationDetailPage({ params }: PageProps<"/admin/cancellations/[cancellationKey]">) {
  const { cancellationKey } = await params;
  if (!isCancellationKey(cancellationKey)) notFound();
  return (
    <Suspense fallback={<AdminShellSkeleton />}>
      <Detail cancellationKey={cancellationKey} />
    </Suspense>
  );
}

async function Detail({ cancellationKey }: { cancellationKey: string }) {
  if (!(await requireAdmin(`/admin/cancellations/${cancellationKey}`))) return <AccessDenied pageName="모집 취소 요청 관리" />;
  return (
    <AdminShell path="/admin/cancellations" title="모집 취소 요청 관리">
      <Container className="pt-10">
        <div className="flex max-w-3xl flex-col gap-6">
          <Suspense fallback={<CancellationDetailSkeleton />}>
            <DetailSlot cancellationKey={cancellationKey} />
          </Suspense>
        </div>
      </Container>
    </AdminShell>
  );
}

async function DetailSlot({ cancellationKey }: { cancellationKey: string }) {
  const { now, cancellation } = await getCancellation(cancellationKey);
  if (!cancellation) return <EmptyState title="모집 취소 요청을 찾을 수 없어요" description="시연용 데이터에 이 요청이 없어요." />;
  return (
    <>
      <CancellationDetail cancellation={cancellation} now={now} />
      {cancellation.review ? (
        <CancellationResult cancellation={cancellation} now={now} />
      ) : (
        <CancellationForm cancellationKey={cancellation.id} confirmedCount={cancellation.confirmedCount} />
      )}
    </>
  );
}
