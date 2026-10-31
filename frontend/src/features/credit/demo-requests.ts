import "server-only";
import { cookies } from "next/headers";
import type { Role } from "@/lib/session";
import type { Withdrawal } from "./types";

/*
 * 시연용 출금 신청 기록. 프로토타입에서 신청이 화면에 남도록 브라우저 쿠키에만 저장한다.
 * 쿠키라서 다른 브라우저·다른 시연 회원과 섞이지 않고, 병렬 E2E도 서로의 신청을 보지 않는다.
 * 실제 API를 붙이면 이 파일과 호출 두 곳(api.ts의 load, actions.ts의 requestWithdrawal)을 지운다.
 */

type MemberRole = Exclude<Role, "guest">;

const COOKIE_PREFIX = "demo-withdrawals-";
const MAX_REQUESTS = 10;
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

type StoredRequest = { id: string; amount: number; bank: string; last4: string; requestedAt: string };

const cookieName = (role: MemberRole) => `${COOKIE_PREFIX}${role}`;

function isStoredRequest(value: unknown): value is StoredRequest {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.amount === "number" &&
    typeof item.bank === "string" &&
    typeof item.last4 === "string" &&
    typeof item.requestedAt === "string"
  );
}

/** 쿠키 값이 깨졌거나 모양이 다르면 기록이 없는 것으로 본다 */
async function readStored(role: MemberRole): Promise<StoredRequest[]> {
  const raw = (await cookies()).get(cookieName(role))?.value;
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isStoredRequest) : [];
  } catch {
    return [];
  }
}

/** 이 브라우저에서 신청한 출금, 최신순. 운영자 처리가 없어 모두 처리 중이다 */
export async function getDemoWithdrawals(role: MemberRole): Promise<Withdrawal[]> {
  return (await readStored(role)).map(({ last4, ...item }) => ({
    ...item,
    status: "requested",
    accountMasked: `****${last4}`,
  }));
}

/** 신청을 맨 앞에 더한다. 계좌번호는 끝 4자리만 남기고, 오래된 기록부터 지워 최대 10건을 둔다 */
export async function addDemoWithdrawal(role: MemberRole, request: { amount: number; bank: string; account: string }) {
  const now = new Date();
  const next: StoredRequest = {
    id: `demo-${now.getTime()}`,
    amount: request.amount,
    bank: request.bank,
    last4: request.account.slice(-4),
    requestedAt: now.toISOString(),
  };
  const stored = [next, ...(await readStored(role))].slice(0, MAX_REQUESTS);
  (await cookies()).set(cookieName(role), JSON.stringify(stored), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: MAX_AGE_SECONDS,
  });
}
