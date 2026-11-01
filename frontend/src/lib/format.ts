const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  month: "long",
  day: "numeric",
  timeZone: "Asia/Seoul",
});

/* 오전·오후 표기는 ICU 버전마다 달라서(Node 24는 "AM/PM") 24시간 값만 받아 직접 붙인다 */
const hourFormatter = new Intl.DateTimeFormat("ko-KR", {
  hour: "numeric",
  hourCycle: "h23",
  timeZone: "Asia/Seoul",
});

const numberFormatter = new Intl.NumberFormat("ko-KR");

/** "11월 6일" */
export function formatDate(iso: string) {
  return dateFormatter.format(new Date(iso));
}

/** "11월 6일 오후 3시" */
export function formatDateTime(iso: string) {
  const date = new Date(iso);
  const hour = Number(hourFormatter.formatToParts(date).find((part) => part.type === "hour")?.value);
  return `${dateFormatter.format(date)} ${hour < 12 ? "오전" : "오후"} ${hour % 12 || 12}시`;
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

/** "5,000원". 1크레딧 = 1원이라 출금 금액에 쓴다 */
export function formatWon(amount: number) {
  return `${numberFormatter.format(amount)}원`;
}
