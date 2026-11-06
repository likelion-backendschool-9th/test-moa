import Link from "next/link";
import { participationsPath } from "@/features/participation/paths";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";
import {
  PARTICIPATION_TABS,
  TAB_LABEL,
  type ParticipationCounts,
  type ParticipationTab,
} from "@/features/participation/types";

type ParticipationTabsProps = {
  /** 현재 탭. URL을 읽기 전에는 없다 */
  active?: ParticipationTab;
  /** 탭별 개수. 불러오는 동안은 없다 */
  counts?: ParticipationCounts;
};

/** 참여 상태 탭. 탭은 URL ?tab=을 바꾸는 링크라 서버에서 그린다. 좁은 화면에서 넘치면 탭 줄만 가로로 넘긴다 */
export function ParticipationTabs({ active, counts }: ParticipationTabsProps) {
  return (
    <nav aria-label="참여 상태" className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <ul className="flex w-max gap-1">
        {PARTICIPATION_TABS.map((tab) => {
          const current = tab === active;
          return (
            <li key={tab}>
              <Link
                href={participationsPath(tab)}
                scroll={false}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors duration-300 ease-brand",
                  current ? "bg-surface-strong text-text" : "text-text-muted hover:text-text",
                )}
              >
                {TAB_LABEL[tab]}
                {counts ? (
                  <span className="text-text-muted tabular-nums">{counts[tab]}</span>
                ) : (
                  <Skeleton className="h-4 w-3" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
