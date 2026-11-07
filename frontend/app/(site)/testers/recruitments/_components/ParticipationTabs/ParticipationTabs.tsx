import Link from "next/link";
import { participationsPath } from "@/features/participation/paths";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { cn } from "@/lib/cn";
import {
  PARTICIPATION_TABS,
  TAB_LABEL,
  type ParticipationCounts,
  type ParticipationTab,
} from "@/features/participation/types";
import styles from "./ParticipationTabs.module.css";

type ParticipationTabsProps = {
  /** 현재 탭. URL을 읽기 전에는 없다 */
  active?: ParticipationTab;
  /** 탭별 개수. 불러오는 동안은 없다 */
  counts?: ParticipationCounts;
};

/** 참여 상태 탭. 탭은 URL ?tab=을 바꾸는 링크라 서버에서 그린다. 좁은 화면에서 넘치면 탭 줄만 가로로 넘긴다 */
export function ParticipationTabs({ active, counts }: ParticipationTabsProps) {
  return (
    <nav aria-label="참여 상태" className={styles.root}>
      <ul className={styles.list}>
        {PARTICIPATION_TABS.map((tab) => {
          const current = tab === active;
          return (
            <li key={tab}>
              <Link
                href={participationsPath(tab)}
                scroll={false}
                aria-current={current ? "page" : undefined}
                className={cn(styles.link, current ? styles.linkCurrent : styles.linkNotCurrent)}
              >
                {TAB_LABEL[tab]}
                {counts ? (
                  <span className={styles.label}>{counts[tab]}</span>
                ) : (
                  <Skeleton className={styles.skeleton} />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
