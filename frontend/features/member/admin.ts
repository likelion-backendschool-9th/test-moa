import type { Report } from "@/features/report/types";

/*
 * 회원 관리의 타입과 필터·이름 가리기 규칙.
 * AdminUser에는 실명·이메일 원문이 들어 있다. 서버 컴포넌트에서 가려서 그리며,
 * 클라이언트 컴포넌트로 넘길 때는 maskName·maskEmail로 가린 값만 넘긴다.
 */

/*
 * 한 사람이 테스터도 되고 개발자도 된다(백엔드 Role은 USER·ADMIN뿐이다). 그래서 회원에게 역할 하나를 붙이지 않고,
 * 테스터 활동과 개발자 활동을 따로 둔다. 해 본 적이 없는 쪽은 null이다.
 */

/** 테스터 활동. 미완료는 "악의적인 미완료 반복"을 판단할 때 본다 */
export type TesterActivity = { confirmedCount: number; submittedCount: number; incompleteCount: number };

/** 개발자 활동. 프로젝트와 구독을 본다 */
export type DeveloperActivity = { projectCount: number; recruitmentCount: number; subscribed: boolean };

export type UserActivity = { tester: TesterActivity | null; developer: DeveloperActivity | null };

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
