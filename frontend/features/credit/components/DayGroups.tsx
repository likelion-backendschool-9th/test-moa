import type { ReactNode } from "react";
import { formatDate, seoulDayKey } from "@/lib/format";

const DAY_MS = 24 * 60 * 60 * 1000;

type DayGroupsProps<T> = {
  /** 최신순 */
  items: T[];
  dateOf: (item: T) => string;
  /** 소제목 id가 겹치지 않게 붙이는 접두어 */
  idPrefix: string;
  /** 오늘·어제를 가리는 기준 시각 */
  now: Date;
  children: (item: T) => ReactNode;
};

/**
 * 내역을 서울 기준 날짜별로 묶는다. 소제목은 오늘·어제, 그 전은 날짜로 한 번만 보인다.
 * 행마다 날짜 칸이 없어 좁은 화면에서도 내역 이름이 넓게 보인다
 */
export function DayGroups<T>({ items, dateOf, idPrefix, now, children }: DayGroupsProps<T>) {
  const relative: Record<string, string> = {
    [seoulDayKey(now.toISOString())]: "오늘",
    [seoulDayKey(new Date(now.getTime() - DAY_MS).toISOString())]: "어제",
  };
  const groups: { key: string; iso: string; items: T[] }[] = [];
  for (const item of items) {
    const key = seoulDayKey(dateOf(item));
    const last = groups.at(-1);
    if (last?.key === key) last.items.push(item);
    else groups.push({ key, iso: dateOf(item), items: [item] });
  }
  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => {
        const headingId = `${idPrefix}-${group.key}`;
        return (
          <div key={group.key} className="flex flex-col">
            <h3 id={headingId} className="pb-1 text-sm font-bold">
              {relative[group.key] ?? formatDate(group.iso)}
            </h3>
            <ul aria-labelledby={headingId} className="flex flex-col">
              {group.items.map(children)}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
