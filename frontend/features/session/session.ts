import { DEMO_ROLE_COOKIE } from "@/demo/mode";
import { getDemoSubscriptionCreditSpent } from "@/demo/subscription";
import { backendFetch, isBackendAuth } from "@/lib/backend";
import { cookies } from "next/headers";
import { cache } from "react";
import "server-only";

/*
 * 세션. 화면들은 role(guest·tester·developer·admin)로 그리므로 모양은 그대로 둔다.
 * - 목업(기본): 쿠키 demo-role 값으로 상태를 고르고, 값이 없거나 모르는 값이면 tester로 본다.
 * - AUTH_MODE=backend: 백엔드 /api/users/me로 로그인 여부와 운영자 권한만 정한다.
 *   개발자·테스터는 같은 회원이 쓰는 화면 맥락이라 구독 여부로 정하지 않는다. 화면들이 아직 목업 데이터라
 *   일반 회원의 tester·developer는 demo-role 쿠키(시연 전환기)로 고르고, 값이 없으면 tester다.
 *   유료 기능의 권한(구독)은 백엔드가 그 기능 API에서 따로 확인한다.
 */

export { DEMO_ROLE_COOKIE } from "@/demo/mode";

export const ROLES = ["guest", "tester", "developer", "admin"] as const;
export type Role = (typeof ROLES)[number];

export type SessionUser = {
  nickname: string;
  credits: number;
};

export type Session =
  | { role: "guest"; user: null; }
  | { role: Exclude<Role, "guest">; user: SessionUser; };

const DEMO_USERS: Record<Exclude<Role, "guest">, SessionUser> = {
  tester: { nickname: "한서윤", credits: 12480 },
  developer: { nickname: "박도현", credits: 3260 },
  admin: { nickname: "운영자", credits: 0 },
};

function parseRole(value: string | undefined): Role {
  return ROLES.find((role) => role === value) ?? "tester";
}

/** 백엔드 GET /api/users/me 응답에서 세션에 쓰는 값 */
type Me = {
  nickname: string;
  role: "USER" | "ADMIN";
};

/** 토큰이 없거나 만료·정지됐거나 백엔드에 닿지 못하면 비로그인으로 본다 */
async function getBackendSession(): Promise<Session> {
  const me = await backendFetch<Me>("/api/users/me");
  if (!me.ok) return { role: "guest", user: null };
  const { nickname, role } = me.data;
  /* ponytail: 크레딧 API가 아직 없어 0으로 둔다. 크레딧 담당 API가 생기면 그 값을 읽는다 */
  const user = { nickname, credits: 0 };
  if (role === "ADMIN") return { role: "admin", user };
  const persona = (await cookies()).get(DEMO_ROLE_COOKIE)?.value;
  return { role: persona === "developer" ? "developer" : "tester", user };
}

export const getSession = cache(async (): Promise<Session> => {
  if (isBackendAuth) return getBackendSession();
  const role = parseRole((await cookies()).get(DEMO_ROLE_COOKIE)?.value);
  if (role === "guest") return { role, user: null };
  /* 시연용 구독 결제를 크레딧으로 냈으면 헤더 잔액에서도 뺀다 */
  const user = DEMO_USERS[role];
  return { role, user: { ...user, credits: user.credits - (await getDemoSubscriptionCreditSpent(role)) } };
});
