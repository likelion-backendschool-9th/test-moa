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

/** "5,000원". 1크레딧 = 1원이라 출금 금액에 쓴다 */
export function formatWon(amount: number) {
  return `${numberFormatter.format(amount)}원`;
}
