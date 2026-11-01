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
