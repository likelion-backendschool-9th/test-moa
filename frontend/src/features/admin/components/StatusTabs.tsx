import Link from "next/link";
import { cn } from "@/lib/cn";
import type { ListTab } from "../types";

type StatusTabsProps = {
  /** 탭 묶음 이름. "신고 상태", "출금 요청 상태" */
  label: string;
  tabs: { tab: ListTab; label: string; href: string }[];
  current: ListTab;
};

/** 처리 대기·처리 완료 같은 목록 탭. 상태는 URL(tab)에 남는다 */
export function StatusTabs({ label, tabs, current }: StatusTabsProps) {
  return (
    <nav aria-label={label}>
      <ul className="flex gap-2">
        {tabs.map((item) => {
          const active = item.tab === current;
          return (
            <li key={item.tab}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex rounded-full px-4 py-2 text-sm font-bold transition-colors duration-300 ease-brand",
                  active ? "bg-text text-surface" : "bg-surface-strong text-text hover:bg-line",
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
