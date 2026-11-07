import Form from "next/form";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { USER_FILTERS, USER_QUERY_MAX_LENGTH, type UserFilter, type UserSummary } from "@/features/member/admin";
import { LinkTabs } from "../../_components/LinkTabs";

/** 필터를 바꿔도 검색어는 남긴다 */
function usersHref(filter: UserFilter, query: string) {
  const params = new URLSearchParams();
  if (filter !== "all") params.set("filter", filter);
  if (query) params.set("q", query);
  const search = params.toString();
  return search ? `/admin/users?${search}` : "/admin/users";
}

/**
 * 닉네임 검색. GET 양식이라 검색어가 주소(q)에 남고, next/form이 페이지를 새로 받지 않고 이동한다.
 * 고른 필터는 숨은 칸으로 함께 보낸다.
 * 같은 페이지 이동에서는 입력칸이 그대로 남아 defaultValue가 다시 적용되지 않으므로,
 * 뒤로 가기처럼 주소의 검색어가 바뀌면 key로 입력칸을 새로 그린다.
 */
export function UserSearch({ filter, query }: { filter: UserFilter; query: string }) {
  return (
    <Form action="/admin/users" role="search" className="flex max-w-md gap-2">
      {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
      <input
        key={query}
        type="search"
        name="q"
        defaultValue={query}
        maxLength={USER_QUERY_MAX_LENGTH}
        aria-label="닉네임 검색"
        placeholder="닉네임 검색"
        className="min-w-0 flex-1 rounded-full bg-surface-strong px-4 py-2 text-sm text-text placeholder:text-text-muted focus:outline-2 focus:outline-accent"
      />
      <Button type="submit" variant="secondary" size="sm">
        검색
      </Button>
    </Form>
  );
}

/** 전체·제재 이력 있음·검토 대기 신고 있음. 상태는 주소(filter)에 남는다 */
export function UserFilters({ current, query }: { current: UserFilter; query: string }) {
  const tabs = USER_FILTERS.map((item) => ({ tab: item.filter, label: item.label, href: usersHref(item.filter, query) }));
  return <LinkTabs label="회원 필터" tabs={tabs} current={current} />;
}

/** 결과가 없을 때 무엇 때문인지 알 수 있게, 걸려 있는 검색어와 필터를 함께 말한다 */
function emptyTitle(filter: UserFilter, query: string) {
  const filterLabel = USER_FILTERS.find((item) => item.filter === filter)?.label;
  if (query && filter !== "all") return `'${query}' 검색과 '${filterLabel}' 필터에 함께 맞는 회원이 없어요`;
  if (query) return `'${query}'에 맞는 회원이 없어요`;
  if (filter !== "all") return `'${filterLabel}'에 맞는 회원이 없어요`;
  return "회원이 없어요";
}

const rowClass = "flex flex-col gap-2 rounded-2xl bg-surface-muted p-5 md:flex-row md:items-center md:gap-4 md:p-6";

type UserListProps = { users: UserSummary[]; filter: UserFilter; query: string };

/** 회원 목록. 역할은 보여 주지 않는다(한 사람이 테스터도 개발자도 된다). 실명·이메일은 상세에서만, 그것도 가려서 보여 준다 */
export function UserList({ users, filter, query }: UserListProps) {
  if (users.length === 0) return <EmptyState title={emptyTitle(filter, query)} />;
  return (
    <ul aria-label="회원" className="flex flex-col gap-3">
      {users.map((user) => (
        <li key={user.id}>
          <Link href={`/admin/users/${user.id}`} className={cn(rowClass, "transition-colors duration-300 ease-brand hover:bg-surface-strong")}>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="font-semibold">{user.nickname}</span>
              <span className="text-sm text-text-muted">
                가입 {formatDate(user.joinedAt)}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              {user.sanctionCount > 0 && <Badge tone="neutral">제재 이력 {user.sanctionCount}건</Badge>}
              {user.pendingReportCount > 0 && <Badge tone="muted">검토 대기 신고 {user.pendingReportCount}건</Badge>}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function UserListSkeleton() {
  return (
    <div aria-busy="true" aria-label="회원 목록 불러오는 중" className="flex flex-col gap-3">
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className={rowClass} data-skeleton="user">
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-5 w-48" />
          </div>
          <Skeleton className="h-6 w-24" />
        </div>
      ))}
    </div>
  );
}
