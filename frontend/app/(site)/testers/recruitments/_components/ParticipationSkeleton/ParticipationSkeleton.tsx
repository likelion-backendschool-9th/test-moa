import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { cn } from "@/lib/cn";
import type { ParticipationView } from "@/features/participation/types";
import { ParticipationListFrame } from "../ParticipationListFrame/ParticipationListFrame";
import { Card } from "@/components/ui/Card/Card";
import styles from "./ParticipationSkeleton.module.css";

/** 보기 방식에 맞춘 스켈레톤. 실제 목록과 같은 배치로 자리를 잡아 둔다 */
export function ParticipationSkeleton({ count = 3, view = "list" }: { count?: number; view?: ParticipationView }) {
  const grid = view === "grid";
  return (
    <ParticipationListFrame view={view} aria-busy="true" aria-label="참여 내역 불러오는 중">
      {Array.from({ length: count }, (_, index) => (
        <Card as="li"
          key={index}
          data-skeleton={grid ? "card" : "row"}
          className={cn(styles.root, !grid && styles.rootNotGrid)}
        >
          <Skeleton className={cn(styles.skeleton, grid ? styles.skeletonGrid : styles.skeletonNotGrid)} />
          <div className={styles.box}>
            <Skeleton className={styles.skeleton2} />
            <Skeleton className={styles.skeleton3} />
            <Skeleton className={styles.skeleton4} />
          </div>
          <Skeleton className={styles.skeleton5} />
        </Card>
      ))}
    </ParticipationListFrame>
  );
}
