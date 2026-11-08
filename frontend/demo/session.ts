import type { Role, SessionUser } from "@/features/session/session";
import "server-only";

/** 시연 회원의 세션 표시용 샘플. 실제 API 연결 뒤 제거한다. */
export const DEMO_USERS: Record<Exclude<Role, "guest">, SessionUser> = {
  tester: { nickname: "한서윤", credits: 12480 },
  developer: { nickname: "박도현", credits: 3260 },
  admin: { nickname: "운영자", credits: 0 },
};
