"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { isPopupReturnPath, popupFeatures, POPUP_NAME, type PgProvider, type TossWindow } from "@/features/subscription/pg";

/** 결제 팝업이 돌아와서 원래 창에 보내는 메시지 */
export const POPUP_RETURN = "moa-pay-return";
/** 창 연결(opener)이 없을 때 같은 사이트의 다른 창으로 알리는 통로 이름 */
export const POPUP_CHANNEL = "moa-pay";
/** 토스 팝업 화면이 원래 창에 결제창 값을 달라고 하는 메시지와, 원래 창의 대답 */
export const POPUP_TOSS_REQUEST = "moa-toss-request";
export const POPUP_TOSS_WINDOW = "moa-toss-window";
/** 팝업 안에서 토스 결제창을 여는 화면 */
const TOSS_POPUP_PATH = "/my/subscription/checkout/toss";

/*
 * 결제 팝업을 연다(#252). 클릭 순간에 빈 팝업을 먼저 열어 두고(서버 응답을 기다린 뒤에 열면 브라우저가 막는다),
 * 결제 준비가 끝나면 navigate로 결제창 주소를 보낸다. 팝업이 결제창을 거쳐 우리 주소로 돌아오면 원래 창이 그 주소로 이동하고,
 * 돌아오지 않고 닫히면 onClosed를 부른다. 열려 있는 동안에는 opened가 true다.
 * 이 창이 연 팝업이 아니면(같은 결제 화면을 연 다른 탭) 돌아온 결과를 받지 않는다
 */
export function usePaymentPopup(onClosed: () => void) {
  const popupRef = useRef<Window | null>(null);
  const returned = useRef(false);
  const pendingToss = useRef<TossWindow | null>(null);
  const [opened, setOpened] = useState(false);
  const closedCallback = useRef(onClosed);
  useEffect(() => {
    closedCallback.current = onClosed;
  });

  useEffect(() => {
    if (!opened) return;
    /* 결과를 알리고 스스로 닫은 팝업의 메시지가 닫힘 확인보다 늦게 도착할 수 있어서, 닫힌 것을 두 번 연속 봐야 닫힌 것으로 본다 */
    let closedSeen = false;
    const timer = setInterval(() => {
      const popup = popupRef.current;
      if (popup && !popup.closed) {
        closedSeen = false;
        return;
      }
      if (!closedSeen) {
        closedSeen = true;
        return;
      }
      clearInterval(timer);
      popupRef.current = null;
      setOpened(false);
      /* 결과를 알리고 스스로 닫은 팝업이나 우리가 닫은 팝업은 취소가 아니다 */
      if (!returned.current) closedCallback.current();
    }, 500);
    return () => clearInterval(timer);
  }, [opened]);

  useEffect(() => {
    function goTo(href: unknown) {
      /* 이 창이 연 팝업이 없으면 다른 탭의 결제 결과다 */
      if (!popupRef.current || !isPopupReturnPath(href)) return;
      returned.current = true;
      window.location.assign(href);
    }
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === POPUP_RETURN) goTo(event.data.href);
      /* 토스 팝업 화면은 이 창이 연 팝업일 때만, 한 번만 결제창 값을 받는다 */
      if (event.data?.type === POPUP_TOSS_REQUEST && event.source === popupRef.current && pendingToss.current) {
        (event.source as Window).postMessage({ type: POPUP_TOSS_WINDOW, window: pendingToss.current }, window.location.origin);
        pendingToss.current = null;
      }
    }
    window.addEventListener("message", onMessage);
    const channel = new BroadcastChannel(POPUP_CHANNEL);
    channel.onmessage = (event) => {
      if (event.data?.type === POPUP_RETURN) goTo(event.data.href);
    };
    return () => {
      window.removeEventListener("message", onMessage);
      channel.close();
    };
  }, []);

  return useMemo(
    () => ({
      opened,
      /** 클릭 이벤트 안에서 불러야 한다. 브라우저가 막으면 false */
      open(provider: PgProvider): boolean {
        const popup = window.open("", POPUP_NAME, popupFeatures(provider, window));
        if (!popup) return false;
        try {
          popup.document.body.textContent = "결제창을 준비하고 있어요…";
        } catch {
          /* 이미 다른 주소가 열려 있던 팝업이면 건드리지 않는다 */
        }
        popupRef.current = popup;
        returned.current = false;
        pendingToss.current = null;
        setOpened(true);
        return true;
      },
      /** 팝업이 이미 닫혔으면 아무것도 하지 않는다 */
      navigate(url: string) {
        if (popupRef.current && !popupRef.current.closed) popupRef.current.location.href = url;
      },
      /** 토스 결제창 값은 주소에 싣지 않고, 팝업 화면이 달라고 할 때 이 창이 직접 준다 */
      provideToss(window: TossWindow) {
        if (!popupRef.current || popupRef.current.closed) return;
        pendingToss.current = window;
        popupRef.current.location.href = TOSS_POPUP_PATH;
      },
      focus() {
        popupRef.current?.focus();
      },
      /** 우리가 닫는 것은 취소가 아니라서 취소 안내를 부르지 않는다 */
      close() {
        returned.current = true;
        popupRef.current?.close();
      },
    }),
    [opened],
  );
}
