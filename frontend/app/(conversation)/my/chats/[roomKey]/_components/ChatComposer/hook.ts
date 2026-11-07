import { useSyncExternalStore } from "react";

/* 터치가 주 입력인 기기(휴대폰·태블릿). 화상 키보드에는 Shift+Enter가 없어서 Enter를 줄바꿈으로 둔다 */
const TOUCH_QUERY = "(pointer: coarse)";

function subscribeTouch(onChange: () => void) {
  const query = window.matchMedia(TOUCH_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** 터치 기기면 true. 서버 렌더링과 처음 그릴 때는 키보드 기기로 본다 */
export function useTouchInput() {
  return useSyncExternalStore(
    subscribeTouch,
    () => window.matchMedia(TOUCH_QUERY).matches,
    () => false,
  );
}
