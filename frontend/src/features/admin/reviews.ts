import "server-only";
import { cookies } from "next/headers";
import { isReportDecision, type ReportReview } from "./types";

/*
 * 시연용 신고 처리 기록. 실제 저장소가 없어서 쿠키 demo-reports에 { 신고 키: 처리 기록 }을 JSON으로 둔다.
 * 같은 브라우저 안에서만 유지되고, 쿠키를 지우면 처음 상태로 돌아간다. 실제 API를 붙이면 이 파일을 지운다.
 */

export const DEMO_REPORTS_COOKIE = "demo-reports";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

type StoredReviews = Record<string, ReportReview>;

function isReview(value: unknown): value is ReportReview {
  if (typeof value !== "object" || value === null) return false;
  const review = value as Record<string, unknown>;
  return isReportDecision(review.decision) && typeof review.memo === "string" && typeof review.processedAt === "string";
}

/** 깨진 값은 버리고 올바른 기록만 돌려준다 */
export async function readReviews(): Promise<StoredReviews> {
  const raw = (await cookies()).get(DEMO_REPORTS_COOKIE)?.value;
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([, review]) => isReview(review)));
  } catch {
    return {};
  }
}

/** Server Action에서만 부른다. 쿠키는 렌더링 중에 쓸 수 없다 */
export async function saveReview(reportKey: string, review: ReportReview) {
  const reviews = await readReviews();
  (await cookies()).set(DEMO_REPORTS_COOKIE, JSON.stringify({ ...reviews, [reportKey]: review }), {
    path: "/",
    maxAge: MAX_AGE_SECONDS,
    sameSite: "lax",
  });
}
