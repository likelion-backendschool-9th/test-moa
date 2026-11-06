import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessDenied } from "@/app/(site)/admin/_components/AccessDenied";
import { Container } from "@/components/ui/Container";
import { requireAdmin } from "@/features/admin/api";
import { AdminShell, AdminShellSkeleton } from "@/app/(site)/admin/_components/AdminShell";
import { UserFilters, UserList, UserListSkeleton, UserSearch } from "@/app/(site)/admin/users/_components/UserList";
import { getUsers } from "@/features/member/api";
import { parseUserFilter, parseUserQuery, type UserFilter } from "@/features/member/admin";

export const metadata: Metadata = { title: "회원 관리" };

/* 신고·제재 관리와 같은 구조다. 세션과 검색 조건은 Suspense 안에서 읽고, 검색창·필터는 목록을 기다리지 않는다 */
export default function UsersPage({ searchParams }: PageProps<"/admin/users">) {
  return (
    <Suspense fallback={<AdminShellSkeleton />}>
      <Users searchParams={searchParams} />
    </Suspense>
  );
}

async function Users({ searchParams }: { searchParams: PageProps<"/admin/users">["searchParams"] }) {
  if (!(await requireAdmin("/admin/users"))) return <AccessDenied pageName="회원 관리" />;
  const params = await searchParams;
  const filter = parseUserFilter(params.filter);
  const query = parseUserQuery(params.q);
  return (
    <AdminShell path="/admin/users" title="회원 관리">
      <Container className="flex flex-col gap-6 pt-10">
        <UserSearch filter={filter} query={query} />
        <UserFilters current={filter} query={query} />
        <Suspense key={`${filter}:${query}`} fallback={<UserListSkeleton />}>
          <UserListSlot filter={filter} query={query} />
        </Suspense>
      </Container>
    </AdminShell>
  );
}

async function UserListSlot({ filter, query }: { filter: UserFilter; query: string }) {
  const users = await getUsers(filter, query);
  return <UserList users={users} filter={filter} query={query} />;
}
