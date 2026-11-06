import type { Report } from "@/features/report/types";

/*
 * 회원 관리 데이터. 타입·목업·데이터 함수를 한 파일에 둔다.
 * 출금 요청 관리(PR #12)가 types.ts·mock.ts·api.ts 끝에 코드를 더하고 있어서, 병합 충돌을 줄이려고 회원 코드는 따로 뒀다.
 * 제재 이력과 받은 신고는 따로 저장하지 않고, 신고·제재 관리와 같은 loadAll()로 읽은 신고에서 계산한다.
 * 그래서 신고·제재 관리에서 신고를 처리하면 여기에도 바로 반영된다.
 *
 * 주의: AdminUser에는 실명·이메일 원문이 들어 있다. 지금은 서버 컴포넌트에서 가려서 그리기만 해서 브라우저로 나가지 않는다.
 * 클라이언트 컴포넌트에 넘길 때는 원문 대신 maskName·maskEmail로 가린 값만 넘긴다. props로 넘긴 값은 그대로 브라우저에 실린다.
 */

/*
 * 한 사람이 테스터도 되고 개발자도 된다(백엔드 Role은 USER·ADMIN뿐이다). 그래서 회원에게 역할 하나를 붙이지 않고,
 * 테스터 활동과 개발자 활동을 따로 둔다. 해 본 적이 없는 쪽은 null이다.
 */

/** 테스터 활동. 미완료는 "악의적인 미완료 반복"을 판단할 때 본다 */
export type TesterActivity = { confirmedCount: number; submittedCount: number; incompleteCount: number; };

/** 개발자 활동. 프로젝트와 구독을 본다 */
export type DeveloperActivity = { projectCount: number; recruitmentCount: number; subscribed: boolean; };

export type UserActivity = { tester: TesterActivity | null; developer: DeveloperActivity | null; };

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
export type UserSummary = AdminUser & { sanctionCount: number; pendingReportCount: number; };

/** 상세. 받은 신고는 접수가 최근인 순서, 제재 이력은 처리가 최근인 순서 */
export type UserDetail = AdminUser & { sanctions: Report[]; receivedReports: Report[]; };

export type UserFilter = "all" | "sanctioned" | "reported";

export const USER_FILTERS: { filter: UserFilter; label: string; }[] = [
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
