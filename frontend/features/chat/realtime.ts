/** 실패가 이어질 때 1초부터 두 배씩 늘리되 30초를 넘기지 않는다 */
export function nextChatRetryDelay(current: number) {
  return Math.min(current * 2, 30_000);
}

export function shouldRetryChatRead(status: number) {
  return status !== 401 && status !== 404;
}

export function shouldRefreshChatInbox(event: { type: "ready" | "message" } | { type: "read"; reader: "me" | "partner" }) {
  return event.type === "ready" || event.type === "message" || (event.type === "read" && event.reader === "me");
}
