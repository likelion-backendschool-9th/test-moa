import "server-only";
import { ANNOUNCEMENTS } from "./mock";
import type { Announcement } from "./types";

/** 홈 배너에 보일 운영 소식. 실제 API를 붙일 때 이 함수만 바꾼다 */
export async function getAnnouncements(): Promise<Announcement[]> {
  return ANNOUNCEMENTS;
}
