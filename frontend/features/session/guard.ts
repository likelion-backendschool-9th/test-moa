import "server-only";
import { redirect } from "next/navigation";
import { getSession, type Session } from "./session";

/** 로그인한 회원만 통과시킨다. 비로그인이면 돌아올 경로를 붙여 로그인으로 보낸다 */
export async function requireMember(next: string): Promise<Exclude<Session, { role: "guest" }>> {
  const session = await getSession();
  if (session.role === "guest") redirect(`/login?next=${encodeURIComponent(next)}`);
  return session;
}
