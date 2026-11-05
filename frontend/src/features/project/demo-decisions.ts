import "server-only";
import { cookies } from "next/headers";
import type { ApplicationStatus } from "./types";

/*
 * 시연용 지원자 확정·거절 기록과 모집 취소 요청. 실제 저장소가 없어서 쿠키에 JSON으로 둔다.
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

/* ---------- 모집 취소 요청 ---------- */

/*
 * 개발자가 보낸 취소 요청. 운영자 화면과는 아직 잇지 않는다.
 * 쿠키 demo-cancel-request-{모집 건 키}에 모집 건마다 따로 둔다. 한글 300자 사유가 인코딩하면 2,700바이트라 한 쿠키에 모으면 금방 한도를 넘는다.
 */
const CANCEL_COOKIE_PREFIX = "demo-cancel-request-";

export type StoredCancelRequest = { reason: string; requestedAt: string };

const isStoredCancel = (value: unknown): value is StoredCancelRequest =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as StoredCancelRequest).reason === "string" &&
  typeof (value as StoredCancelRequest).requestedAt === "string" &&
  !Number.isNaN(Date.parse((value as StoredCancelRequest).requestedAt));

function parseCancelRequest(raw: string): StoredCancelRequest[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    return isStoredCancel(parsed) ? [parsed] : [];
  } catch {
    return [];
  }
}

/** 보낸 취소 요청. 깨진 값은 버린다 */
export async function readCancelRequests(): Promise<Record<string, StoredCancelRequest>> {
  const stored = (await cookies()).getAll().filter(({ name }) => name.startsWith(CANCEL_COOKIE_PREFIX));
  return Object.fromEntries(
    stored.flatMap(({ name, value }) =>
      parseCancelRequest(value).map((request) => [name.slice(CANCEL_COOKIE_PREFIX.length), request]),
    ),
  );
}

/** 취소 요청을 저장한다. Server Action에서만 부른다. 쿠키 한도를 넘으면 false */
export async function saveCancelRequest(recruitmentKey: string, request: StoredCancelRequest): Promise<boolean> {
  const name = `${CANCEL_COOKIE_PREFIX}${recruitmentKey}`;
  const value = JSON.stringify(request);
  if (name.length + 1 + encodeURIComponent(value).length > COOKIE_MAX_BYTES) return false;
  (await cookies()).set(name, value, { path: "/", maxAge: MAX_AGE_SECONDS, sameSite: "lax" });
  return true;
}
