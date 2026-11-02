import { formatClock, formatDate } from "@/lib/format";

/** 내역 행의 날짜 칸. 날짜 아래 줄에 시각을 둔다. "11월 2일" / "오후 3:12" */
export function EntryTime({ iso }: { iso: string }) {
  return (
    <time dateTime={iso} className="flex w-16 shrink-0 flex-col text-xs text-text-muted tabular-nums">
      <span>{formatDate(iso)}</span>
      <span>{formatClock(iso)}</span>
    </time>
  );
}
