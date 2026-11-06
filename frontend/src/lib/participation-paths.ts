/* 테스터 참여 목록·상세의 이동 주소. 서버와 클라이언트가 같은 규칙을 쓴다. */

export const PARTICIPATIONS_PATH = "/testers/recruitments";

export function participationsPath(tab?: string) {
  return tab === undefined ? PARTICIPATIONS_PATH : `${PARTICIPATIONS_PATH}?tab=${encodeURIComponent(tab)}`;
}

export function participationPath(participationKey: string) {
  return `${PARTICIPATIONS_PATH}/${encodeURIComponent(participationKey)}`;
}
