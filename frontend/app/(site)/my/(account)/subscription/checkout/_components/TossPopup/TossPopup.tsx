"use client";

import { useEffect, useRef, useState } from "react";
import { openTossWindow } from "@/features/subscription/toss-window";
import { isPopupName, isTossWindow } from "@/features/subscription/pg";
import { POPUP_TOSS_REQUEST, POPUP_TOSS_WINDOW } from "@/app/(site)/my/(account)/subscription/checkout/_components/CheckoutForm/usePaymentPopup";
import styles from "./TossPopup.module.css";

const WAITING = "토스 결제창을 여는 중이에요…";
const NO_VALUES = "결제 정보를 받지 못했어요. 창을 닫고 다시 시도해 주세요";

/** 화면 모양만. 서버에서 먼저 그릴 때와 값을 기다리는 동안 같은 모양을 보인다 */
export function TossPopupView({ text, alert = false }: { text: string; alert?: boolean }) {
  return (
    <div className={styles.popup}>
      <h1 className={styles.title}>토스페이 결제</h1>
      <p role={alert ? "alert" : "status"} className={styles.text}>
        {text}
      </p>
    </div>
  );
}

/*
 * 결제 팝업(#252) 안에서 토스 결제창을 여는 화면. 토스 SDK는 창 크기를 정하지 못해서, 우리가 연 팝업 안에서 결제창을 열어 크기를 맞춘다.
 * 결제창에 넘길 값(결제 키·금액·성공 주소 등)은 주소에 싣지 않는다. 이 화면이 열리면 원래 창에 값을 달라고 하고,
 * 원래 창이 직접 준 값만 쓴다. 그래서 이 주소만 열어서는 다른 값으로 토스 결제창을 띄울 수 없다.
 * 결제창이 열리면 토스가 성공·실패 주소로 이동시키고, 닫거나 열지 못하면 이 화면에 이유가 남는다
 */
export function TossPopup() {
  const [message, setMessage] = useState<string | null>(null);
  /* 개발 모드의 효과 두 번 실행에도 결제창을 두 번 열지 않는다 */
  const started = useRef(false);
  useEffect(() => {
    const opener = window.opener as Window | null;
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin || event.source !== opener || event.data?.type !== POPUP_TOSS_WINDOW) return;
      if (started.current) return;
      started.current = true;
      clearTimeout(giveUp);
      if (!isTossWindow(event.data.window)) return setMessage(NO_VALUES);
      openTossWindow(event.data.window, "self").then(setMessage);
    }
    /* 원래 창이 없거나 값을 보내지 않으면 기다리지 않고 이유를 보인다 */
    const giveUp = setTimeout(() => setMessage(NO_VALUES), opener && isPopupName(window.name) ? 5000 : 0);
    window.addEventListener("message", onMessage);
    if (opener && isPopupName(window.name)) opener.postMessage({ type: POPUP_TOSS_REQUEST }, window.location.origin);
    return () => {
      window.removeEventListener("message", onMessage);
      clearTimeout(giveUp);
    };
  }, []);
  return <TossPopupView text={message ?? WAITING} alert={message !== null} />;
}
