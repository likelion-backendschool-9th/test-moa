import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";
import type { ParticipationView } from "../types";
import { VIEW_LIST_CLASS } from "./view-styles";

/** 보기 방식에 맞춘 스켈레톤. 실제 목록과 같은 배치로 자리를 잡아 둔다 */
export function ParticipationSkeleton({ count = 3, view = "list" }: { count?: number; view?: ParticipationView }) {
  const grid = view === "grid";
  return (
    <ul aria-busy="true" aria-label="참여 내역 불러오는 중" className={VIEW_LIST_CLASS[view]}>
      {Array.from({ length: count }, (_, index) => (
        <li
          key={index}
          data-skeleton={grid ? "card" : "row"}
          className={cn("flex flex-col gap-4 rounded-2xl bg-surface-muted p-6", !grid && "lg:flex-row lg:items-center lg:gap-6")}
        >
          <Skeleton className={cn("aspect-[16/10] rounded-2xl", grid ? "w-full" : "w-48 shrink-0")} />
          <div className="flex flex-1 flex-col gap-3">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-9 w-28 rounded-full" />
        </li>
      ))}
    </ul>
  );
}
