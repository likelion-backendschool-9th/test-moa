import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessDenied } from "@/app/(site)/admin/_components/AccessDenied/AccessDenied";
import { Container } from "@/components/ui/Container/Container";
import {
  getAdminWithdrawal as getWithdrawal,
  getAdminWithdrawals as getWithdrawals,
  isWithdrawalKey,
} from "@/features/credit/api";
import { requireAdmin } from "@/features/session/guard";
import { AdminShell, AdminShellSkeleton } from "@/app/(site)/admin/_components/AdminShell/AdminShell";
import {
  WithdrawalList,
  WithdrawalListSkeleton,
  WithdrawalModalSkeleton,
  WithdrawalProcessedNotice,
  WithdrawalTabs,
} from "@/app/(site)/admin/withdrawals/_components/WithdrawalList/WithdrawalList";
import { WithdrawalModalContent } from "@/app/(site)/admin/withdrawals/_components/WithdrawalModalContent/WithdrawalModalContent";
import { withdrawalsHref } from "@/features/credit/paths";
import { type ListTab } from "@/features/credit/paths";

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
  const params = await searchParams;
  const tab: ListTab = params.tab === "done" ? "done" : "pending";
  const openKey = typeof params.open === "string" && isWithdrawalKey(params.open) ? params.open : null;
  const processed = typeof params.processed === "string" && isWithdrawalKey(params.processed) ? params.processed : null;
  const gatePath = withdrawalsHref({ tab, ...(openKey ? { open: openKey } : {}) });
  if (!(await requireAdmin(gatePath))) return <AccessDenied pageName="출금 요청 관리" />;
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
        {openKey && (
          <Suspense key={openKey} fallback={<WithdrawalModalSkeleton />}>
            <WithdrawalModalSlot withdrawalKey={openKey} tab={tab} />
          </Suspense>
        )}
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

async function WithdrawalModalSlot({ withdrawalKey, tab }: { withdrawalKey: string; tab: ListTab }) {
  const { now, withdrawal } = await getWithdrawal(withdrawalKey);
  if (!withdrawal) return null;
  return <WithdrawalModalContent withdrawal={withdrawal} now={now} tab={tab} />;
}
