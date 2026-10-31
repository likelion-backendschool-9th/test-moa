"use client";

import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";

type TodoScrollerProps = {
  heading: ReactNode;
  className: string;
  children: ReactNode;
};

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function gapOf(element: HTMLElement) {
  return parseFloat(getComputedStyle(element).columnGap) || 0;
}

/** 카드 하나가 차지하는 폭(카드 + 간격). 스크롤 위치를 카드 단위로 셀 때 쓴다 */
function cardStep(element: HTMLElement) {
  const first = element.firstElementChild as HTMLElement | null;
  return first ? first.offsetWidth + gapOf(element) : element.clientWidth;
}

/**
 * 다음 할 일 카드 띠와 이전·다음 버튼. 띠는 스크롤바도 손으로 넘기기도 없고 버튼으로만 한 화면씩 넘긴다.
 * 위치는 맨 앞에 보이는 카드 번호로 기억해서, 화면 폭이 바뀌어 카드 폭이 달라져도 그 카드가 왼쪽 끝에 맞는다.
 * 띠가 넘칠 때만 버튼이 보인다.
 */
export function TodoScroller({ heading, className, children }: TodoScrollerProps) {
  const list = useRef<HTMLUListElement>(null);
  const firstIndex = useRef(0);
  const [edges, setEdges] = useState({ start: true, end: true });

  function update() {
    const element = list.current;
    if (!element) return;
    firstIndex.current = Math.round(element.scrollLeft / cardStep(element));
    setEdges({
      start: element.scrollLeft <= 1,
      end: element.scrollLeft + element.clientWidth >= element.scrollWidth - 1,
    });
  }

  /* 띠 폭이 바뀌면 기억한 카드가 왼쪽 끝에 오도록 다시 맞춘다 (처음 관찰할 때도 한 번 불린다) */
  useEffect(() => {
    const element = list.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      element.scrollTo({ left: firstIndex.current * cardStep(element), behavior: "instant" });
      update();
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  /* 한 화면에 보이는 카드 수만큼 넘긴다. 모션 줄이기 설정이면 애니메이션 없이 바로 옮긴다 */
  function move(direction: number) {
    const element = list.current;
    if (!element) return;
    const step = cardStep(element);
    const perView = Math.max(1, Math.round((element.clientWidth + gapOf(element)) / step));
    const last = element.children.length - 1;
    const target = Math.min(Math.max(firstIndex.current + direction * perView, 0), last);
    const reduced = window.matchMedia(REDUCED_MOTION_QUERY).matches;
    element.scrollTo({ left: target * step, behavior: reduced ? "instant" : "smooth" });
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
