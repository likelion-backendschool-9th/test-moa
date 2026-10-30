import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getDemoDataMode } from "@/lib/demo";
import { formatDday } from "@/lib/format";
import { getSession, type Session } from "@/lib/session";
import { buildMyPageSummary, DEMO_PASSWORD, DEMO_PROFILES } from "./mock";
import type { MyPageSummary, Profile, Todo } from "./types";

/*
 * 마이페이지 데이터 접근. 지금은 목업을 돌려준다.
 * 실제 API를 붙일 때는 이 파일의 함수 본문만 바꾸고 시그니처는 유지한다.
 */

const SLOW_DELAY_MS = 1500;

/** 로그인한 회원의 마이페이지 요약. 비로그인이면 로그인으로 보낸다 */
export async function getMyPageSummary(): Promise<MyPageSummary> {
  const session = await requireMember("/my");
  /* 구독 만료일은 요청 시각 기준이라 미리 렌더링하지 않는다 */
  await connection();
  const now = new Date();
  const summary = buildMyPageSummary(session.role, now);
  return { ...summary, todos: sortTodos(summary.todos, now) };
}

/** 개인정보 수정에 채울 현재 회원 정보. 비로그인이면 로그인으로 보낸다 */
export async function getProfile(next: string): Promise<Profile> {
  const session = await requireMember(next);
  return DEMO_PROFILES[session.role];
}

/** 다른 회원이 쓰고 있는 닉네임인지. 자기 닉네임은 쓸 수 있다 */
export function isNicknameTaken(nickname: string, own: string): boolean {
  return nickname !== own && Object.values(DEMO_PROFILES).some((profile) => profile.nickname === nickname);
}

/** 현재 비밀번호가 맞는지. 목업이라 시연 회원 모두 같은 값과 비교한다 */
export function isCurrentPassword(password: string): boolean {
  return password === DEMO_PASSWORD;
}

/** 로그인한 회원만 통과시킨다. 시연용 지연(demo-data=slow)도 여기서 건다 */
async function requireMember(next: string): Promise<Exclude<Session, { role: "guest" }>> {
  const session = await getSession();
  if (session.role === "guest") redirect(`/login?next=${encodeURIComponent(next)}`);
  if ((await getDemoDataMode()) === "slow") await new Promise((resolve) => setTimeout(resolve, SLOW_DELAY_MS));
  return session;
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
