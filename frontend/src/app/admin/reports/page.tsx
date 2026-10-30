import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessDenied } from "@/components/AccessDenied";
import { ComingSoon } from "@/components/ComingSoon";
import { requireAdmin } from "@/features/admin/api";
import { AdminShell, AdminShellSkeleton } from "@/features/admin/components/AdminShell";

export const metadata: Metadata = { title: "신고·제재 관리" };

export default function Page() {
  return (
    <Suspense fallback={<AdminShellSkeleton />}>
      <Gate />
    </Suspense>
  );
}

async function Gate() {
  if (!(await requireAdmin("/admin/reports"))) return <AccessDenied pageName="신고·제재 관리" />;
  return (
    <AdminShell path="/admin/reports">
      <ComingSoon pageName="신고·제재 관리" />
    </AdminShell>
  );
}
