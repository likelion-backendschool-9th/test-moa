"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { isPopupReturnPath, popupFeatures, POPUP_NAME, type PgProvider } from "@/features/subscription/pg";

/** 결제 팝업이 돌아와서 원래 창에 보내는 메시지 */
export const POPUP_RETURN = "moa-pay-return";
/** 창 연결(opener)이 없을 때 같은 사이트의 다른 창으로 알리는 통로 이름 */
export const POPUP_CHANNEL = "moa-pay";

/*
 * 결제 팝업을 연다(#252). 클릭 순간에 빈 팝업을 먼저 열어 두고(서버 응답을 기다린 뒤에 열면 브라우저가 막는다),
 * 결제 준비가 끝나면 navigate로 결제창 주소를 보낸다. 팝업이 결제창을 거쳐 우리 주소로 돌아오면 원래 창이 그 주소로 이동하고,
 * 돌아오지 않고 닫히면 onClosed를 부른다. 열려 있는 동안에는 opened가 true다
 */
export function usePaymentPopup(onClosed: () => void) {
  const popupRef = useRef<Window | null>(null);
  const returned = useRef(false);
  const [opened, setOpened] = useState(false);
  const closedCallback = useRef(onClosed);
  useEffect(() => {
    closedCallback.current = onClosed;
  });

  useEffect(() => {
    if (!opened) return;
    const timer = setInterval(() => {
      const popup = popupRef.current;
      if (popup && !popup.closed) return;
      clearInterval(timer);
      popupRef.current = null;
      setOpened(false);
      /* 결과를 알리고 스스로 닫은 팝업은 취소가 아니다 */
      if (!returned.current) closedCallback.current();
    }, 500);
    return () => clearInterval(timer);
  }, [opened]);

  useEffect(() => {
    function goTo(href: unknown) {
      if (!isPopupReturnPath(href)) return;
      returned.current = true;
      window.location.assign(href);
    }
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin || event.data?.type !== POPUP_RETURN) return;
      goTo(event.data.href);
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
        setOpened(true);
        return true;
      },
      navigate(url: string) {
        if (popupRef.current && !popupRef.current.closed) popupRef.current.location.href = url;
      },
      focus() {
        popupRef.current?.focus();
      },
      close() {
        popupRef.current?.close();
      },
    }),
    [opened],
  );
}
