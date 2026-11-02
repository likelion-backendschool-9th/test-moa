import "server-only";
import { cookies } from "next/headers";

/*
 * 시연용 피드백 제출 기록. 실제 저장소가 없어서 참여마다 쿠키 demo-feedback-<참여 키>에 남긴다.
 * 값은 "제출 시각(ms).내용(base64url)"이다. base64url은 쿠키 인코딩에서 길이가 늘지 않아 한글 한 글자가 4바이트다.
 * 같은 브라우저 안에서만 유지되고, 병렬 E2E도 서로의 제출을 보지 않는다. 실제 API를 붙이면 이 파일을 지운다.
 */

const COOKIE_PREFIX = "demo-feedback-";
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
/* 브라우저는 이름+값이 4096바이트를 넘는 쿠키를 알리지 않고 버린다. 속성 몫을 남겨 둔다 */
const COOKIE_MAX_BYTES = 4000;

export type DemoFeedback = { content: string; submittedAt: string };

function decode(value: string): DemoFeedback | null {
  const [millis, encoded] = value.split(".");
  const time = Number(millis);
  if (!encoded || !Number.isFinite(time)) return null;
  const content = Buffer.from(encoded, "base64url").toString("utf8");
  return content ? { content, submittedAt: new Date(time).toISOString() } : null;
}

/** 이 브라우저에서 제출한 피드백, { 참여 키: 기록 }. 깨진 값은 버린다 */
export async function readDemoFeedback(): Promise<Record<string, DemoFeedback>> {
  const entries = (await cookies())
    .getAll()
    .filter((cookie) => cookie.name.startsWith(COOKIE_PREFIX))
    .map((cookie) => [cookie.name.slice(COOKIE_PREFIX.length), decode(cookie.value)] as const)
    .filter((entry): entry is readonly [string, DemoFeedback] => entry[1] !== null);
  return Object.fromEntries(entries);
}

/** Server Action에서만 부른다. 쿠키 한도를 넘으면 저장하지 않고 false를 돌려준다 */
export async function saveDemoFeedback(participationKey: string, content: string): Promise<boolean> {
  const name = `${COOKIE_PREFIX}${participationKey}`;
  const value = `${Date.now()}.${Buffer.from(content, "utf8").toString("base64url")}`;
  if (name.length + 1 + value.length > COOKIE_MAX_BYTES) return false;
  (await cookies()).set(name, value, { path: "/", httpOnly: true, sameSite: "lax", maxAge: MAX_AGE_SECONDS });
  return true;
}
