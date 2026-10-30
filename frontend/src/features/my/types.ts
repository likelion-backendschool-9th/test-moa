/*
 * 마이페이지 요약. 개발자와 테스터는 한 계정이라 역할로 나누지 않는다.
 * 화면 분기는 데이터(구독 여부, 출금 가능 금액, 활동 유무)로만 한다.
 */

/** 보유 크레딧의 구성 (GLOSSARY: 크레딧) */
export type CreditBalance = {
  /** 테스트로 획득한 크레딧. 구독 결제와 현금화에 쓸 수 있다 */
  earned: number;
  /** 가입 크레딧. 구독 결제 전용이다 */
  signup: number;
  /** 출금 요청 뒤 처리 중이라 잠긴 크레딧. earned에 포함된다 */
  pendingWithdrawal: number;
  /** 승인 대기 보상. 아직 지급 전이라 잔액에 포함하지 않는다 (GLOSSARY: 승인 대기 보상) */
  pendingReward: number;
};

export type Subscription = { status: "none" } | { status: "active"; expiresAt: string };

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

export type ParticipationCounts = { applied: number; ongoing: number; completed: number };
export type ProjectCounts = { projects: number; recruiting: number; newFeedback: number };

export type Activity = {
  participation: ParticipationCounts;
  project: ProjectCounts;
};

export type CreditEntry = {
  id: string;
  label: string;
  /** 늘어나면 양수, 줄어들면 음수 */
  amount: number;
  occurredAt: string;
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

export function totalCredits({ earned, signup }: CreditBalance) {
  return earned + signup;
}

/** 지금 출금 신청할 수 있는 크레딧 */
export function cashableCredits({ earned, pendingWithdrawal }: CreditBalance) {
  return earned - pendingWithdrawal;
}
