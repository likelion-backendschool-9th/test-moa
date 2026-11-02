import type { ReactNode } from "react";
import { formatDate, seoulDayKey } from "@/lib/format";

type DayGroupsProps<T> = {
  /** 최신순 */
  items: T[];
  dateOf: (item: T) => string;
  /** 소제목 id가 겹치지 않게 붙이는 접두어 */
  idPrefix: string;
  children: (item: T) => ReactNode;
};

/**
 * 내역을 서울 기준 날짜별로 묶는다. 날짜는 묶음 소제목으로 한 번만 보이고, 행에는 왼쪽 시각 열만 둔다.
 * 행마다 날짜 칸이 없어 좁은 화면에서도 내역 이름이 넓게 보인다
 */
export function DayGroups<T>({ items, dateOf, idPrefix, children }: DayGroupsProps<T>) {
  const groups: { key: string; iso: string; items: T[] }[] = [];
  for (const item of items) {
    const key = seoulDayKey(dateOf(item));
    const last = groups.at(-1);
    if (last?.key === key) last.items.push(item);
    else groups.push({ key, iso: dateOf(item), items: [item] });
  }
  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => {
        const headingId = `${idPrefix}-${group.key}`;
        return (
          <div key={group.key} className="flex flex-col">
            <h3 id={headingId} className="pt-1 text-xs font-semibold text-text-muted">
              {formatDate(group.iso)}
            </h3>
            <ul aria-labelledby={headingId} className="flex flex-col divide-y divide-line">
              {group.items.map(children)}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
