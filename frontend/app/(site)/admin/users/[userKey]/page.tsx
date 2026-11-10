import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AccessDenied } from "@/app/(site)/admin/_components/AccessDenied/AccessDenied";
import { Container } from "@/components/ui/Container/Container";
import { EmptyState } from "@/components/ui/EmptyState/EmptyState";
import { requireAdmin } from "@/features/session/guard";
import { AdminShell, AdminShellSkeleton } from "@/app/(site)/admin/_components/AdminShell/AdminShell";
import { UserDetailSkeleton, UserDetailView } from "@/app/(site)/admin/users/[userKey]/_components/UserDetail/UserDetail";
import { getUser, getUserKeys, isUserKey } from "@/features/member/api";
import { isBackendAuth } from "@/lib/backend";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "회원 상세" };

/* 키를 미리 알려 두고, 없는 키는 데이터를 읽기 전에 맞춤 404 화면을 보여 준다 */
export function generateStaticParams() {
  return getUserKeys().map((userKey) => ({ userKey }));
}

/*
 * params는 주소마다 달라서, generateStaticParams로 키를 알려 둬도 Suspense 안에서 읽는다.
 * 밖에서 읽으면 링크마다 같이 쓰는 앱 셸이 주소에 묶여 instant-shell-url-data 진단이 나온다
 * (Next 문서 02-guides/optimizing-prefetching.md, adopting-partial-prefetching.md).
 */
export default function UserDetailPage({ params, searchParams }: PageProps<"/admin/users/[userKey]">) {
  return (
    <Suspense fallback={<AdminShellSkeleton />}>
      <Detail params={params} searchParams={searchParams} />
    </Suspense>
  );
}

type DetailProps = Pick<PageProps<"/admin/users/[userKey]">, "params" | "searchParams">;

async function Detail({ params, searchParams }: DetailProps) {
  const [{ userKey }, query] = await Promise.all([params, searchParams]);
  /* 제재·해제 결과 키(실제 로그인) */
  const notice = typeof query.sanction === "string" ? query.sanction : undefined;
  if (!isUserKey(userKey)) notFound();
  if (!(await requireAdmin(`/admin/users/${userKey}`))) return <AccessDenied pageName="회원 관리" />;
  return (
    <AdminShell path="/admin/users" title="회원 관리">
      <Container className={styles.detailContainer}>
        <div className={styles.detailBox}>
          <Suspense fallback={<UserDetailSkeleton />}>
            <DetailSlot userKey={userKey} notice={notice} />
          </Suspense>
        </div>
      </Container>
    </AdminShell>
  );
}

async function DetailSlot({ userKey, notice }: { userKey: string; notice?: string }) {
  const { user } = await getUser(userKey);
  if (!user) {
    return <EmptyState title="회원을 찾을 수 없어요" description={isBackendAuth ? "없는 회원이에요. 목록에서 다시 골라 주세요." : "시연용 데이터에 이 회원이 없어요."} />;
  }
  return <UserDetailView user={user} notice={notice} />;
}
