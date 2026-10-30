import Link from "next/link";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Recruitment } from "@/features/recruitment/types";
import { formatDday } from "@/lib/format";

const panelClass = "flex flex-col gap-4 rounded-2xl bg-surface-muted p-6 md:p-8";

/** 배너 옆 순위 패널. 모집 마감이 가까운 모집 건 */
export function ClosingSoonPanel({ recruitments, now }: { recruitments: Recruitment[]; now: Date }) {
  return (
    <section aria-labelledby="closing-heading" className={panelClass}>
      <h2 id="closing-heading" className="text-lg font-extrabold">
        마감 임박 테스트
      </h2>
      {recruitments.length === 0 ? (
        <p className="text-sm text-text-muted">지금은 마감이 다가오는 모집 글이 없어요.</p>
      ) : (
        <ol className="flex flex-col gap-1">
          {recruitments.map((recruitment, index) => (
            <li key={recruitment.slug}>
              <Link
                href={`/recruitments/${recruitment.slug}`}
                className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors duration-300 ease-brand hover:bg-surface-strong"
              >
                <span className="w-4 text-sm font-extrabold text-accent tabular-nums">{index + 1}</span>
                <span className="flex-1 truncate text-sm font-semibold">{recruitment.projectName}</span>
                <span className="text-xs font-semibold text-text-muted tabular-nums">
                  {formatDday(recruitment.recruitDeadline, now)}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function ClosingSoonPanelSkeleton() {
  return (
    <div aria-busy="true" aria-label="마감 임박 테스트 불러오는 중" className={panelClass}>
      <Skeleton className="h-6 w-32" />
      {Array.from({ length: 5 }, (_, index) => (
        <Skeleton key={index} className="h-10 w-full" />
      ))}
    </div>
  );
}
