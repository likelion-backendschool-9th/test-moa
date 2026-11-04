"use client";

import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

export type GalleryImage = { url: string; alt: string };

/**
 * 모집글 이미지를 가로로 늘어놓고 버튼으로 한 장씩 넘긴다. 손가락으로 밀어도 넘어간다.
 * 이미지가 한 장이면 버튼이 없다. 첫 이미지 높이에 맞춰 ProjectDescription이 소개 글을 자르므로 모든 이미지의 크기가 같다.
 */
export function RecruitmentGallery({ images, label }: { images: GalleryImage[]; label: string }) {
  const listRef = useRef<HTMLUListElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(images.length > 1);

  const updateButtons = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    setCanPrev(list.scrollLeft > 1);
    setCanNext(list.scrollLeft + list.clientWidth < list.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const observer = new ResizeObserver(updateButtons);
    observer.observe(list);
    return () => observer.disconnect();
  }, [updateButtons]);

  function move(step: number) {
    const list = listRef.current;
    const first = list?.firstElementChild;
    if (!list || !first) return;
    const gap = parseFloat(getComputedStyle(list).columnGap) || 0;
    /* 부드럽게 넘기면 움직이는 중에 또 눌렀을 때 그 위치부터 다시 계산해 덜 넘어가므로 바로 옮긴다 */
    list.scrollBy({ left: step * (first.getBoundingClientRect().width + gap) });
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <ul
        ref={listRef}
        aria-label={label}
        data-testid="recruitment-gallery"
        onScroll={updateButtons}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto [scrollbar-width:none]"
      >
        {images.map((image, index) => (
          <li key={`${index}-${image.url}`} className="w-[min(100%,28rem)] shrink-0 snap-start">
            {/* 등록 중인 이미지와 샘플 이미지를 같은 방식으로 보여 준다 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.url}
              alt={image.alt}
              className="aspect-[4/3] w-full rounded-2xl bg-surface-muted object-contain outline -outline-offset-1 outline-line"
            />
          </li>
        ))}
      </ul>
      {images.length > 1 && (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" aria-label="이전 이미지" disabled={!canPrev} onClick={() => move(-1)}>
            <CaretLeftIcon aria-hidden size={16} weight="bold" />
          </Button>
          <Button variant="ghost" size="sm" aria-label="다음 이미지" disabled={!canNext} onClick={() => move(1)}>
            <CaretRightIcon aria-hidden size={16} weight="bold" />
          </Button>
        </div>
      )}
    </div>
  );
}
