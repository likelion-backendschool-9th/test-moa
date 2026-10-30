const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  month: "long",
  day: "numeric",
  timeZone: "Asia/Seoul",
});

const numberFormatter = new Intl.NumberFormat("ko-KR");

/** "11월 6일" */
export function formatDate(iso: string) {
  return dateFormatter.format(new Date(iso));
}

/** "12,480 크레딧" */
export function formatCredits(amount: number) {
  return `${numberFormatter.format(amount)} 크레딧`;
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** 접수 뒤 지난 시간. "방금 전", "18시간 전", "3일 전" */
export function formatElapsed(iso: string, now: Date) {
  const elapsed = now.getTime() - new Date(iso).getTime();
  if (elapsed < HOUR_MS) return "방금 전";
  if (elapsed < DAY_MS) return `${Math.floor(elapsed / HOUR_MS)}시간 전`;
  return `${Math.floor(elapsed / DAY_MS)}일 전`;
}

/** 모집 마감까지 남은 날. "D-3", 당일은 "D-day" */
export function formatDday(iso: string, now: Date) {
  const days = Math.ceil((new Date(iso).getTime() - now.getTime()) / DAY_MS);
  return days <= 0 ? "D-day" : `D-${days}`;
}

const timeFormatter = new Intl.DateTimeFormat("ko-KR", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Seoul",
});

const fullDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  timeZone: "Asia/Seoul",
});

/** 서울 기준 날짜를 "2026-10-30" 꼴로. 같은 날·어제·같은 해 비교에 쓴다 */
const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Asia/Seoul",
});

/** 채팅 목록의 최근 일시. 오늘 "오후 3:12", 어제 "어제", 올해 "10월 28일", 그 전 "2025. 12. 3." */
export function formatChatTime(iso: string, now: Date) {
  const date = new Date(iso);
  const day = dayKeyFormatter.format(date);
  const today = dayKeyFormatter.format(now);
  if (day === today) return timeFormatter.format(date);
  if (day === dayKeyFormatter.format(new Date(now.getTime() - DAY_MS))) return "어제";
  if (day.slice(0, 4) === today.slice(0, 4)) return dateFormatter.format(date);
  return fullDateFormatter.format(date);
}
