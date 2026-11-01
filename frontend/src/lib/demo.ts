import "server-only";
import { cookies } from "next/headers";

/*
 * 시연용 데이터 상황 전환. 쿠키 demo-data 값에 따라 목업 응답을 바꾼다.
 * normal: 기본, single: 구독 모집 1개, empty: 모집 글 없음, slow: 1.5초 지연
 */

export const DEMO_DATA_COOKIE = "demo-data";

export const DEMO_DATA_MODES = ["normal", "single", "empty", "slow"] as const;
export type DemoDataMode = (typeof DEMO_DATA_MODES)[number];

export async function getDemoDataMode(): Promise<DemoDataMode> {
  const value = (await cookies()).get(DEMO_DATA_COOKIE)?.value;
  return DEMO_DATA_MODES.find((mode) => mode === value) ?? "normal";
}

const SLOW_DELAY_MS = 1500;

/** demo-data=slow이면 응답을 1.5초 늦춘다 */
export async function waitIfSlow() {
  if ((await getDemoDataMode()) === "slow") await new Promise((resolve) => setTimeout(resolve, SLOW_DELAY_MS));
}
