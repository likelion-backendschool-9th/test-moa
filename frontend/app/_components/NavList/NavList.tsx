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
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
