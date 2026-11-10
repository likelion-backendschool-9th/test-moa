import type { CreditBalance, CreditEntry } from "@/features/credit/types";
import type { Subscription } from "@/features/subscription/types";

/** 로그인 방식. LOCAL은 이메일·비밀번호 */
export type LoginProvider = "LOCAL" | "GOOGLE" | "GITHUB";

/** 회원 기본 정보. 개발자와 테스터는 한 계정이다 */
export type Profile = {
  name: string;
  nickname: string;
  email: string;
  /** 연동된 로그인 방식. 실제 로그인(AUTH_MODE=backend)에서만 채운다 */
  providers?: LoginProvider[];
  /** 이메일 로그인 비밀번호가 있는지. 없으면(소셜로만 가입) 비밀번호 변경 대신 "비밀번호 만들기". 목업은 늘 있다 */
  hasPassword?: boolean;
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

/* ---- 연동된 계정(#84) ---- */

/** 연동된 로그인 방식과 방식별 이메일(GET /api/users/me의 providers·accounts). 이메일을 모르는 계정은 빠진다 */
export type LinkedAccountsInfo = { providers: LoginProvider[]; emails: Partial<Record<LoginProvider, string>> };
/* ---- 회원 탈퇴(#84) ---- */

/** 탈퇴 확인 창의 안내. 남은 크레딧은 탈퇴하면 사라지고, 출금 처리 중인 크레딧이 있으면 탈퇴할 수 없다 */
export type LeaveNotice = {
  credits: number;
  pendingWithdrawal: number;
  /** 비밀번호가 없는(소셜로만 가입한) 회원은 비밀번호 대신 확인 문구를 입력한다 */
  hasPassword: boolean;
};

export const LEAVE_PENDING_WITHDRAWAL = "출금 처리 중인 크레딧이 있어 지금은 탈퇴할 수 없어요. 처리된 뒤 다시 시도해 주세요";

/** 소셜로만 가입한 회원이 입력할 확인 문구. 백엔드(WithdrawRequest.CONFIRM_TEXT)와 같다 */
export const LEAVE_CONFIRM_TEXT = "탈퇴합니다";
