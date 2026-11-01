import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessDenied } from "@/components/AccessDenied";
import { Container } from "@/components/ui/Container";
import { getWithdrawal, getWithdrawals, isWithdrawalKey, requireAdmin } from "@/features/admin/api";
import { AdminShell, AdminShellSkeleton } from "@/features/admin/components/AdminShell";
import {
  WithdrawalList,
  WithdrawalListSkeleton,
  WithdrawalProcessedNotice,
  WithdrawalTabs,
} from "@/features/admin/components/WithdrawalList";
import type { ListTab } from "@/features/admin/types";

export const metadata: Metadata = { title: "출금 요청 관리" };

/* 신고·제재 관리와 같은 구조다. 세션과 검색 조건은 Suspense 안에서 읽는다 */
export default function WithdrawalsPage({ searchParams }: PageProps<"/admin/withdrawals">) {
  return (
    <Suspense fallback={<AdminShellSkeleton />}>
      <Withdrawals searchParams={searchParams} />
    </Suspense>
  );
}

async function Withdrawals({ searchParams }: { searchParams: PageProps<"/admin/withdrawals">["searchParams"] }) {
  if (!(await requireAdmin("/admin/withdrawals"))) return <AccessDenied pageName="출금 요청 관리" />;
  const params = await searchParams;
  const tab: ListTab = params.tab === "done" ? "done" : "pending";
  const processed = typeof params.processed === "string" && isWithdrawalKey(params.processed) ? params.processed : null;
  return (
    <AdminShell path="/admin/withdrawals" title="출금 요청 관리">
      <Container className="flex flex-col gap-6 pt-10">
        {processed && (
          <Suspense fallback={null}>
            <ProcessedNoticeSlot withdrawalKey={processed} />
          </Suspense>
        )}
        <WithdrawalTabs current={tab} />
        <Suspense key={tab} fallback={<WithdrawalListSkeleton />}>
          <WithdrawalListSlot tab={tab} />
        </Suspense>
      </Container>
    </AdminShell>
  );
}

async function ProcessedNoticeSlot({ withdrawalKey }: { withdrawalKey: string }) {
  const { withdrawal } = await getWithdrawal(withdrawalKey);
  return withdrawal && <WithdrawalProcessedNotice withdrawal={withdrawal} />;
}

async function WithdrawalListSlot({ tab }: { tab: ListTab }) {
  const { now, withdrawals } = await getWithdrawals(tab);
  return <WithdrawalList withdrawals={withdrawals} tab={tab} now={now} />;
}
