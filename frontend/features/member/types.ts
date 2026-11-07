import type { CreditBalance, CreditEntry } from "@/features/credit/types";
import type { Subscription } from "@/features/subscription/types";

/** 회원 기본 정보. 개발자와 테스터는 한 계정이다 */
export type Profile = {
  name: string;
  nickname: string;
  email: string;
};

/** 지금 할 일은 테스트 참여와 내 프로젝트에서만 나온다 */
export type TodoCategory = "participation" | "project";

export const TODO_CATEGORY_LABEL: Record<TodoCategory, string> = {
  participation: "테스트 참여",
  project: "내 프로젝트",
};

/** 지금 할 일 한 줄 */
export type Todo = {
  id: string;
  category: TodoCategory;
  title: string;
  /** 오른쪽에 붙는 값. 마감이 있으면 D-day, 없으면 금액·건수 */
  detail: string;
  href: string;
  /** 마감 시각. 있는 항목이 먼저, 가까운 순서로 보인다 */
  dueAt?: string;
};

export type ParticipationCounts = { applied: number; ongoing: number; completed: number; };

export type ProjectCounts = { projects: number; recruiting: number; newFeedback: number; };

export type Activity = {
  participation: ParticipationCounts;
  project: ProjectCounts;
};

export type MyPageSummary = {
  profile: Profile;
  credits: CreditBalance;
  /** 운영자처럼 구독 대상이 아니면 null */
  subscription: Subscription | null;
  todos: Todo[];
  /** 운영자처럼 서비스 이용 활동이 없으면 null */
  activity: Activity | null;
  /** 최신순 */
  recentCredits: CreditEntry[];
};
