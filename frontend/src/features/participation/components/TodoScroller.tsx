"use client";

import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";

type TodoScrollerProps = {
  heading: ReactNode;
  className: string;
  children: ReactNode;
};

/**
 * 다음 할 일 카드 띠와 이전·다음 버튼. 띠는 스크롤바도 손으로 넘기기도 없고 버튼으로만 한 화면씩 넘긴다.
 * 띠가 넘칠 때만 버튼이 보인다.
 */
export function TodoScroller({ heading, className, children }: TodoScrollerProps) {
  const list = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  function update() {
    const element = list.current;
    if (!element) return;
    setEdges({
      start: element.scrollLeft <= 1,
      end: element.scrollLeft + element.clientWidth >= element.scrollWidth - 1,
    });
  }

  useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  /* 한 화면 = 띠 폭 + 카드 사이 간격. 그래야 다음 화면의 첫 카드가 왼쪽 끝에 맞는다 */
  function move(step: number) {
    const element = list.current;
    if (!element) return;
    const gap = parseFloat(getComputedStyle(element).columnGap) || 0;
    element.scrollBy({ left: step * (element.clientWidth + gap), behavior: "smooth" });
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        {heading}
        {!(edges.start && edges.end) && (
          <div className="flex items-center gap-1">
            <Button variant="secondary" size="sm" aria-label="이전 할 일" disabled={edges.start} onClick={() => move(-1)}>
              <CaretLeftIcon aria-hidden size={16} weight="bold" />
            </Button>
            <Button variant="secondary" size="sm" aria-label="다음 할 일" disabled={edges.end} onClick={() => move(1)}>
              <CaretRightIcon aria-hidden size={16} weight="bold" />
            </Button>
          </div>
        )}
      </div>
      <ul ref={list} onScroll={update} className={className}>
        {children}
      </ul>
    </>
  );
}
