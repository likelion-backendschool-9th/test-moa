"use client";

/*
 * 이 화면이 보이는 동안만 사이트 푸터를 숨기고, 본문(main)이 화면 아래까지 채우게 한다. 채팅방이 쓴다(채팅함에는 푸터가 있다).
 * cacheComponents에서는 다른 페이지로 가도 이전 화면이 숨겨진 채(Activity) 문서에 남는다. 그래서 표시를 찾는 CSS(:has)는
 * 숨겨진 채팅 화면까지 잡아 홈의 푸터도 숨겼다. 대신 화면이 가진 <style>을 숨겨질 때 끄고(media="not all") 다시 보일 때 켠다.
 * <style>이 서버 렌더링 결과에 들어 있어서, 처음 열 때 푸터가 보였다 사라지지 않는다.
 * 참고: node_modules/next/dist/docs/01-app/02-guides/preserving-ui-state.md "Global styles"
 */
const CSS = "[data-site-footer]{display:none}#main{display:flex;flex-direction:column}";

function enableWhileVisible(style: HTMLStyleElement | null) {
  if (!style) return;
  style.media = "all";
  return () => {
    style.media = "not all";
  };
}

export function HideFooter() {
  return <style ref={enableWhileVisible}>{CSS}</style>;
}
