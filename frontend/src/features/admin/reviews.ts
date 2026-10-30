import "server-only";
import { cookies } from "next/headers";
import { isReportDecision, type ReportReview } from "./types";

/*
 * 시연용 처리 기록. 실제 저장소가 없어서 쿠키에 { 요청 키: 처리 기록 }을 JSON으로 둔다.
 * 신고는 demo-reports다. 읽기·쓰기와 크기 확인은 요청 종류와 관계없이 같아서 함께 쓴다.
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
