import "server-only";
import { cookies } from "next/headers";
import { parseParticipationView, type ParticipationView } from "./types";

/* 고른 보기 방식은 브라우저별 화면 설정이라 쿠키에 둔다. 상세에 갔다 돌아오거나 탭을 바꿔도 유지된다 */

const COOKIE_NAME = "participation-view";
const MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

/** 쿠키가 없거나 알 수 없는 값이면 리스트다 */
export async function readParticipationView(): Promise<ParticipationView> {
  return parseParticipationView((await cookies()).get(COOKIE_NAME)?.value);
}

/** Server Action에서만 부른다 */
export async function saveParticipationView(view: ParticipationView) {
  (await cookies()).set(COOKIE_NAME, view, { path: "/", httpOnly: true, sameSite: "lax", maxAge: MAX_AGE_SECONDS });
}
