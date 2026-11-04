import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessDenied } from "@/components/AccessDenied";
import { Container } from "@/components/ui/Container";
import { getCancellation, getCancellations, isCancellationKey, requireAdmin } from "@/features/admin/api";
import { AdminShell, AdminShellSkeleton } from "@/features/admin/components/AdminShell";
import {
  CancellationList,
  CancellationListSkeleton,
  CancellationProcessedNotice,
  CancellationTabs,
} from "@/features/admin/components/CancellationList";
import type { ListTab } from "@/features/admin/types";

export const metadata: Metadata = { title: "모집 취소 요청 관리" };

/* 출금 요청 관리와 같은 구조다. 세션과 검색 조건은 Suspense 안에서 읽는다 */
export default function CancellationsPage({ searchParams }: PageProps<"/admin/cancellations">) {
  return (
    <Suspense fallback={<AdminShellSkeleton />}>
      <Cancellations searchParams={searchParams} />
    </Suspense>
  );
}

async function Cancellations({ searchParams }: { searchParams: PageProps<"/admin/cancellations">["searchParams"] }) {
  if (!(await requireAdmin("/admin/cancellations"))) return <AccessDenied pageName="모집 취소 요청 관리" />;
  const params = await searchParams;
  const tab: ListTab = params.tab === "done" ? "done" : "pending";
  const processed = typeof params.processed === "string" && isCancellationKey(params.processed) ? params.processed : null;
  return (
    <AdminShell path="/admin/cancellations" title="모집 취소 요청 관리">
      <Container className="flex flex-col gap-6 pt-10">
        {processed && (
          <Suspense fallback={null}>
            <ProcessedNoticeSlot cancellationKey={processed} />
          </Suspense>
        )}
        <CancellationTabs current={tab} />
        <Suspense key={tab} fallback={<CancellationListSkeleton />}>
          <CancellationListSlot tab={tab} />
        </Suspense>
      </Container>
    </AdminShell>
  );
}

async function ProcessedNoticeSlot({ cancellationKey }: { cancellationKey: string }) {
  const { cancellation } = await getCancellation(cancellationKey);
  return cancellation && <CancellationProcessedNotice cancellation={cancellation} />;
}

async function CancellationListSlot({ tab }: { tab: ListTab }) {
  const { now, cancellations } = await getCancellations(tab);
  return <CancellationList cancellations={cancellations} tab={tab} now={now} />;
}
