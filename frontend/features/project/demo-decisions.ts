import "server-only";
import { cookies } from "next/headers";
import type { ApplicationStatus, RecruitmentCancellation } from "./types";

/*
 * 시연용 지원자 확정·거절 기록과 모집 취소. 실제 저장소가 없어서 쿠키에 JSON으로 둔다.
 * 확정·거절은 쿠키 demo-applications에 { 지원 id: 상태 }로 둔다.
 * 확정 결과가 요약·분석·내 프로젝트 화면에 함께 반영되게 하려고 둔다.
 * 같은 브라우저 안에서만 유지되고, 쿠키를 지우면 처음 상태로 돌아간다. 실제 API를 붙이면 이 파일을 지운다.
 */

const COOKIE_NAME = "demo-applications";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
/* 브라우저는 이름+값이 4096바이트를 넘는 쿠키를 알리지 않고 버린다. 속성 몫을 남겨 둔다 */
const COOKIE_MAX_BYTES = 4000;

export type Decision = Extract<ApplicationStatus, "confirmed" | "rejected">;
type StoredDecisions = Record<string, Decision>;

const isDecision = (value: unknown): value is Decision => value === "confirmed" || value === "rejected";

/** 깨진 값은 버리고 올바른 기록만 돌려준다 */
export async function readDecisions(): Promise<StoredDecisions> {
  const raw = (await cookies()).get(COOKIE_NAME)?.value;
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([, status]) => isDecision(status)));
  } catch {
    return {};
  }
}

/**
 * Server Action에서만 부른다. 쿠키는 렌더링 중에 쓸 수 없다.
 * 쿠키 한도를 넘으면 저장하지 않고 false를 돌려준다.
 */
export async function saveDecisions(ids: string[], status: Decision): Promise<boolean> {
  const value = JSON.stringify({ ...(await readDecisions()), ...Object.fromEntries(ids.map((id) => [id, status])) });
  if (COOKIE_NAME.length + 1 + encodeURIComponent(value).length > COOKIE_MAX_BYTES) return false;
  (await cookies()).set(COOKIE_NAME, value, { path: "/", maxAge: MAX_AGE_SECONDS, sameSite: "lax" });
  return true;
}

/* ---------- 모집 취소 ---------- */

/*
 * 개발자가 직접 취소한 기록.
 * 쿠키 demo-recruitment-cancel-{모집 건 키}에 모집 건마다 따로 둔다. 한글 300자 사유가 인코딩하면 2,700바이트라 한 쿠키에 모으면 금방 한도를 넘는다.
 */
const CANCEL_COOKIE_PREFIX = "demo-recruitment-cancel-";

const isStoredCancellation = (value: unknown): value is RecruitmentCancellation =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as RecruitmentCancellation).reason === "string" &&
  typeof (value as RecruitmentCancellation).cancelledAt === "string" &&
  !Number.isNaN(Date.parse((value as RecruitmentCancellation).cancelledAt));

function parseCancellation(raw: string): RecruitmentCancellation[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    return isStoredCancellation(parsed) ? [parsed] : [];
  } catch {
    return [];
  }
}

/** 취소한 모집 건. 깨진 값은 버린다 */
export async function readCancellations(): Promise<Record<string, RecruitmentCancellation>> {
  const stored = (await cookies()).getAll().filter(({ name }) => name.startsWith(CANCEL_COOKIE_PREFIX));
  return Object.fromEntries(
    stored.flatMap(({ name, value }) =>
      parseCancellation(value).map((cancellation) => [name.slice(CANCEL_COOKIE_PREFIX.length), cancellation]),
    ),
  );
}

/** 모집 취소를 저장한다. Server Action에서만 부른다. 쿠키 한도를 넘으면 false */
export async function saveCancellation(recruitmentKey: string, cancellation: RecruitmentCancellation): Promise<boolean> {
  const name = `${CANCEL_COOKIE_PREFIX}${recruitmentKey}`;
  const value = JSON.stringify(cancellation);
  if (name.length + 1 + encodeURIComponent(value).length > COOKIE_MAX_BYTES) return false;
  (await cookies()).set(name, value, { path: "/", maxAge: MAX_AGE_SECONDS, sameSite: "lax" });
  return true;
}
