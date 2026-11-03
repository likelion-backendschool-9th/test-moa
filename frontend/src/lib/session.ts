import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { getDemoSubscriptionCreditSpent } from "./demo-subscription";

/*
 * 목업 세션. 실제 로그인을 붙일 때는 이 파일만 바꾼다.
 * 쿠키 demo-role 값으로 상태를 고르고, 값이 없거나 모르는 값이면 tester로 본다.
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

export const getSession = cache(async (): Promise<Session> => {
  const role = parseRole((await cookies()).get(DEMO_ROLE_COOKIE)?.value);
  if (role === "guest") return { role, user: null };
  /* 시연용 구독 결제를 크레딧으로 냈으면 헤더 잔액에서도 뺀다 */
  const user = DEMO_USERS[role];
  return { role, user: { ...user, credits: user.credits - (await getDemoSubscriptionCreditSpent(role)) } };
});
