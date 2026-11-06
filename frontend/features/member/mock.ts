import "server-only";
import type { Role } from "@/lib/session";
import type { Profile } from "./types";

/*
 * 시연 회원 데이터. 실제 사용자와 관계없고, 이메일은 예시용 도메인(example.com)만 쓴다.
 * member/api.ts에서만 import한다.
 */

export const DEMO_PROFILES: Record<Exclude<Role, "guest">, Profile> = {
  tester: { name: "한서윤", nickname: "윤슬", email: "seoyun@example.com" },
  developer: { name: "박도현", nickname: "도현랩", email: "dohyun@example.com" },
  admin: { name: "운영자", nickname: "운영자", email: "admin@example.com" },
};

/** 시연 회원 모두 같은 비밀번호를 쓴다. 실제 비밀번호와 관계없다 */
export const DEMO_PASSWORD = "test1234";
