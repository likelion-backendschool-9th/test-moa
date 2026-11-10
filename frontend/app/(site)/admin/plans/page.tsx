import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessDenied } from "@/app/(site)/admin/_components/AccessDenied/AccessDenied";
import { AdminShell, AdminShellSkeleton } from "@/app/(site)/admin/_components/AdminShell/AdminShell";
import { LinkTabs } from "@/app/(site)/admin/_components/LinkTabs/LinkTabs";
import { MemberSearch, MemberSubscriptionResult, MemberSubscriptionSkeleton, MockNotice } from "@/app/(site)/admin/plans/_components/MemberSubscription/MemberSubscription";
import { PlanMockNotice, PlanTerms, PlanTermsSkeleton } from "@/app/(site)/admin/plans/_components/PlanTerms/PlanTerms";
import { Container } from "@/components/ui/Container/Container";
import { requireAdmin } from "@/features/session/guard";
import { parsePlanTab, planTabHref, PLAN_TABS } from "@/features/subscription/paths";
import { parseMemberEmail } from "@/features/subscription/types";
import { isBackendAuth } from "@/lib/backend";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "플랜 관리" };

/* 세션과 탭·검색어는 Suspense 안에서 읽는다. 탭은 주소(tab)에 남아 새로고침해도 그대로다 */
export default function PlansPage({ searchParams }: PageProps<"/admin/plans">) {
  return (
    <Suspense fallback={<AdminShellSkeleton />}>
      <Plans searchParams={searchParams} />
    </Suspense>
  );
}

async function Plans({ searchParams }: { searchParams: PageProps<"/admin/plans">["searchParams"] }) {
  const params = await searchParams;
  const tab = parsePlanTab(params.tab);
  const email = parseMemberEmail(params.email);
  /* 로그인 뒤에 보던 탭과 검색으로 돌아오게 주소를 그대로 넘긴다 */
  if (!(await requireAdmin(planTabHref(tab, email)))) return <AccessDenied pageName="플랜 관리" />;
  return (
    <AdminShell path="/admin/plans" title="플랜 관리">
      <Container className={styles.container}>
        <LinkTabs label="플랜 관리" tabs={PLAN_TABS.map((item) => ({ ...item, href: planTabHref(item.tab) }))} current={tab} />
        {tab === "benefits" &&
          (isBackendAuth ? (
            <Suspense fallback={<PlanTermsSkeleton />}>
              <PlanTerms />
            </Suspense>
          ) : (
            <PlanMockNotice />
          ))}
        {tab === "subscriptions" &&
          (isBackendAuth ? (
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
          ))}
      </Container>
    </AdminShell>
  );
}
