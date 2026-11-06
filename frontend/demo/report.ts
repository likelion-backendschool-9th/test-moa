import type { Report } from "@/features/report/types";
import { isReportDecision, type ReportReview } from "@/features/report/types";
import { cookies } from "next/headers";
import "server-only";

/*
 * 시연용 샘플 데이터. 실제 서비스나 사용자와 관계없다.
 * 모집 건 이름은 모집 목업을 재사용하고, 시각은 기준 시각에서 몇 시간 전으로 만든다.
 * 그래서 언제 열어도 같은 신고에 "72시간 지남"이 붙는다.
 */

const HOUR_MS = 60 * 60 * 1000;

const hoursAgo = (now: Date, hours: number) => new Date(now.getTime() - hours * HOUR_MS).toISOString();

/** 검토 대기 4건과 이미 처리한 2건 */
export function buildReports(now: Date): Report[] {
  return [
    {
      id: "report-1",
      targetType: "feedback",
      recruitmentName: "회의록 정리",
      recruitmentSlug: "meeting-notes",
      reason: "요청한 기능을 써 보지 않고 제출했어요",
      reporterNickname: "정하린",
      targetNickname: "오태민",
      targetUserKey: "user-6",
      feedback: "잘 되는 것 같아요. 특별히 불편한 점은 없었어요.",
      createdAt: hoursAgo(now, 80),
      holdsReward: true,
    },
    {
      id: "report-2",
      targetType: "feedback",
      recruitmentName: "북로그",
      recruitmentSlug: "booklog",
      reason: "같은 문장을 반복한 피드백이에요",
      reporterNickname: "박도현",
      targetNickname: "윤소희",
      targetUserKey: "user-7",
      feedback: "좋아요 좋아요 좋아요. 책 등록이 좋아요. 기록도 좋아요. 좋아요.",
      createdAt: hoursAgo(now, 30),
      holdsReward: true,
    },
    {
      id: "report-3",
      targetType: "recruitment",
      recruitmentName: "포트폴리오 빌더",
      recruitmentSlug: "folio-builder",
      reason: "모집 글과 실제 서비스 내용이 달라요",
      reporterNickname: "한서윤",
      createdAt: hoursAgo(now, 50),
      holdsReward: false,
    },
    {
      id: "report-4",
      targetType: "user",
      recruitmentName: "가계부 노트",
      recruitmentSlug: "ledger-note",
      reason: "채팅에서 부적절한 표현을 썼어요",
      reporterNickname: "최유나",
      targetNickname: "강민서",
      targetUserKey: "user-10",
      createdAt: hoursAgo(now, 6),
      holdsReward: false,
    },
    {
      id: "report-5",
      targetType: "feedback",
      recruitmentName: "레시피핏",
      recruitmentSlug: "recipefit",
      reason: "버그 설명이 실제와 달라요",
      reporterNickname: "박도현",
      targetNickname: "이지우",
      targetUserKey: "user-5",
      feedback: "재료를 세 개 넣으면 추천 결과가 비어 있어요. 두 개일 때는 잘 나와요.",
      createdAt: hoursAgo(now, 100),
      holdsReward: true,
      review: { decision: "dismissed", memo: "재현해 보니 실제 버그였어요.", processedAt: hoursAgo(now, 20) },
    },
    {
      id: "report-6",
      targetType: "feedback",
      recruitmentName: "스터디 매칭",
      recruitmentSlug: "study-match",
      reason: "다른 모집 건의 피드백을 그대로 붙여 넣었어요",
      reporterNickname: "정하린",
      targetNickname: "서준호",
      targetUserKey: "user-4",
      feedback: "가계부 입력이 편하고 월별 통계가 보기 좋아요.",
      createdAt: hoursAgo(now, 120),
      holdsReward: true,
      review: { decision: "upheld", memo: "다른 서비스에 대한 내용이에요.", processedAt: hoursAgo(now, 50) },
    },
  ];
}

/** 신고 키 목록. 없는 신고인지 쿠키를 읽기 전에 알 수 있게 목업에서 키만 뽑아 둔다 */
export const REPORT_KEYS = buildReports(new Date(0)).map((report) => report.id);

/*
 * 시연용 처리 기록. 실제 저장소가 없어서 쿠키에 { 요청 키: 처리 기록 }을 JSON으로 둔다.
 * 신고는 demo-reports, 출금은 demo-admin-withdrawals다. 출금 쪽은 테스터 신청 기록(demo-withdrawals-<role>)과 이름이 겹치지 않게 했다.
 * 같은 브라우저 안에서만 유지되고, 쿠키를 지우면 처음 상태로 돌아간다. 실제 API를 붙이면 이 파일을 지운다.
 */

export const DEMO_REPORTS_COOKIE = "demo-reports";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/* 브라우저는 이름+값이 4096바이트를 넘는 쿠키를 알리지 않고 버린다. 속성 몫을 남겨 둔다 */
const COOKIE_MAX_BYTES = 4000;

type Validator<T> = (value: unknown) => value is T;

function isReview(value: unknown): value is ReportReview {
  if (typeof value !== "object" || value === null) return false;
  const review = value as Record<string, unknown>;
  return isReportDecision(review.decision) && typeof review.memo === "string" && typeof review.processedAt === "string";
}

/** 깨진 값은 버리고 올바른 기록만 돌려준다 */
async function readStore<T>(name: string, isValid: Validator<T>): Promise<Record<string, T>> {
  const raw = (await cookies()).get(name)?.value;
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([, record]) => isValid(record)));
  } catch {
    return {};
  }
}

/**
 * Server Action에서만 부른다. 쿠키는 렌더링 중에 쓸 수 없다.
 * Next는 쿠키 값을 encodeURIComponent로 인코딩하므로 인코딩한 길이로 한도를 확인하고, 넘으면 저장하지 않고 false를 돌려준다.
 */
async function saveToStore<T>(name: string, isValid: Validator<T>, key: string, record: T): Promise<boolean> {
  const records = await readStore(name, isValid);
  const value = JSON.stringify({ ...records, [key]: record });
  if (name.length + 1 + encodeURIComponent(value).length > COOKIE_MAX_BYTES) return false;
  (await cookies()).set(name, value, {
    path: "/",
    maxAge: MAX_AGE_SECONDS,
    sameSite: "lax",
  });
  return true;
}

export const readReviews = () => readStore(DEMO_REPORTS_COOKIE, isReview);

export const saveReview = (reportKey: string, review: ReportReview) =>
  saveToStore(DEMO_REPORTS_COOKIE, isReview, reportKey, review);
