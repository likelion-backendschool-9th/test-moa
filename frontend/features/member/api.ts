import { DEMO_PASSWORD,DEMO_PROFILES } from "@/demo/member";
import type { Role } from "@/features/session/session";
import "server-only";
import type { Profile } from "./types";

/*
 * 회원 데이터 조회. 로그인·회원가입·개인정보 수정이 모두 이 파일로 회원 정보를 본다.
 * 지금은 시연 회원 목업을 돌려준다. 실제 API를 붙일 때는 함수 본문만 바꾸고 시그니처는 유지한다.
 */

type MemberRole = Exclude<Role, "guest">;

/** 역할에 해당하는 시연 회원의 기본 정보 */
export function getMemberProfile(role: MemberRole): Profile {
  return DEMO_PROFILES[role];
}

/** 다른 회원이 쓰고 있는 닉네임인지. own을 넘기면 자기 닉네임은 쓸 수 있다 */
export function isNicknameTaken(nickname: string, own?: string): boolean {
  return nickname !== own && Object.values(DEMO_PROFILES).some((profile) => profile.nickname === nickname);
}

/** 현재 비밀번호가 맞는지. 목업이라 시연 회원 모두 같은 값과 비교한다 */
export function isCurrentPassword(password: string): boolean {
  return password === DEMO_PASSWORD;
}

/** 이메일·비밀번호가 맞는 시연 회원의 역할. 이메일은 대소문자를 가리지 않는다. 맞지 않으면 null */
export function findRoleByCredentials(email: string, password: string): MemberRole | null {
  const normalized = email.trim().toLowerCase();
  const entry = (Object.entries(DEMO_PROFILES) as [MemberRole, Profile][]).find(([, profile]) => profile.email === normalized);
  return entry && password === DEMO_PASSWORD ? entry[0] : null;
}

/** 이미 가입한 이메일인지. 대소문자를 가리지 않는다 */
export function isEmailTaken(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return Object.values(DEMO_PROFILES).some((profile) => profile.email === normalized);
}

export type DemoAccount = { role: MemberRole; email: string };

/** 로그인 화면에 안내할 시연 계정과 공통 비밀번호 */
export function getDemoAccounts(): { accounts: DemoAccount[]; password: string } {
  const accounts = (Object.entries(DEMO_PROFILES) as [MemberRole, Profile][]).map(([role, profile]) => ({ role, email: profile.email }));
  return { accounts, password: DEMO_PASSWORD };
}

import { getDemoDataMode } from "@/demo/mode";
import { loadAll } from "@/features/admin/api";
import type { Report } from "@/features/admin/types";
import "server-only";

import { buildUsers } from "@/demo/member";
import type { UserDetail,UserFilter,UserSummary } from "./admin";


/** 상세 주소의 회원 키 목록. 신고·출금 키와 같이 목업에서 뽑아 두어, 쿠키를 읽기 전에 없는 회원인지 안다 */
const USER_KEYS = buildUsers(new Date(0)).map((user) => user.id);


export function isUserKey(userKey: string) {
  return USER_KEYS.includes(userKey);
}


export function getUserKeys() {
  return [...USER_KEYS];
}


/* 신고는 신고·제재 관리와 같은 loadAll()로 읽는다. 권한 확인과 시연 모드(slow·empty)도 거기서 한다 */
async function loadUsersAndReports() {
  const { now, reports } = await loadAll();
  const users = (await getDemoDataMode()) === "empty" ? [] : buildUsers(now);
  return { now, users, reports };
}


const reportsFor = (reports: Report[], userKey: string) => reports.filter((report) => report.targetUserKey === userKey);


/** 최근 가입 순서. 필터와 닉네임 검색(부분 일치)을 함께 쓸 수 있다 */
export async function getUsers(filter: UserFilter, query: string): Promise<UserSummary[]> {
  const { users, reports } = await loadUsersAndReports();
  return users
    .map((user) => {
      const received = reportsFor(reports, user.id);
      return {
        ...user,
        sanctionCount: received.filter((report) => report.review?.decision === "upheld").length,
        pendingReportCount: received.filter((report) => !report.review).length,
      };
    })
    .filter((user) => filter !== "sanctioned" || user.sanctionCount > 0)
    .filter((user) => filter !== "reported" || user.pendingReportCount > 0)
    .filter((user) => !query || user.nickname.includes(query))
    .sort((a, b) => b.joinedAt.localeCompare(a.joinedAt));
}


export async function getUser(userKey: string): Promise<{ now: Date; user: UserDetail | null }> {
  const { now, users, reports } = await loadUsersAndReports();
  const user = users.find((item) => item.id === userKey);
  if (!user) return { now, user: null };
  const receivedReports = reportsFor(reports, userKey).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const sanctions = receivedReports
    .filter((report) => report.review?.decision === "upheld")
    .sort((a, b) => b.review!.processedAt.localeCompare(a.review!.processedAt));
  return { now, user: { ...user, sanctions, receivedReports } };
}

import { buildMyPageSummary } from "@/demo/member";
import { waitIfSlow } from "@/demo/mode";
import { creditDataFor } from "@/features/credit/api";
import type { MyPageSummary,Todo } from "@/features/member/types";
import { requireMember } from "@/features/session/guard";
import { formatDday } from "@/lib/format";
import { connection } from "next/server";
import "server-only";

import { subscriptionFor } from "@/features/subscription/api";


/*
 * 마이페이지 데이터 접근. 지금은 목업을 돌려준다.
 * 실제 API를 붙일 때는 이 파일의 함수 본문만 바꾸고 시그니처는 유지한다.
 */

const RECENT_CREDITS = 5;


/** 로그인한 회원의 마이페이지 요약. 비로그인이면 로그인으로 보낸다 */
export async function getMyPageSummary(): Promise<MyPageSummary> {
  const session = await requireMember("/my");
  await waitIfSlow();
  /* 구독 만료일은 요청 시각 기준이라 미리 렌더링하지 않는다 */
  await connection();
  const now = new Date();
  const summary = buildMyPageSummary(session.role, now);
  const [credit, subscription] = await Promise.all([creditDataFor(session.role, now), subscriptionFor(session.role, now)]);
  return {
    ...summary,
    subscription,
    profile: getMemberProfile(session.role),
    todos: sortTodos(summary.todos, now),
    credits: credit.balance,
    recentCredits: credit.ledger.slice(0, RECENT_CREDITS),
  };
}


/** 개인정보 수정에 채울 현재 회원 정보. 비로그인이면 로그인으로 보낸다 */
export async function getProfile(next: string): Promise<Profile> {
  const session = await requireMember(next);
  await waitIfSlow();
  return getMemberProfile(session.role);
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
