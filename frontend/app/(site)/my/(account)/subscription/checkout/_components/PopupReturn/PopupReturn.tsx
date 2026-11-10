"use client";

import { useEffect, useRef } from "react";
import { isPopupReturnPath, POPUP_NAME } from "@/features/subscription/pg";
import { POPUP_CHANNEL, POPUP_RETURN } from "@/app/(site)/my/(account)/subscription/checkout/_components/CheckoutForm/usePaymentPopup";
import styles from "./PopupReturn.module.css";

/*
 * 결제 팝업(#252)이 결제창에서 우리 화면으로 돌아왔을 때, 이 화면의 주소를 원래 창에 알리고 팝업을 닫는다.
 * 원래 창이 그 주소로 이동하므로 결과 화면은 원래 창에서 보인다. 결제 팝업이 아니거나 원래 창이 없으면 아무것도 하지 않아서 보통 화면 그대로다
 */
export function PopupReturn() {
  const notice = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (window.name !== POPUP_NAME) return;
    const href = window.location.pathname + window.location.search;
    if (!isPopupReturnPath(href)) return;
    const message = { type: POPUP_RETURN, href };
    const opener = window.opener as Window | null;
    if (opener && !opener.closed) {
      opener.postMessage(message, window.location.origin);
    } else {
      /* 결제창이 원래 창과의 연결을 끊었으면 같은 사이트의 창끼리 쓰는 통로로 알린다 */
      const channel = new BroadcastChannel(POPUP_CHANNEL);
      channel.postMessage(message);
      channel.close();
    }
    if (notice.current) notice.current.hidden = false;
    window.close();
  }, []);
  return (
    <p ref={notice} hidden role="status" className={styles.notice}>
      결제 결과를 원래 창으로 보내고 있어요. 창이 닫히지 않으면 닫아 주세요
    </p>
  );
}
