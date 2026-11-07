/*
 * 로그인·가입 뒤 돌아갈 경로(next) 검사. 페이지와 서버 액션이 같은 함수를 쓴다.
 * 같은 사이트 안의 경로만 통과시키고, 바깥 주소로 해석될 수 있는 값은 모두 홈으로 바꾼다.
 */

const HOME = "/";
/** 출처 비교에만 쓰는 고정 기준. 실제 배포 주소와 관계없다 */
const BASE = "http://localhost";
/** 역슬래시와 제어문자(U+0000~U+001F, U+007F). URL 파서가 슬래시로 바꾸거나 지워서 바깥 주소가 될 수 있다 */
const UNSAFE_CHARS = /[\\\u0000-\u001f\u007f]/;

/** ①~④: /로 시작, //로 시작하지 않음, 위험한 글자 없음, 해석한 출처가 기준과 같음 */
function isSameOriginPath(value: string): URL | null {
  if (!value.startsWith("/") || value.startsWith("//") || UNSAFE_CHARS.test(value)) return null;
  try {
    const url = new URL(value, BASE);
    return url.origin === BASE ? url : null;
  } catch {
    return null;
  }
}

/** 돌아갈 경로. 안전하면 정규화한 경로+쿼리, 아니면 "/" */
export function safeNextPath(value: unknown): string {
  if (typeof value !== "string") return HOME;
  const url = isSameOriginPath(value);
  if (!url) return HOME;
  /* ⑤ /a/..//evil.com처럼 정규화하면 //로 시작하는 값이 생기므로 결과도 다시 검사한다 */
  const path = url.pathname + url.search;
  return isSameOriginPath(path) ? path : HOME;
}
