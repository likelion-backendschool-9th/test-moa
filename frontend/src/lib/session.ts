import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { backendFetch, isBackendAuth } from "./backend";
import { getDemoSubscriptionCreditSpent } from "./demo-subscription";

/*
 * 세션. 화면들은 role(guest·tester·developer·admin)로 그리므로 모양은 그대로 둔다.
 * - 목업(기본): 쿠키 demo-role 값으로 상태를 고르고, 값이 없거나 모르는 값이면 tester로 본다.
 * - AUTH_MODE=backend: 백엔드 /api/users/me로 실제 회원을 읽고 역할로 바꾼다.
 *   운영자는 admin, 구독 중이면 developer(구독 개발자 화면), 아니면 tester다.
 */

export const DEMO_ROLE_COOKIE = "demo-role";

export const ROLES = ["guest", "tester", "developer", "admin"] as const;
export type Role = (typeof ROLES)[number];

export type SessionUser = {
  nickname: string;
  credits: number;
};

export type Session =
  | { role: "guest"; user: null }
  | { role: Exclude<Role, "guest">; user: SessionUser };

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
  subscription: { active: boolean } | null;
};

/** 토큰이 없거나 만료·정지됐거나 백엔드에 닿지 못하면 비로그인으로 본다 */
async function getBackendSession(): Promise<Session> {
  const me = await backendFetch<Me>("/api/users/me");
  if (!me.ok) return { role: "guest", user: null };
  const { nickname, role, subscription } = me.data;
  /* ponytail: 크레딧 API가 아직 없어 0으로 둔다. 크레딧 담당 API가 생기면 그 값을 읽는다 */
  const user = { nickname, credits: 0 };
  if (role === "ADMIN") return { role: "admin", user };
  return { role: subscription?.active ? "developer" : "tester", user };
}

export const getSession = cache(async (): Promise<Session> => {
  if (isBackendAuth) return getBackendSession();
  const role = parseRole((await cookies()).get(DEMO_ROLE_COOKIE)?.value);
  if (role === "guest") return { role, user: null };
  /* 시연용 구독 결제를 크레딧으로 냈으면 헤더 잔액에서도 뺀다 */
  const user = DEMO_USERS[role];
  return { role, user: { ...user, credits: user.credits - (await getDemoSubscriptionCreditSpent(role)) } };
});
