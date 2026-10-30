import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getDemoDataMode } from "@/lib/demo";
import { formatDday } from "@/lib/format";
import { getSession } from "@/lib/session";
import { buildMyPageSummary } from "./mock";
import type { MyPageSummary, Todo } from "./types";

/*
 * 마이페이지 데이터 접근. 지금은 목업을 돌려준다.
 * 실제 API를 붙일 때는 이 파일의 함수 본문만 바꾸고 시그니처는 유지한다.
 */

const SLOW_DELAY_MS = 1500;

/** 로그인한 회원의 마이페이지 요약. 비로그인이면 로그인으로 보낸다 */
export async function getMyPageSummary(): Promise<MyPageSummary> {
  const session = await getSession();
  if (session.role === "guest") redirect(`/login?next=${encodeURIComponent("/my")}`);
  if ((await getDemoDataMode()) === "slow") await new Promise((resolve) => setTimeout(resolve, SLOW_DELAY_MS));
  /* 구독 만료일은 요청 시각 기준이라 미리 렌더링하지 않는다 */
  await connection();
  const now = new Date();
  const summary = buildMyPageSummary(session.role, now);
  return { ...summary, todos: sortTodos(summary.todos, now) };
}

const TODO_LIMIT = 5;

/** 마감이 있는 할 일이 먼저, 가까운 순서. 마감 항목의 detail은 D-day로 채운다 */
function sortTodos(todos: Todo[], now: Date): Todo[] {
  const withDue = todos.filter((todo) => todo.dueAt).sort((a, b) => a.dueAt!.localeCompare(b.dueAt!));
  const rest = todos.filter((todo) => !todo.dueAt);
  return [...withDue, ...rest]
    .slice(0, TODO_LIMIT)
    .map((todo) => (todo.dueAt ? { ...todo, detail: formatDday(todo.dueAt, now) } : todo));
}
