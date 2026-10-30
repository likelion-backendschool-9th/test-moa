import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessDenied } from "@/components/AccessDenied";
import { ComingSoon } from "@/components/ComingSoon";
import { requireAdmin } from "@/features/admin/api";
import { AdminShell, AdminShellSkeleton } from "@/features/admin/components/AdminShell";

export const metadata: Metadata = { title: "회원 관리" };

export default function Page() {
  return (
    <Suspense fallback={<AdminShellSkeleton />}>
      <Gate />
    </Suspense>
  );
}

async function Gate() {
  if (!(await requireAdmin("/admin/users"))) return <AccessDenied pageName="회원 관리" />;
  return (
    <AdminShell path="/admin/users">
      <ComingSoon pageName="회원 관리" />
    </AdminShell>
  );
}
