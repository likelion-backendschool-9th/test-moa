import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AccessDenied } from "@/components/AccessDenied";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { getWithdrawal, getWithdrawalKeys, isWithdrawalKey, requireAdmin } from "@/features/admin/api";
import { AdminShell, AdminShellSkeleton } from "@/features/admin/components/AdminShell";
import { WithdrawalDetail, WithdrawalDetailSkeleton, WithdrawalResult } from "@/features/admin/components/WithdrawalDetail";
import { WithdrawalForm } from "@/features/admin/components/WithdrawalForm";

export const metadata: Metadata = { title: "출금 요청 상세" };

/* 신고 상세와 같은 이유로 키를 미리 알려 두고, 없는 키는 데이터를 읽기 전에 맞춤 404 화면을 보여 준다 */
export function generateStaticParams() {
  return getWithdrawalKeys().map((withdrawalKey) => ({ withdrawalKey }));
}

export default async function WithdrawalDetailPage({ params }: PageProps<"/admin/withdrawals/[withdrawalKey]">) {
  const { withdrawalKey } = await params;
  if (!isWithdrawalKey(withdrawalKey)) notFound();
  return (
    <Suspense fallback={<AdminShellSkeleton />}>
      <Detail withdrawalKey={withdrawalKey} />
    </Suspense>
  );
}

async function Detail({ withdrawalKey }: { withdrawalKey: string }) {
  if (!(await requireAdmin(`/admin/withdrawals/${withdrawalKey}`))) return <AccessDenied pageName="출금 요청 관리" />;
  return (
    <AdminShell path="/admin/withdrawals" title="출금 요청 관리">
      <Container className="pt-10">
        <div className="flex max-w-3xl flex-col gap-6">
          <Suspense fallback={<WithdrawalDetailSkeleton />}>
            <DetailSlot withdrawalKey={withdrawalKey} />
          </Suspense>
        </div>
      </Container>
    </AdminShell>
  );
}

async function DetailSlot({ withdrawalKey }: { withdrawalKey: string }) {
  const { now, withdrawal } = await getWithdrawal(withdrawalKey);
  if (!withdrawal) return <EmptyState title="출금 요청을 찾을 수 없어요" description="시연용 데이터에 이 요청이 없어요." />;
  return (
    <>
      <WithdrawalDetail withdrawal={withdrawal} now={now} />
      {withdrawal.review ? (
        <WithdrawalResult withdrawal={withdrawal} now={now} />
      ) : (
        <WithdrawalForm withdrawalKey={withdrawal.id} amount={withdrawal.amount} />
      )}
    </>
  );
}
