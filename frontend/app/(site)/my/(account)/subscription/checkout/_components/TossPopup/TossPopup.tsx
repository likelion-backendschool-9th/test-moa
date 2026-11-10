"use client";

import { useEffect, useRef, useState } from "react";
import { openTossWindow } from "@/features/subscription/toss-window";
import type { TossWindow } from "@/features/subscription/pg";
import styles from "./TossPopup.module.css";

/*
 * 결제 팝업(#252) 안에서 토스 결제창을 여는 화면. 토스 SDK는 창 크기를 정하지 못해서, 우리가 연 팝업 안에서 결제창을 열어 크기를 맞춘다.
 * 열리면 토스가 성공·실패 주소로 이동시키고, 닫거나 열지 못하면 이 화면에 이유가 남는다
 */
export function TossPopup({ window: values, loading = false }: { window: TossWindow | null; loading?: boolean }) {
  const [message, setMessage] = useState<string | null>(null);
  /* 개발 모드의 효과 두 번 실행에도 결제창을 두 번 열지 않는다 */
  const started = useRef(false);
  useEffect(() => {
    if (!values || started.current) return;
    started.current = true;
    openTossWindow(values, "self").then(setMessage);
  }, [values]);

  const text = !values && !loading ? "결제 정보를 확인하지 못했어요. 창을 닫고 다시 시도해 주세요" : message;
  return (
    <div className={styles.popup}>
      <h1 className={styles.title}>토스페이 결제</h1>
      <p role={text ? "alert" : "status"} className={styles.text}>
        {text ?? "토스 결제창을 여는 중이에요…"}
      </p>
    </div>
  );
}
