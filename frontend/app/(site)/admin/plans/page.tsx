import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessDenied } from "@/app/(site)/admin/_components/AccessDenied/AccessDenied";
import { AdminShell, AdminShellSkeleton } from "@/app/(site)/admin/_components/AdminShell/AdminShell";
import { PlanMockNotice, PlanTerms, PlanTermsSkeleton } from "@/app/(site)/admin/plans/_components/PlanTerms/PlanTerms";
import { Container } from "@/components/ui/Container/Container";
import { requireAdmin } from "@/features/session/guard";
import { isBackendAuth } from "@/lib/backend";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "플랜 관리" };

/* 세션은 Suspense 안에서 읽는다. 현재 값은 서버에서 읽어 양식에 채운다 */
export default function PlansPage() {
  return (
    <Suspense fallback={<AdminShellSkeleton />}>
      <Plans />
    </Suspense>
  );
}

async function Plans() {
  if (!(await requireAdmin("/admin/plans"))) return <AccessDenied pageName="플랜 관리" />;
  return (
    <AdminShell path="/admin/plans" title="플랜 관리">
      <Container className={styles.container}>
        {isBackendAuth ? (
          <Suspense fallback={<PlanTermsSkeleton />}>
            <PlanTerms />
          </Suspense>
        ) : (
          <PlanMockNotice />
        )}
      </Container>
    </AdminShell>
  );
}
