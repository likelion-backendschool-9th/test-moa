"use client";

import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export type GalleryImage = {
  url: string;
  alt: string;
  /** 다른 이미지와 구분할 표시. 이미지가 한 장이면 구분할 것이 없어 보여 주지 않는다 */
  badge?: string;
};

/** 이미지 양쪽 가운데에 겹치는 넘기기 버튼 */
export const NAV_BUTTON_CLASS = "absolute top-1/2 size-10 -translate-y-1/2 bg-surface !px-0 !py-0 outline -outline-offset-1 outline-line";

/**
 * 모집글 이미지를 가로로 늘어놓고 양쪽 버튼으로 한 장씩 부드럽게 넘긴다. 손가락으로 밀어도 넘어간다.
 * 이미지가 모두 들어가면 버튼이 없다. 첫 이미지 높이에 맞춰 ProjectDescription이 소개 글을 자르므로 모든 이미지의 크기가 같다.
 */
export function RecruitmentGallery({ images, label }: { images: GalleryImage[]; label: string }) {
  const listRef = useRef<HTMLUListElement>(null);
  /* 버튼으로 가는 중인 위치. 움직이는 중에 또 눌러도 이 위치부터 세어 한 장도 덜 넘어가지 않는다 */
  const targetRef = useRef<number | null>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(images.length > 1);

  const updateButtons = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    setCanPrev(list.scrollLeft > 1);
    setCanNext(list.scrollLeft + list.clientWidth < list.scrollWidth - 1);
    if (targetRef.current !== null && Math.abs(list.scrollLeft - targetRef.current) <= 1) targetRef.current = null;
  }, []);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const observer = new ResizeObserver(updateButtons);
    observer.observe(list);
    return () => observer.disconnect();
  }, [updateButtons]);

  function move(step: 1 | -1) {
    const list = listRef.current;
    if (!list) return;
    const from = targetRef.current ?? list.scrollLeft;
    const max = list.scrollWidth - list.clientWidth;
    /* 끝쪽 이미지는 왼쪽에 붙일 수 없으므로 갈 수 있는 끝 위치로 맞춘다 */
    const stops = [...new Set(Array.from(list.children, (item) => Math.min((item as HTMLElement).offsetLeft - list.offsetLeft, max)))];
    const target = step > 0 ? stops.find((stop) => stop > from + 1) : stops.findLast((stop) => stop < from - 1);
    if (target === undefined) return;
    targetRef.current = target;
    list.scrollTo({ left: target });
  }

  return (
    <div className="relative min-w-0">
      <ul
        ref={listRef}
        aria-label={label}
        data-testid="recruitment-gallery"
        onScroll={updateButtons}
        onScrollEnd={() => (targetRef.current = null)}
        onTouchStart={() => (targetRef.current = null)}
        className="relative flex snap-x snap-mandatory gap-3 overflow-x-auto [scrollbar-width:none] motion-safe:scroll-smooth [&::-webkit-scrollbar]:hidden"
      >
        {images.map((image, index) => (
          <li key={`${index}-${image.url}`} className="relative w-[min(100%,28rem)] shrink-0 snap-start">
            {/* 등록 중인 이미지와 샘플 이미지를 같은 방식으로 보여 준다 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.url}
              alt={image.alt}
              className="aspect-[4/3] w-full rounded-2xl bg-surface-muted object-contain outline -outline-offset-1 outline-line"
            />
            {image.badge && images.length > 1 && (
              <Badge tone="neutral" className="absolute top-3 left-3">
                {image.badge}
              </Badge>
            )}
          </li>
        ))}
      </ul>
      {(canPrev || canNext) && (
        <>
          <Button variant="ghost" size="sm" aria-label="이전 이미지" disabled={!canPrev} onClick={() => move(-1)} className={`${NAV_BUTTON_CLASS} left-2`}>
            <CaretLeftIcon aria-hidden size={16} weight="bold" />
          </Button>
          <Button variant="ghost" size="sm" aria-label="다음 이미지" disabled={!canNext} onClick={() => move(1)} className={`${NAV_BUTTON_CLASS} right-2`}>
            <CaretRightIcon aria-hidden size={16} weight="bold" />
          </Button>
        </>
      )}
    </div>
  );
}
