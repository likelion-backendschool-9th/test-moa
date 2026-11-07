import { getSession, type Session } from "@/features/session/session";
import { redirect } from "next/navigation";
import "server-only";

/** 로그인한 회원만 통과시킨다. 비로그인이면 돌아올 경로를 붙여 로그인으로 보낸다 */
export async function requireMember(next: string): Promise<Exclude<Session, { role: "guest" }>> {
  const session = await getSession();
  if (session.role === "guest") redirect(`/login?next=${encodeURIComponent(next)}`);
  return session;
}

/**
 * 운영자 페이지 입구에서 부른다. 비로그인이면 로그인으로 보내고(next에 path),
 * 운영자가 아니면 false를 돌려줘서 페이지가 권한 없음 화면을 보여 주게 한다.
 */
export async function requireAdmin(path: string): Promise<boolean> {
  const session = await getSession();
  if (session.role === "guest") redirect(`/login?next=${encodeURIComponent(path)}`);
  return session.role === "admin";
}

/** 데이터 함수와 Server Action 안의 검사. 화면에서 숨겨도 데이터는 따로 지켜야 한다 */
export async function assertAdmin() {
  if ((await getSession()).role !== "admin") throw new Error("운영자만 볼 수 있는 데이터예요");
}

/* ---------- 접근 ---------- */

/** 로그인한 회원의 역할. 비로그인이면 로그인 페이지로 보내고 돌아올 경로를 남긴다 */
export async function requireRole(path: string) {
  const session = await getSession();
  if (session.role === "guest") redirect(`/login?next=${encodeURIComponent(path)}`);
  return session.role;
}
