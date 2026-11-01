import "server-only";
import { getDemoDataMode } from "@/lib/demo";
import { loadAll } from "./api";
import type { Report } from "./types";

/*
 * 회원 관리 데이터. 타입·목업·데이터 함수를 한 파일에 둔다.
 * 출금 요청 관리(PR #12)가 types.ts·mock.ts·api.ts 끝에 코드를 더하고 있어서, 병합 충돌을 줄이려고 회원 코드는 따로 뒀다.
 * 제재 이력과 받은 신고는 따로 저장하지 않고, 신고·제재 관리와 같은 loadAll()로 읽은 신고에서 계산한다.
 * 그래서 신고·제재 관리에서 신고를 처리하면 여기에도 바로 반영된다.
 *
 * 주의: AdminUser에는 실명·이메일 원문이 들어 있다. 지금은 서버 컴포넌트에서 가려서 그리기만 해서 브라우저로 나가지 않는다.
 * 클라이언트 컴포넌트에 넘길 때는 원문 대신 maskName·maskEmail로 가린 값만 넘긴다. props로 넘긴 값은 그대로 브라우저에 실린다.
 */

export type UserRole = "tester" | "developer";

export const USER_ROLE_LABEL: Record<UserRole, string> = {
  tester: "테스터",
  developer: "개발자",
};

/** 테스터는 참여 기록, 개발자는 프로젝트·구독을 본다. 미완료는 "악의적인 미완료 반복"을 판단할 때 본다 */
export type UserActivity =
  | { role: "tester"; confirmedCount: number; submittedCount: number; incompleteCount: number }
  | { role: "developer"; projectCount: number; recruitmentCount: number; subscribed: boolean };

/** 회원. id가 상세 주소의 userKey다. 주소에는 이름·아이디 대신 번호를 쓴다 */
export type AdminUser = {
  id: string;
  nickname: string;
  /** 원문이다. 화면에는 maskName으로 가려서 보여 주고, 클라이언트 컴포넌트에 넘기지 않는다 */
  realName: string;
  /** 원문이다. 화면에는 maskEmail로 가려서 보여 주고, 클라이언트 컴포넌트에 넘기지 않는다 */
  email: string;
  joinedAt: string;
  activity: UserActivity;
};

/** 목록 한 줄. 제재 이력 = 인정된 신고, 검토 대기 = 아직 처리하지 않은 신고 */
export type UserSummary = AdminUser & { sanctionCount: number; pendingReportCount: number };

/** 상세. 받은 신고는 접수가 최근인 순서, 제재 이력은 처리가 최근인 순서 */
export type UserDetail = AdminUser & { sanctions: Report[]; receivedReports: Report[] };

export type UserFilter = "all" | "sanctioned" | "reported";

export const USER_FILTERS: { filter: UserFilter; label: string }[] = [
  { filter: "all", label: "전체" },
  { filter: "sanctioned", label: "제재 이력 있음" },
  { filter: "reported", label: "검토 대기 신고 있음" },
];

export function parseUserFilter(value: unknown): UserFilter {
  return value === "sanctioned" || value === "reported" ? value : "all";
}

export const USER_QUERY_MAX_LENGTH = 20;

/** 검색어. 앞뒤 공백은 무시하고 20자까지 받는다 */
export function parseUserQuery(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, USER_QUERY_MAX_LENGTH) : "";
}

/** 실명 가림. 두 글자는 뒤 글자를, 세 글자 이상은 처음과 끝만 남긴다 */
export function maskName(name: string) {
  const chars = [...name];
  if (chars.length <= 1) return "*";
  if (chars.length === 2) return `${chars[0]}*`;
  return `${chars[0]}${"*".repeat(chars.length - 2)}${chars[chars.length - 1]}`;
}

/** 이메일 가림. @ 앞의 앞 두 글자만 남기고 도메인은 그대로 둔다 */
export function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  return `${local.slice(0, 2)}***@${domain}`;
}

/*
 * 시연용 샘플. 신고·출금·모집 취소 목업에 나오는 10명이고, 가입이 오래된 회원부터 번호를 붙였다. 실명은 닉네임과 같게 뒀다.
 * 키는 배열 순서로 만들지 않고 직접 적는다. 신고 목업(mock.ts)의 targetUserKey가 이 키를 문자열로 가리켜서,
 * 회원을 중간에 끼워 넣어도 키가 밀리지 않게 하려는 것이다.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (now: Date, days: number) => new Date(now.getTime() - days * DAY_MS).toISOString();

type UserSeed = Omit<AdminUser, "realName" | "email" | "joinedAt"> & { joinedDaysAgo: number };

const tester = (confirmedCount: number, submittedCount: number, incompleteCount: number): UserActivity => ({
  role: "tester",
  confirmedCount,
  submittedCount,
  incompleteCount,
});

const developer = (projectCount: number, recruitmentCount: number, subscribed: boolean): UserActivity => ({
  role: "developer",
  projectCount,
  recruitmentCount,
  subscribed,
});

const SEEDS: UserSeed[] = [
  { id: "user-1", nickname: "박도현", joinedDaysAgo: 55, activity: developer(3, 5, true) },
  { id: "user-2", nickname: "정하린", joinedDaysAgo: 47, activity: developer(2, 3, true) },
  { id: "user-3", nickname: "최유나", joinedDaysAgo: 40, activity: developer(1, 2, false) },
  { id: "user-4", nickname: "서준호", joinedDaysAgo: 33, activity: tester(7, 5, 2) },
  { id: "user-5", nickname: "이지우", joinedDaysAgo: 26, activity: tester(8, 8, 0) },
  { id: "user-6", nickname: "오태민", joinedDaysAgo: 20, activity: tester(5, 4, 1) },
  { id: "user-7", nickname: "윤소희", joinedDaysAgo: 15, activity: tester(4, 3, 1) },
  { id: "user-8", nickname: "한서윤", joinedDaysAgo: 12, activity: tester(6, 6, 0) },
  { id: "user-9", nickname: "김민준", joinedDaysAgo: 8, activity: tester(3, 3, 0) },
  { id: "user-10", nickname: "강민서", joinedDaysAgo: 3, activity: tester(2, 1, 1) },
];

function buildUsers(now: Date): AdminUser[] {
  return SEEDS.map(({ joinedDaysAgo, ...seed }) => ({
    ...seed,
    realName: seed.nickname,
    /* 이메일도 이름과 관계없는 값이다. user-4 → member04@example.com */
    email: `member${seed.id.replace("user-", "").padStart(2, "0")}@example.com`,
    joinedAt: daysAgo(now, joinedDaysAgo),
  }));
}

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
