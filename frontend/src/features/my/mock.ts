import type { Role } from "@/lib/session";
import type { MyPageSummary, Todo } from "./types";

/*
 * 시연용 샘플 데이터. 실제 사용자와 관계없다.
 * tester·developer는 계정 종류가 아니라 시연용 회원 두 명이다 (미구독 회원, 구독 중인 회원).
 * 이메일은 예시용 도메인(example.com)만 쓴다.
 * 날짜는 기준 시각에서 상대적으로 만들어 언제 시연해도 같은 상태로 보인다.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const SUBSCRIPTION_DAYS_LEFT = 30;

const daysFrom = (now: Date, days: number) => new Date(now.getTime() + days * DAY_MS).toISOString();

/** 크레딧 잔액·최근 내역은 features/credit 목업에서 가져온다 */
export type MyPageSeed = Omit<MyPageSummary, "credits" | "recentCredits">;

export function buildMyPageSummary(role: Exclude<Role, "guest">, now: Date): MyPageSeed {
  switch (role) {
    case "tester":
      return {
        profile: {
          name: "한서윤",
          nickname: "윤슬",
          email: "seoyun@example.com",
        },
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
      };
    case "developer":
      return {
        profile: {
          name: "박도현",
          nickname: "도현랩",
          email: "dohyun@example.com",
        },
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
      };
    case "admin":
      return {
        profile: { name: "운영자", nickname: "운영자", email: "admin@example.com" },
        subscription: null,
        todos: [],
        activity: null,
      };
  }
}
