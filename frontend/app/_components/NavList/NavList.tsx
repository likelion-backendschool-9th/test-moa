"use client";

import { useChatUnreadCount } from "../ChatEvents/hook";
import Link from "next/link";
import { cn } from "@/lib/cn";
import type { NavItem } from "@/app/_lib/nav";
import styles from "./NavList.module.css";

type NavListProps = {
  items: NavItem[];
  activePath?: string;
};

/** 데스크톱 탭 목록. 경로를 직접 읽지 않아서 세션을 읽기 전 fallback으로도 쓴다 */
export function NavList({ items, activePath }: NavListProps) {
  const count = useChatUnreadCount(items.find(item => item.path === "/my/chats")?.badge);
  return (
    <nav aria-label="주요 메뉴" className={styles.root}>
      <ul className={styles.list}>
        {items.map((item) => {
          const active = item.path === activePath;
          return (
            <li key={item.path}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(styles.label, active ? styles.labelActive : styles.labelNotActive)}
              >
                {item.label}
                {item.badge !== undefined && count > 0 && <span className={styles.badge} ><span aria-hidden>{count >= 100 ? "99+" : count}</span><span className={styles.srOnly}>{`안 읽은 메시지 ${count}개`}</span></span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
