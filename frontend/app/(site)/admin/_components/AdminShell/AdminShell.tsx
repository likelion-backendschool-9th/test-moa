import Link from "next/link";
import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container/Container";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { cn } from "@/lib/cn";
import styles from "./AdminShell.module.css";

/** 운영자 하위 탭. test-moa/docs/page-urls.md 관리자 섹션 순서를 따른다 */
export const ADMIN_NAV = [
  { label: "홈", path: "/admin" },
  { label: "회원", path: "/admin/users" },
  { label: "신고·제재", path: "/admin/reports" },
  { label: "출금 요청", path: "/admin/withdrawals" },
  { label: "구독", path: "/admin/subscriptions" },
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
      <Container className={styles.container}>
        {title && <h1 className={styles.title}>{title}</h1>}
        <nav aria-label="운영자 메뉴" className={styles.nav}>
          <ul className={styles.list}>
            {ADMIN_NAV.map((item) => {
              const active = item.path === path;
              return (
                <li key={item.path}>
                  <Link
                    href={item.path}
                    aria-current={active ? "page" : undefined}
                    className={cn(styles.label, active ? styles.labelActive : styles.labelNotActive)}
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
    <Container aria-busy="true" aria-label="운영자 페이지 불러오는 중" className={styles.adminShellSkeleton} data-skeleton="shell">
      <Skeleton className={styles.adminShellSkeletonSkeleton} />
      <Skeleton className={styles.adminShellSkeletonSkeleton2} />
    </Container>
  );
}
