import type { Role } from "@/lib/session";
import type { CreditEntry, MyPageSummary, Profile, Todo } from "./types";

/*
 * 시연용 샘플 데이터. 실제 사용자와 관계없다.
 * tester·developer는 계정 종류가 아니라 시연용 회원 두 명이다 (미구독 회원, 구독 중인 회원).
 * 이메일은 예시용 도메인(example.com)만 쓴다.
 * 크레딧 총합은 src/lib/session.ts의 값과 맞춘다. 금액은 기획에서 미정이라 임시값이다.
 * 날짜는 기준 시각에서 상대적으로 만들어 언제 시연해도 같은 상태로 보인다.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const SUBSCRIPTION_DAYS_LEFT = 30;

const daysFrom = (now: Date, days: number) => new Date(now.getTime() + days * DAY_MS).toISOString();

export const DEMO_PROFILES: Record<Exclude<Role, "guest">, Profile> = {
  tester: { name: "한서윤", nickname: "윤슬", email: "seoyun@example.com" },
  developer: { name: "박도현", nickname: "도현랩", email: "dohyun@example.com" },
  admin: { name: "운영자", nickname: "운영자", email: "admin@example.com" },
};

/** 시연 회원 모두 같은 비밀번호를 쓴다. 실제 비밀번호와 관계없다 */
export const DEMO_PASSWORD = "test1234";

type EntrySeed = Omit<CreditEntry, "occurredAt"> & { daysAgo: number };

const toEntries = (now: Date, seeds: EntrySeed[]): CreditEntry[] =>
  seeds.map(({ daysAgo, ...entry }) => ({ ...entry, occurredAt: daysFrom(now, -daysAgo) }));

export function buildMyPageSummary(role: Exclude<Role, "guest">, now: Date): MyPageSummary {
  switch (role) {
    case "tester":
      return {
        profile: DEMO_PROFILES.tester,
        credits: { earned: 9480, signup: 3000, pendingWithdrawal: 0, pendingReward: 1350 },
        subscription: { status: "none" },
        todos: [
          {
            id: "start-moaplan",
            category: "participation",
            title: "모아플랜 참여 확정, 테스트 시작하기",
            detail: "",
            href: "/my/participations?tab=ongoing",
            dueAt: daysFrom(now, 9),
          },
          {
            id: "submit-booklog",
            category: "participation",
            title: "북로그 피드백 제출",
            detail: "",
            href: "/my/participations?tab=ongoing",
            dueAt: daysFrom(now, 2),
          },
        ] satisfies Todo[],
        activity: {
          participation: { applied: 2, ongoing: 1, completed: 5 },
          project: { projects: 0, recruiting: 0, newFeedback: 0 },
        },
        recentCredits: toEntries(now, [
          { id: "t5", label: "레시피핏 테스트 보상", amount: 1260, daysAgo: 1 },
          { id: "t4", label: "가계부 노트 테스트 보상", amount: 1100, daysAgo: 4 },
          { id: "t3", label: "회의록 정리 테스트 보상", amount: 980, daysAgo: 9 },
          { id: "t2", label: "포트폴리오 빌더 테스트 보상", amount: 1200, daysAgo: 15 },
          { id: "t1", label: "가입 크레딧", amount: 3000, daysAgo: 30 },
        ]),
      };
    case "developer":
      return {
        profile: DEMO_PROFILES.developer,
        credits: { earned: 2260, signup: 1000, pendingWithdrawal: 1000, pendingReward: 0 },
        subscription: { status: "active", expiresAt: daysFrom(now, SUBSCRIPTION_DAYS_LEFT) },
        todos: [
          { id: "feedback-minutes", category: "project", title: "회의록 정리 새 피드백 확인", detail: "3건", href: "/my/projects" },
          {
            id: "select-ledger",
            category: "project",
            title: "가계부 노트 지원자 선정",
            detail: "",
            href: "/my/projects",
            dueAt: daysFrom(now, 3),
          },
        ],
        activity: {
          participation: { applied: 1, ongoing: 0, completed: 3 },
          project: { projects: 2, recruiting: 1, newFeedback: 3 },
        },
        recentCredits: toEntries(now, [
          { id: "d5", label: "출금 신청", amount: -1000, daysAgo: 1 },
          { id: "d4", label: "구독 결제", amount: -2000, daysAgo: 3 },
          { id: "d3", label: "북로그 테스트 보상", amount: 1350, daysAgo: 6 },
          { id: "d2", label: "모아플랜 테스트 보상", amount: 1180, daysAgo: 12 },
          { id: "d1", label: "가입 크레딧", amount: 3000, daysAgo: 40 },
        ]),
      };
    case "admin":
      return {
        profile: DEMO_PROFILES.admin,
        credits: { earned: 0, signup: 0, pendingWithdrawal: 0, pendingReward: 0 },
        subscription: null,
        todos: [],
        activity: null,
        recentCredits: [],
      };
  }
}
