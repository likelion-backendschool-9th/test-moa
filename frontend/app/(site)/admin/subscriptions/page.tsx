import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessDenied } from "@/app/(site)/admin/_components/AccessDenied/AccessDenied";
import { AdminShell, AdminShellSkeleton } from "@/app/(site)/admin/_components/AdminShell/AdminShell";
import { MemberSearch, MemberSubscriptionResult, MemberSubscriptionSkeleton, MockNotice } from "@/app/(site)/admin/subscriptions/_components/MemberSubscription/MemberSubscription";
import { Container } from "@/components/ui/Container/Container";
import { requireAdmin } from "@/features/session/guard";
import { parseMemberEmail } from "@/features/subscription/types";
import { isBackendAuth } from "@/lib/backend";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "구독 관리" };

/* 회원 관리와 같은 구조다. 세션과 검색어는 Suspense 안에서 읽고, 검색창은 결과를 기다리지 않는다 */
export default function SubscriptionsPage({ searchParams }: PageProps<"/admin/subscriptions">) {
  return (
    <Suspense fallback={<AdminShellSkeleton />}>
      <Subscriptions searchParams={searchParams} />
    </Suspense>
  );
}

async function Subscriptions({ searchParams }: { searchParams: PageProps<"/admin/subscriptions">["searchParams"] }) {
  if (!(await requireAdmin("/admin/subscriptions"))) return <AccessDenied pageName="구독 관리" />;
  const email = parseMemberEmail((await searchParams).email);
  return (
    <AdminShell path="/admin/subscriptions" title="구독 관리">
      <Container className={styles.container}>
        {isBackendAuth ? (
          <>
            <MemberSearch email={email} />
            {email && (
              <Suspense key={email} fallback={<MemberSubscriptionSkeleton />}>
                <MemberSubscriptionResult email={email} />
              </Suspense>
            )}
          </>
        ) : (
          <MockNotice />
        )}
      </Container>
    </AdminShell>
  );
}
