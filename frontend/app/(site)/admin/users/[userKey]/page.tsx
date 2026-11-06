import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AccessDenied } from "@/app/(site)/admin/_components/AccessDenied";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireAdmin } from "@/features/admin/api";
import { AdminShell, AdminShellSkeleton } from "@/features/admin/components/AdminShell";
import { UserDetailSkeleton, UserDetailView } from "@/features/admin/components/UserDetail";
import { getUser, getUserKeys, isUserKey } from "@/features/admin/users";

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
export default function UserDetailPage({ params }: PageProps<"/admin/users/[userKey]">) {
  return (
    <Suspense fallback={<AdminShellSkeleton />}>
      <Detail params={params} />
    </Suspense>
  );
}

async function Detail({ params }: { params: PageProps<"/admin/users/[userKey]">["params"] }) {
  const { userKey } = await params;
  if (!isUserKey(userKey)) notFound();
  if (!(await requireAdmin(`/admin/users/${userKey}`))) return <AccessDenied pageName="회원 관리" />;
  return (
    <AdminShell path="/admin/users" title="회원 관리">
      <Container className="pt-10">
        <div className="flex max-w-3xl flex-col gap-6">
          <Suspense fallback={<UserDetailSkeleton />}>
            <DetailSlot userKey={userKey} />
          </Suspense>
        </div>
      </Container>
    </AdminShell>
  );
}

async function DetailSlot({ userKey }: { userKey: string }) {
  const { user } = await getUser(userKey);
  if (!user) return <EmptyState title="회원을 찾을 수 없어요" description="시연용 데이터에 이 회원이 없어요." />;
  return <UserDetailView user={user} />;
}
