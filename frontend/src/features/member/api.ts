import "server-only";
import type { Role } from "@/lib/session";
import { DEMO_PASSWORD, DEMO_PROFILES } from "./mock";
import type { Profile } from "./types";

/*
 * 회원 데이터 조회. 로그인·회원가입·개인정보 수정이 모두 이 파일로 회원 정보를 본다.
 * 지금은 시연 회원 목업을 돌려준다. 실제 API를 붙일 때는 함수 본문만 바꾸고 시그니처는 유지한다.
 */

type MemberRole = Exclude<Role, "guest">;

/** 역할에 해당하는 시연 회원의 기본 정보 */
export function getMemberProfile(role: MemberRole): Profile {
  return DEMO_PROFILES[role];
}

/** 다른 회원이 쓰고 있는 닉네임인지. own을 넘기면 자기 닉네임은 쓸 수 있다 */
export function isNicknameTaken(nickname: string, own?: string): boolean {
  return nickname !== own && Object.values(DEMO_PROFILES).some((profile) => profile.nickname === nickname);
}

/** 현재 비밀번호가 맞는지. 목업이라 시연 회원 모두 같은 값과 비교한다 */
export function isCurrentPassword(password: string): boolean {
  return password === DEMO_PASSWORD;
}

/** 이메일·비밀번호가 맞는 시연 회원의 역할. 이메일은 대소문자를 가리지 않는다. 맞지 않으면 null */
export function findRoleByCredentials(email: string, password: string): MemberRole | null {
  const normalized = email.trim().toLowerCase();
  const entry = (Object.entries(DEMO_PROFILES) as [MemberRole, Profile][]).find(([, profile]) => profile.email === normalized);
  return entry && password === DEMO_PASSWORD ? entry[0] : null;
}

export type DemoAccount = { role: MemberRole; email: string };

/** 로그인 화면에 안내할 시연 계정과 공통 비밀번호 */
export function getDemoAccounts(): { accounts: DemoAccount[]; password: string } {
  const accounts = (Object.entries(DEMO_PROFILES) as [MemberRole, Profile][]).map(([role, profile]) => ({ role, email: profile.email }));
  return { accounts, password: DEMO_PASSWORD };
}
