import { participationPath } from "@/lib/participation-paths";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/LinkButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatDate, formatDday, seoulDayKey } from "@/lib/format";
import type { ParticipationItem } from "../../../../../features/participation/types";
import { DeadlineCalendar } from "./DeadlineCalendar";

const layoutClass = "grid items-stretch gap-4 lg:grid-cols-2";

/**
 * 내가 피드백을 제출해야 하는 참여의 마감. 왼쪽은 마감 캘린더, 오른쪽은 마감이 가까운 순서의 목록이고 좁으면 위아래로 쌓인다.
 * 이 화면의 주 버튼(강조색)은 목록 맨 위 하나뿐이고 나머지는 보조 버튼이다.
 */
export function DeadlinePanel({ items, now }: { items: ParticipationItem[]; now: Date }) {
  const deadlines = items.map((item) => ({ day: seoulDayKey(item.recruitment.submitDeadline), name: item.recruitment.projectName }));
  return (
    <div className={layoutClass}>
      <section aria-labelledby="deadline-calendar-heading" className="flex flex-col gap-4 rounded-2xl bg-surface-muted p-6">
        <h2 id="deadline-calendar-heading" className="text-lg font-extrabold">
          마감 캘린더
        </h2>
        <DeadlineCalendar deadlines={deadlines} today={seoulDayKey(now.toISOString())} />
      </section>
      <section aria-labelledby="deadline-list-heading" className="flex flex-col gap-4 rounded-2xl bg-surface-muted p-6">
        <h2 id="deadline-list-heading" className="text-lg font-extrabold">
          마감 임박 테스트 <span className="ml-1 text-text-muted tabular-nums">{items.length}</span>
        </h2>
        <ul className="flex flex-col divide-y divide-line">
          {items.map((item, index) => {
            const { recruitment } = item;
            return (
              <li key={item.key} data-testid="deadline-item" className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                <div className="flex min-w-0 flex-1 basis-48 flex-col gap-1">
                  <p className="text-base font-extrabold">
                    {recruitment.projectName}
                    <span className="ml-2 tabular-nums">{formatDday(recruitment.submitDeadline, now)}</span>
                  </p>
                  <p className="text-sm text-text-muted">
                    {recruitment.request} · 제출 마감 <span className="tabular-nums">{formatDate(recruitment.submitDeadline)}</span>
                  </p>
                </div>
                <LinkButton href={participationPath(item.key)} variant={index === 0 ? "primary" : "secondary"} size="sm">
                  <span className="sr-only">{recruitment.projectName} </span>
                  피드백 쓰기
                </LinkButton>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

export function DeadlinePanelSkeleton() {
  return (
    <div data-skeleton="panel" aria-busy="true" aria-label="마감 일정 불러오는 중" className={layoutClass}>
      {Array.from({ length: 2 }, (_, index) => (
        <Card key={index} className="flex flex-col gap-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-72 w-full rounded-2xl" />
        </Card>
      ))}
    </div>
  );
}
