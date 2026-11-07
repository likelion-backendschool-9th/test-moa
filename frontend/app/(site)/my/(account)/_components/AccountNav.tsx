"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { findActivePath, type NavItem } from "@/app/_components/nav";

/** 마이페이지 하위 페이지 메뉴. test-moa/docs/page-urls.md의 마이페이지 섹션을 따른다 */
const ACCOUNT_NAV: NavItem[] = [
  { label: "홈", path: "/my", href: "/my" },
  { label: "개인정보 수정", path: "/my/profile/edit", href: "/my/profile/edit" },
  { label: "크레딧", path: "/my/credits", href: "/my/credits" },
  { label: "출금", path: "/my/credits/withdrawals", href: "/my/credits/withdrawals" },
  { label: "구독", path: "/my/subscription", href: "/my/subscription" },
];

/** 넓은 화면은 왼쪽 세로 메뉴, 좁은 화면은 본문 위 가로 탭 */
export function AccountNav() {
  const activePath = findActivePath(ACCOUNT_NAV, usePathname());
  return (
    <nav aria-label="마이페이지 메뉴">
      <ul className="-mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0">
        {ACCOUNT_NAV.map((item) => {
          const active = item.path === activePath;
          return (
            <li key={item.path} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-300 ease-brand lg:rounded-xl",
                  active ? "bg-accent-soft text-accent" : "text-text-muted hover:bg-surface-strong hover:text-text",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
