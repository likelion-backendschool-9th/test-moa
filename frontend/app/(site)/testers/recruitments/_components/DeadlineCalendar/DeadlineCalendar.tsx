"use client";

import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/Button/Button";
import { cn } from "@/lib/cn";
import styles from "./DeadlineCalendar.module.css";

/** 서울 기준 날짜 열쇠("2026-11-12")와 그날 마감인 서비스 이름 */
export type CalendarDeadline = { day: string; name: string; /** 피드백을 이미 냈다 */ submitted: boolean };

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
    <div className={styles.root}>
      <div className={styles.box}>
        <p id={titleId} aria-live="polite" className={styles.text}>
          {year}년 {monthIndex + 1}월
        </p>
        <div className={styles.box2}>
          <Button variant="secondary" size="sm" aria-label="이전 달" onClick={() => setMonth(month - 1)}>
            <CaretLeftIcon aria-hidden size={16} weight="bold" />
          </Button>
          <Button variant="secondary" size="sm" aria-label="다음 달" onClick={() => setMonth(month + 1)}>
            <CaretRightIcon aria-hidden size={16} weight="bold" />
          </Button>
        </div>
      </div>
      <table aria-labelledby={titleId} className={styles.table}>
        <thead>
          <tr>
            {WEEKDAYS.map((weekday) => (
              <th key={weekday} scope="col" className={styles.root2}>
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
                /* 아직 할 일(안 냈고 마감 전)을 앞에 둔다. 하루에 하나라도 있으면 그날은 초록이고, 제출했거나 마감이 지난 날은 회색이다. 마감일 당일은 아직 낼 수 있다 */
                const entries = deadlines
                  .filter((deadline) => deadline.day === key)
                  .map((deadline) => ({ ...deadline, open: !deadline.submitted && key >= today }))
                  .sort((a, b) => Number(b.open) - Number(a.open));
                const names = entries.map((deadline) => deadline.name);
                const pending = entries.some((deadline) => deadline.open);
                const isToday = key === today;
                return (
                  <td
                    key={dayIndex}
                    data-deadline={names.length > 0 ? (pending ? "pending" : "submitted") : undefined}
                    aria-current={isToday ? "date" : undefined}
                    className={cn(styles.root3, names.length > 0 && (pending ? styles.root3Pending : styles.root3Done), isToday && styles.root3IsToday)}
                  >
                    <span className={cn(styles.day, (isToday || names.length > 0) && styles.dayOn)}>
                      {day}
                    </span>
                    {names.length > 0 && (
                      <>
                        <span aria-hidden className={styles.label} />
                        <span aria-hidden className={styles.label2}>
                          <span className={styles.label3}>{names[0]}</span>
                          {names.length > 1 && (
                            <span className={styles.label4}>외 {names.length - 1}건</span>
                          )}
                        </span>
                        <span data-deadline-label className={styles.srOnly}>{entries.map((deadline) => `${deadline.name}${deadline.submitted ? "(제출함)" : deadline.open ? "" : "(기한 지남)"}`).join(", ")} 제출 마감</span>
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
