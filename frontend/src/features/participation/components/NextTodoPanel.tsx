import { LinkButton } from "@/components/ui/LinkButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatDate, formatDday } from "@/lib/format";
import { participationPath, type ParticipationItem } from "../types";
import { TodoScroller } from "./TodoScroller";

/* 한 화면에 md 이상은 카드 2개, 좁은 화면은 1개. 넘친 카드는 가려 두고 버튼으로만 넘긴다 */
const stripClass = "flex gap-4 overflow-x-hidden";
/* relative: 카드 안 sr-only(absolute)가 띠 밖 기준으로 잡혀 페이지 가로 스크롤을 만들지 않게 한다 */
const cardItemClass = "relative w-full shrink-0 md:w-[calc(50%-0.5rem)]";
const cardClass = "flex h-full flex-col justify-between gap-6 rounded-2xl bg-surface-muted p-6 md:p-8";

/**
 * 피드백을 제출해야 하는 참여를 마감이 가까운 순서로 모두 카드 띠에 담는다. 넘치면 이전·다음 버튼으로 넘긴다.
 * 주 버튼(강조색)은 맨 앞 카드 하나뿐이고 나머지는 보조 버튼이다.
 */
export function NextTodoPanel({ items, now }: { items: ParticipationItem[]; now: Date }) {
  const heading = (
    <h2 id="next-todo-heading" className="text-lg font-extrabold">
      다음 할 일 <span className="ml-1 text-text-muted tabular-nums">{items.length}</span>
    </h2>
  );
  return (
    <section aria-labelledby="next-todo-heading" className="flex flex-col gap-4">
      <TodoScroller heading={heading} className={stripClass}>
        {items.map((item, index) => {
          const { recruitment } = item;
          return (
            <li key={item.key} data-testid="next-todo" className={cardItemClass}>
              <div className={cardClass}>
                <div className="flex flex-col gap-2">
                  <p className="text-2xl font-extrabold tracking-[-0.03em]">
                    {recruitment.projectName}
                    <span className="ml-3 tabular-nums">{formatDday(recruitment.submitDeadline, now)}</span>
                  </p>
                  <p className="text-sm text-text-muted">
                    {recruitment.request} · 피드백 제출 마감{" "}
                    <span className="tabular-nums">{formatDate(recruitment.submitDeadline)}</span>
                  </p>
                </div>
                <LinkButton
                  href={participationPath(item.key)}
                  variant={index === 0 ? "primary" : "secondary"}
                  className="w-full md:w-auto md:self-start"
                >
                  <span className="sr-only">{recruitment.projectName} </span>
                  피드백 쓰기
                </LinkButton>
              </div>
            </li>
          );
        })}
      </TodoScroller>
    </section>
  );
}

export function NextTodoPanelSkeleton() {
  return (
    <div data-skeleton="panel" aria-busy="true" aria-label="다음 할 일 불러오는 중" className="flex flex-col gap-4">
      <Skeleton className="h-6 w-28" />
      <ul className={stripClass}>
        {Array.from({ length: 2 }, (_, index) => (
          <li key={index} className={cardItemClass}>
            <div className={cardClass}>
              <div className="flex flex-col gap-3">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-72 max-w-full" />
              </div>
              <Skeleton className="h-12 w-full rounded-full md:w-32" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
