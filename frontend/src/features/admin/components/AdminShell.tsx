import Link from "next/link";
import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";

/** 운영자 하위 탭. test-moa/docs/page-urls.md 관리자 섹션 순서를 따른다 */
export const ADMIN_NAV = [
  { label: "홈", path: "/admin" },
  { label: "회원", path: "/admin/users" },
  { label: "신고·제재", path: "/admin/reports" },
  { label: "출금 요청", path: "/admin/withdrawals" },
  { label: "모집 취소", path: "/admin/cancellations" },
] as const;

export type AdminPath = (typeof ADMIN_NAV)[number]["path"];

type AdminShellProps = {
  /** 현재 페이지 경로. 페이지가 넘겨서 서버에서 현재 탭을 정한다 */
  path: AdminPath;
  /** 운영자 홈에만 둔다. 하위 페이지는 자기 h1이 있다 */
  title?: string;
  children: ReactNode;
};

export function AdminShell({ path, title, children }: AdminShellProps) {
  return (
    <>
      <Container className="flex flex-col gap-6 pt-8">
        {title && <h1 className="text-2xl font-extrabold tracking-[-0.03em]">{title}</h1>}
        <nav aria-label="운영자 메뉴" className="overflow-x-auto">
          <ul className="flex gap-1 whitespace-nowrap">
            {ADMIN_NAV.map((item) => {
              const active = item.path === path;
              return (
                <li key={item.path}>
                  <Link
                    href={item.path}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex rounded-full px-3 py-2 text-sm font-semibold transition-colors duration-300 ease-brand",
                      active ? "bg-surface-strong text-text" : "text-text-muted hover:text-text",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </Container>
      {children}
    </>
  );
}

/** 권한 확인 전. 권한 없는 사용자에게 운영자 탭이 잠깐이라도 보이지 않게 모양만 둔다 */
export function AdminShellSkeleton() {
  return (
    <Container aria-busy="true" aria-label="운영자 페이지 불러오는 중" className="flex flex-col gap-6 pt-8" data-skeleton="shell">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-9 w-full max-w-md" />
    </Container>
  );
}
