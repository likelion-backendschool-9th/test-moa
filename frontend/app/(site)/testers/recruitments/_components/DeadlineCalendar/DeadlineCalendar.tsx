"use client";

import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/Button/Button";
import { cn } from "@/lib/cn";

/** 서울 기준 날짜 열쇠("2026-11-12")와 그날 마감인 서비스 이름 */
export type CalendarDeadline = { day: string; name: string };

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const dayKey = (year: number, monthIndex: number, day: number) =>
  `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

/** 그 달의 칸을 주 단위로 나눈다. 앞뒤 빈칸은 null이다. 날짜 열쇠만 계산하므로 브라우저 시간대와 무관하다 */
function weeksOf(year: number, monthIndex: number) {
  const leading = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  const length = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const cells: Array<number | null> = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length }, (_, index) => index + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, week) => cells.slice(week * 7, week * 7 + 7));
}

/**
 * 내 피드백 제출 마감을 표시하는 달력. 오늘이 있는 달에서 시작해 이전·다음 달로 넘긴다.
 * 넓은 화면은 칸에 서비스 이름을(같은 날이 여러 건이면 첫 이름과 "외 n건"), 좁은 화면은 점을 보여 주고, 스크린 리더는 어느 폭에서나 모든 이름을 읽는다.
 */
export function DeadlineCalendar({ deadlines, today }: { deadlines: CalendarDeadline[]; today: string }) {
  const [month, setMonth] = useState(() => {
    const [year, monthNumber] = today.split("-").map(Number);
    return year * 12 + monthNumber - 1;
  });
  const titleId = useId();
  const year = Math.floor(month / 12);
  const monthIndex = month % 12;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <p id={titleId} aria-live="polite" className="text-base font-bold tabular-nums">
          {year}년 {monthIndex + 1}월
        </p>
        <div className="flex items-center gap-1">
          <Button variant="secondary" size="sm" aria-label="이전 달" onClick={() => setMonth(month - 1)}>
            <CaretLeftIcon aria-hidden size={16} weight="bold" />
          </Button>
          <Button variant="secondary" size="sm" aria-label="다음 달" onClick={() => setMonth(month + 1)}>
            <CaretRightIcon aria-hidden size={16} weight="bold" />
          </Button>
        </div>
      </div>
      <table aria-labelledby={titleId} className="w-full table-fixed border-separate border-spacing-1 text-sm">
        <thead>
          <tr>
            {WEEKDAYS.map((weekday) => (
              <th key={weekday} scope="col" className="pb-1 text-xs font-semibold text-text-muted">
                {weekday}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeksOf(year, monthIndex).map((week, weekIndex) => (
            <tr key={weekIndex}>
              {week.map((day, dayIndex) => {
                if (day === null) return <td key={dayIndex} />;
                const key = dayKey(year, monthIndex, day);
                const names = deadlines.filter((deadline) => deadline.day === key).map((deadline) => deadline.name);
                const isToday = key === today;
                return (
                  <td
                    key={dayIndex}
                    data-deadline={names.length > 0 ? "" : undefined}
                    aria-current={isToday ? "date" : undefined}
                    className={cn(
                      "relative h-11 rounded-lg px-1 py-1 align-top md:h-16",
                      names.length > 0 && "bg-surface-strong",
                      isToday && "inset-ring-2 inset-ring-text",
                    )}
                  >
                    <span className={cn("block text-center tabular-nums", (isToday || names.length > 0) && "font-extrabold")}>
                      {day}
                    </span>
                    {names.length > 0 && (
                      <>
                        <span aria-hidden className="mx-auto mt-0.5 block size-1.5 rounded-full bg-text md:hidden" />
                        <span aria-hidden className="hidden md:block">
                          <span className="block truncate text-center text-xs font-semibold">{names[0]}</span>
                          {names.length > 1 && (
                            <span className="block text-center text-xs text-text-muted tabular-nums">외 {names.length - 1}건</span>
                          )}
                        </span>
                        <span className="sr-only">{names.join(", ")} 제출 마감</span>
                      </>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
