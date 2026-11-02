/*
 * 로그인·회원가입 화면에서 함께 쓰는 값.
 */

/** 소셜 로그인 제공자. 지금은 목업이라 누르면 테스터 시연 계정으로 로그인한다. 바꿀 때는 이 목록만 고친다 */
export const SOCIAL_PROVIDERS = [
  { id: "github", label: "깃허브로 계속하기" },
  { id: "google", label: "구글로 계속하기" },
] as const;

export type SocialProviderId = (typeof SOCIAL_PROVIDERS)[number]["id"];

export type LoginField = "email" | "password";
export type SignupField = "name" | "nickname" | "email" | "password" | "confirm" | "agreements";

/** 로그인·가입 화면 사이를 오갈 때 돌아갈 경로를 붙인다. next는 safeNextPath를 거친 값이다 */
export function withNext(path: string, next: string, params?: Record<string, string>): string {
  const search = new URLSearchParams(params);
  if (next !== "/") search.set("next", next);
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}
