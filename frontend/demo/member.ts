import type { AdminUser, DeveloperActivity, TesterActivity } from "@/features/member/admin";
import type { MyPageSummary, Profile, Todo } from "@/features/member/types";
import { participationsPath } from "@/features/participation/paths";
import { PROJECTS_PATH } from "@/features/project/paths";
import type { Role } from "@/features/session/session";
import "server-only";

/*
 * 시연 회원 데이터. 실제 사용자와 관계없고, 이메일은 예시용 도메인(example.com)만 쓴다.
 * member/api.ts에서만 import한다.
 */

export const DEMO_PROFILES: Record<Exclude<Role, "guest">, Profile> = {
  tester: { name: "한서윤", nickname: "윤슬", email: "seoyun@example.com" },
  developer: { name: "박도현", nickname: "도현랩", email: "dohyun@example.com" },
  admin: { name: "운영자", nickname: "운영자", email: "admin@example.com" },
};

/** 시연 회원 모두 같은 비밀번호를 쓴다. 실제 비밀번호와 관계없다 */
export const DEMO_PASSWORD = "test1234";

const daysAgo = (now: Date, days: number) => new Date(now.getTime() - days * DAY_MS).toISOString();

type UserSeed = Omit<AdminUser, "realName" | "email" | "joinedAt"> & { joinedDaysAgo: number; };

const tester = (confirmedCount: number, submittedCount: number, incompleteCount: number): TesterActivity => ({
  confirmedCount,
  submittedCount,
  incompleteCount,
});

const developer = (projectCount: number, recruitmentCount: number, subscribed: boolean): DeveloperActivity => ({
  projectCount,
  recruitmentCount,
  subscribed,
});

const SEEDS: UserSeed[] = [
  { id: "user-1", nickname: "박도현", joinedDaysAgo: 55, activity: { tester: null, developer: developer(3, 5, true) } },
  /* 테스터이면서 개발자인 회원 */
  { id: "user-2", nickname: "정하린", joinedDaysAgo: 47, activity: { tester: tester(4, 4, 0), developer: developer(2, 3, true) } },
  { id: "user-3", nickname: "최유나", joinedDaysAgo: 40, activity: { tester: null, developer: developer(1, 2, false) } },
  { id: "user-4", nickname: "서준호", joinedDaysAgo: 33, activity: { tester: tester(7, 5, 2), developer: null } },
  { id: "user-5", nickname: "이지우", joinedDaysAgo: 26, activity: { tester: tester(8, 8, 0), developer: null } },
  { id: "user-6", nickname: "오태민", joinedDaysAgo: 20, activity: { tester: tester(5, 4, 1), developer: null } },
  { id: "user-7", nickname: "윤소희", joinedDaysAgo: 15, activity: { tester: tester(4, 3, 1), developer: null } },
  { id: "user-8", nickname: "한서윤", joinedDaysAgo: 12, activity: { tester: tester(6, 6, 0), developer: null } },
  { id: "user-9", nickname: "김민준", joinedDaysAgo: 8, activity: { tester: tester(3, 3, 0), developer: null } },
  { id: "user-10", nickname: "강민서", joinedDaysAgo: 3, activity: { tester: tester(2, 1, 1), developer: null } },
];

export function buildUsers(now: Date): AdminUser[] {
  return SEEDS.map(({ joinedDaysAgo, ...seed }) => ({
    ...seed,
    realName: seed.nickname,
    /* 이메일도 이름과 관계없는 값이다. user-4 → member04@example.com */
    email: `member${seed.id.replace("user-", "").padStart(2, "0")}@example.com`,
    joinedAt: daysAgo(now, joinedDaysAgo),
  }));
}

/*
 * 시연용 샘플 데이터. 실제 사용자와 관계없다.
 * tester·developer는 계정 종류가 아니라 시연용 회원 두 명이다 (미구독 회원, 구독 중인 회원).
 * 날짜는 기준 시각에서 상대적으로 만들어 언제 시연해도 같은 상태로 보인다.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

const SUBSCRIPTION_DAYS_LEFT = 30;

const daysFrom = (now: Date, days: number) => new Date(now.getTime() + days * DAY_MS).toISOString();

/** 크레딧 잔액·최근 내역은 features/credit 목업에서, 프로필은 features/member에서 가져온다 */
export type MyPageSeed = Omit<MyPageSummary, "credits" | "recentCredits" | "profile">;

export function buildMyPageSummary(role: Exclude<Role, "guest">, now: Date): MyPageSeed {
  switch (role) {
    case "tester":
      return {
        subscription: { status: "none" },
        todos: [
          {
            id: "start-moaplan",
            category: "participation",
            title: "모아플랜 참여 확정, 테스트 시작하기",
            detail: "",
            href: participationsPath("ongoing"),
            dueAt: daysFrom(now, 9),
          },
          {
            id: "submit-booklog",
            category: "participation",
            title: "북로그 피드백 제출",
            detail: "",
            href: participationsPath("ongoing"),
            dueAt: daysFrom(now, 2),
          },
        ] satisfies Todo[],
        activity: {
          participation: { applied: 2, ongoing: 1, completed: 5 },
          project: { projects: 0, recruiting: 0, newFeedback: 0 },
        },
      };
    case "developer":
      return {
        subscription: { status: "active", planId: "basic", expiresAt: daysFrom(now, SUBSCRIPTION_DAYS_LEFT) },
        todos: [
          { id: "feedback-minutes", category: "project", title: "회의록 정리 새 피드백 확인", detail: "3건", href: PROJECTS_PATH },
          {
            id: "select-ledger",
            category: "project",
            title: "가계부 노트 지원자 선정",
            detail: "",
            href: PROJECTS_PATH,
            dueAt: daysFrom(now, 3),
          },
        ],
        activity: {
          participation: { applied: 1, ongoing: 0, completed: 3 },
          project: { projects: 2, recruiting: 1, newFeedback: 3 },
        },
      };
    case "admin":
      return {
        subscription: null,
        todos: [],
        activity: null,
      };
  }
}
