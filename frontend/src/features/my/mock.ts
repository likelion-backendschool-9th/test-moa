import type { Role } from "@/lib/session";
import type { MyPageSummary, PlanTerms, SubscriptionPlan, Todo } from "./types";

/*
 * 시연용 샘플 데이터. 실제 사용자와 관계없다.
 * tester·developer는 계정 종류가 아니라 시연용 회원 두 명이다 (미구독 회원, 구독 중인 회원).
 * 날짜는 기준 시각에서 상대적으로 만들어 언제 시연해도 같은 상태로 보인다.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const SUBSCRIPTION_DAYS_LEFT = 30;

/** 무료 조건. 한도는 기획에서 미정이라 임시값이다 */
export const FREE_PLAN: PlanTerms = {
  monthlyLimit: 10,
  benefits: {
    selection: "선착순 자동 확정",
    reward: "기본 보상",
    chat: "없음",
    exposure: "일반 목록",
  },
};

/** 구독 상품. 가격·기간·한도는 기획에서 미정이라 임시값이다 (가격은 spec.md 3장의 예시 값) */
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "basic",
    name: "구독",
    periodDays: SUBSCRIPTION_DAYS_LEFT,
    cashPrice: 10000,
    creditPrice: 9000,
    monthlyLimit: 30,
    benefits: {
      selection: "지원자 중 직접 선정",
      reward: "기본 + 추가 보상",
      chat: "선정한 테스터와 가능",
      exposure: "상단 구독 영역",
    },
  },
];

/** 이번 달 모집 글에 건 인원 합계. 구독 중인 시연 회원만 모집 중인 글이 있다 */
export function monthlyRecruitUsed(role: Role) {
  return role === "developer" ? 12 : 0;
}

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
        subscription: { status: "active", planId: "basic", expiresAt: daysFrom(now, SUBSCRIPTION_DAYS_LEFT) },
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
        subscription: null,
        todos: [],
        activity: null,
      };
  }
}
