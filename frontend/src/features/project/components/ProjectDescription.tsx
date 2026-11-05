"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * 프로젝트 상세 설명. 대표 이미지 높이까지만 보여 주고, 넘치면 "더 보기"로 펼친다.
 * 줄바꿈으로 나뉜 문단 사이에 여백을 둔다. 이미지 높이는 화면 폭마다 달라서 직접 재고, 줄이 중간에 잘리지 않게 맞춘다.
 * 재기 전에는 넓은 화면의 이미지 높이와 비슷한 max-h-96으로 잘라 두어 처음 그릴 때 화면이 크게 움직이지 않게 한다.
 */
/** 높이 안에 온전히 들어가는 마지막 줄까지의 높이. 문단 여백이 있어 문단마다 시작 위치를 재서 줄 수를 센다 */
function fittingHeight(element: HTMLElement, height: number) {
  const top = element.getBoundingClientRect().top;
  let fit = 0;
  for (const paragraph of element.children) {
    const start = paragraph.getBoundingClientRect().top - top;
    const lineHeight = parseFloat(getComputedStyle(paragraph).lineHeight);
    const lines = Math.floor((height - start) / lineHeight);
    if (lines <= 0) break;
    const total = Math.round(paragraph.getBoundingClientRect().height / lineHeight);
    fit = start + Math.min(lines, total) * lineHeight;
    if (lines < total) break;
  }
  return fit;
}

export function ProjectDescription({ text }: { text: string }) {
  const textRef = useRef<HTMLDivElement>(null);
  /* undefined: 재기 전, null: 다 들어가서 자르지 않음, 숫자: 자를 높이(px) */
  const [limit, setLimit] = useState<number | null | undefined>(undefined);
  const [expanded, setExpanded] = useState(false);
  const textId = useId();

  useEffect(() => {
    const element = textRef.current;
    if (!element) return;
    const image = element.closest("[data-project-body]")?.querySelector("img");
    const measure = () => {
      const imageHeight = image?.getBoundingClientRect().height ?? 0;
      /* 닫힌 미리보기 안에서는 높이가 0이다. 열리면 다시 잰다 */
      if (!imageHeight || element.scrollHeight <= imageHeight + 1) setLimit(null);
      else setLimit(fittingHeight(element, imageHeight));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    if (image) observer.observe(image);
    return () => observer.disconnect();
  }, [text]);

  const clipped = !expanded && limit !== null;
  return (
    <div className="flex min-w-0 flex-col items-start gap-2">
      <div
        ref={textRef}
        id={textId}
        data-testid="project-description"
        style={clipped && limit !== undefined ? { maxHeight: limit } : undefined}
        className={`flex w-full flex-col gap-3${clipped ? " overflow-hidden" : ""}${clipped && limit === undefined ? " max-h-96" : ""}`}
      >
        {text
          .split("\n")
          .filter((paragraph) => paragraph.trim())
          .map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
      </div>
      {typeof limit === "number" && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={textId}
          onClick={() => setExpanded((prev) => !prev)}
          className="text-sm font-bold text-text-muted transition-colors duration-300 ease-brand hover:text-text"
        >
          {expanded ? "접기" : "더 보기"}
        </button>
      )}
    </div>
  );
}
