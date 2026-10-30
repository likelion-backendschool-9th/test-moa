import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessDenied } from "@/components/AccessDenied";
import { ComingSoon } from "@/components/ComingSoon";
import { requireAdmin } from "@/features/admin/api";
import { AdminShell, AdminShellSkeleton } from "@/features/admin/components/AdminShell";

export const metadata: Metadata = { title: "출금 요청 관리" };

export default function Page() {
  return (
    <Suspense fallback={<AdminShellSkeleton />}>
      <Gate />
    </Suspense>
  );
}

async function Gate() {
  if (!(await requireAdmin("/admin/withdrawals"))) return <AccessDenied pageName="출금 요청 관리" />;
  return (
    <AdminShell path="/admin/withdrawals">
      <ComingSoon pageName="출금 요청 관리" />
    </AdminShell>
  );
}
