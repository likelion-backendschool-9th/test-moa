const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  month: "long",
  day: "numeric",
  timeZone: "Asia/Seoul",
});

const dateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  month: "long",
  day: "numeric",
  hour: "numeric",
  timeZone: "Asia/Seoul",
});

const numberFormatter = new Intl.NumberFormat("ko-KR");

/** "11월 6일" */
export function formatDate(iso: string) {
  return dateFormatter.format(new Date(iso));
}

/** "11월 6일 오후 3시" */
export function formatDateTime(iso: string) {
  return dateTimeFormatter.format(new Date(iso));
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

/** 마감까지 남은 날 수. 남은 시간이 하루가 안 되면 1 */
export function daysUntil(iso: string, now: Date) {
  return Math.ceil((new Date(iso).getTime() - now.getTime()) / DAY_MS);
}

/** 마감까지 남은 날. "D-3", 당일은 "D-day" */
export function formatDday(iso: string, now: Date) {
  const days = daysUntil(iso, now);
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

/** 서울 시간으로 기준 시각과 같은 날인지 */
export function isTodayInSeoul(iso: string, now: Date) {
  return dayKeyFormatter.format(new Date(iso)) === dayKeyFormatter.format(now);
}

/** 서울 기준 날짜 열쇠 "2026-10-30". 같은 날끼리 묶을 때 쓴다 */
export function seoulDayKey(iso: string) {
  return dayKeyFormatter.format(new Date(iso));
}

/** 메시지 시각. "오후 3:12" */
export function formatClock(iso: string) {
  return timeFormatter.format(new Date(iso));
}

const weekdayDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  month: "long",
  day: "numeric",
  weekday: "long",
  timeZone: "Asia/Seoul",
});

const fullWeekdayDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "long",
  timeZone: "Asia/Seoul",
});

/** 채팅방의 날짜 구분. 오늘 "오늘", 어제 "어제", 올해 "10월 29일 목요일", 그 전 "2025년 12월 3일 수요일" */
export function formatChatDay(iso: string, now: Date) {
  const date = new Date(iso);
  const day = dayKeyFormatter.format(date);
  const today = dayKeyFormatter.format(now);
  if (day === today) return "오늘";
  if (day === dayKeyFormatter.format(new Date(now.getTime() - DAY_MS))) return "어제";
  if (day.slice(0, 4) === today.slice(0, 4)) return weekdayDateFormatter.format(date);
  return fullWeekdayDateFormatter.format(date);
}

/** 채팅 목록의 최근 일시. 오늘 "오후 3:12", 어제 "어제", 올해 "10월 28일", 그 전 "2025. 12. 3." */
export function formatChatTime(iso: string, now: Date) {
  const date = new Date(iso);
  const day = dayKeyFormatter.format(date);
  const today = dayKeyFormatter.format(now);
  if (day === today) return timeFormatter.format(date);
  if (day === dayKeyFormatter.format(new Date(now.getTime() - DAY_MS))) return "어제";
  if (day.slice(0, 4) === today.slice(0, 4)) return dateFormatter.format(date);
  return fullDateFormatter.format(date);
/** "5,000원". 1크레딧 = 1원이라 출금 금액에 쓴다 */
export function formatWon(amount: number) {
  return `${numberFormatter.format(amount)}원`;
}
