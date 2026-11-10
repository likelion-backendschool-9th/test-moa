"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import styles from "./CollapsibleText.module.css";

/**
 * 긴 글. 처음에는 3줄까지만 보이고, 넘치면 "더 보기"로 펼친다. 줄바꿈은 지키고 긴 문자열은 칸 끝에서 끊는다.
 * 3줄에 다 들어가면 버튼을 그리지 않는다. 줄 수는 CSS(line-clamp)가 자르고, 넘쳤는지만 직접 잰다.
 */
export function CollapsibleText({ text }: { text: string }) {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const textId = useId();

  useEffect(() => {
    const element = textRef.current;
    if (!element) return;
    /* 펼친 동안에는 넘쳤는지 잴 수 없으니(다 보임) 접힌 상태에서만 갱신한다 */
    const measure = () => {
      if (!expanded) setOverflowing(element.scrollHeight > element.clientHeight + 1);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [text, expanded]);

  return (
    <div className={styles.root}>
      <p ref={textRef} id={textId} className={cn(styles.text, !expanded && styles.clamped)}>
        {text}
      </p>
      {(overflowing || expanded) && (
        <button type="button" aria-expanded={expanded} aria-controls={textId} onClick={() => setExpanded((prev) => !prev)} className={styles.button}>
          {expanded ? "접기" : "더 보기"}
        </button>
      )}
    </div>
  );
}
