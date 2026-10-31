import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AccessDenied } from "@/components/AccessDenied";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireAdmin } from "@/features/admin/api";
import { AdminShell, AdminShellSkeleton } from "@/features/admin/components/AdminShell";
import { UserDetailSkeleton, UserDetailView } from "@/features/admin/components/UserDetail";
import { getUser, getUserKeys, isUserKey } from "@/features/admin/users";

export const metadata: Metadata = { title: "회원 상세" };

/* 신고 상세와 같은 이유로 키를 미리 알려 두고, 없는 키는 데이터를 읽기 전에 맞춤 404 화면을 보여 준다 */
export function generateStaticParams() {
  return getUserKeys().map((userKey) => ({ userKey }));
}

export default async function UserDetailPage({ params }: PageProps<"/admin/users/[userKey]">) {
  const { userKey } = await params;
  if (!isUserKey(userKey)) notFound();
  return (
    <Suspense fallback={<AdminShellSkeleton />}>
      <Detail userKey={userKey} />
    </Suspense>
  );
}

async function Detail({ userKey }: { userKey: string }) {
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
