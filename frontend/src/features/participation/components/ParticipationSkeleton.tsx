import { Skeleton } from "@/components/ui/Skeleton";

/** 행 모양 스켈레톤. 실제 행과 같은 배치로 자리를 잡아 둔다 */
export function ParticipationSkeleton({ count = 3 }: { count?: number }) {
  return (
    <ul aria-busy="true" aria-label="참여 내역 불러오는 중" className="flex flex-col gap-4">
      {Array.from({ length: count }, (_, index) => (
        <li
          key={index}
          data-skeleton="row"
          className="flex flex-col gap-4 rounded-2xl bg-surface-muted p-6 lg:flex-row lg:items-center lg:gap-6"
        >
          <Skeleton className="aspect-[16/10] w-36 shrink-0 rounded-2xl lg:w-48" />
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
