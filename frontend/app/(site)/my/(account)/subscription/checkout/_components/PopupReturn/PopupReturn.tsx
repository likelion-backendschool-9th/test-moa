"use client";

import { useEffect, useRef } from "react";
import { isPopupName, isPopupReturnPath } from "@/features/subscription/pg";
import { POPUP_ACK, POPUP_CHANNEL, POPUP_RETURN } from "@/app/(site)/my/(account)/subscription/checkout/_components/CheckoutForm/usePaymentPopup";
import styles from "./PopupReturn.module.css";

/** 연결이 끊긴 팝업이 원래 창의 대답을 기다리는 시간 */
const ACK_WAIT_MS = 1500;

/*
 * 결제 팝업(#252)이 결제창에서 우리 화면으로 돌아왔을 때, 이 화면의 주소를 원래 창에 알리고 팝업을 닫는다.
 * 원래 창이 그 주소로 이동하므로 결과 화면은 원래 창에서 보인다. 결제 팝업이 아니거나 원래 창이 이미 닫혔으면 아무것도 하지 않아서
 * 보통 화면 그대로 남는다(결과를 볼 창이 이 팝업뿐이므로). 결제창이 원래 창과의 연결을 끊었으면 같은 사이트의 창끼리 쓰는 통로로 알리고,
 * 원래 창의 대답이 오면 닫고 오지 않으면 이 화면을 유지한다
 */
export function PopupReturn() {
  const notice = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (!isPopupName(window.name)) return;
    const href = window.location.pathname + window.location.search;
    if (!isPopupReturnPath(href)) return;
    const message = { type: POPUP_RETURN, href, name: window.name };
    const show = (visible: boolean) => {
      if (notice.current) notice.current.hidden = !visible;
    };
    const opener = window.opener as Window | null;
    if (opener) {
      /* 연결이 살아 있다. 원래 창이 이미 닫혔으면 결과를 보여 줄 창이 이 팝업뿐이라 그대로 둔다 */
      if (opener.closed) return;
      opener.postMessage(message, window.location.origin);
      show(true);
      window.close();
      return;
    }
    const channel = new BroadcastChannel(POPUP_CHANNEL);
    const giveUp = setTimeout(() => {
      show(false);
      channel.close();
    }, ACK_WAIT_MS);
    channel.onmessage = (event) => {
      if (event.data?.type !== POPUP_ACK || event.data.name !== window.name) return;
      clearTimeout(giveUp);
      channel.close();
      window.close();
    };
    show(true);
    channel.postMessage(message);
    return () => {
      clearTimeout(giveUp);
      channel.close();
    };
  }, []);
  return (
    <p ref={notice} hidden role="status" className={styles.notice}>
      결제 결과를 원래 창으로 보내고 있어요. 창이 닫히지 않으면 닫아 주세요
    </p>
  );
}
