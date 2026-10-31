import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessDenied } from "@/components/AccessDenied";
import { ComingSoon } from "@/components/ComingSoon";
import { requireAdmin } from "@/features/admin/api";
import { AdminShell, AdminShellSkeleton } from "@/features/admin/components/AdminShell";

export const metadata: Metadata = { title: "모집 취소 요청 관리" };

export default function Page() {
  return (
    <Suspense fallback={<AdminShellSkeleton />}>
      <Gate />
    </Suspense>
  );
}

async function Gate() {
  if (!(await requireAdmin("/admin/cancellations"))) return <AccessDenied pageName="모집 취소 요청 관리" />;
  return (
    <AdminShell path="/admin/cancellations">
      <ComingSoon pageName="모집 취소 요청 관리" />
    </AdminShell>
  );
}
