import Link from "next/link";
import { cn } from "@/lib/cn";
import type { NavItem } from "@/app/_components/nav";

type NavListProps = {
  items: NavItem[];
  activePath?: string;
};

/** 데스크톱 탭 목록. 경로를 직접 읽지 않아서 세션을 읽기 전 fallback으로도 쓴다 */
export function NavList({ items, activePath }: NavListProps) {
  return (
    <nav aria-label="주요 메뉴" className="hidden md:order-last md:block md:basis-full md:pb-3 lg:order-none lg:basis-auto lg:pb-0">
      <ul className="flex gap-1">
        {items.map((item) => {
          const active = item.path === activePath;
          return (
            <li key={item.path}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex rounded-full px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors duration-300 ease-brand",
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
  );
}
