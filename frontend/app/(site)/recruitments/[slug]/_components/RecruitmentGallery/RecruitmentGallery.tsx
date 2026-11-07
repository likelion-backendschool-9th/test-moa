"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge/Badge";
import { GalleryNavButton } from "@/features/recruitment/components/GalleryNavButton/GalleryNavButton";
import styles from "./RecruitmentGallery.module.css";

export type GalleryImage = {
  url: string;
  alt: string;
  /** 다른 이미지와 구분할 표시. 이미지가 한 장이면 구분할 것이 없어 보여 주지 않는다 */
  badge?: string;
};


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
    <div className={styles.root}>
      <ul
        ref={listRef}
        aria-label={label}
        data-testid="recruitment-gallery"
        onScroll={updateButtons}
        onScrollEnd={() => (targetRef.current = null)}
        onTouchStart={() => (targetRef.current = null)}
        className={styles.list}
      >
        {images.map((image, index) => (
          <li key={`${index}-${image.url}`} className={styles.root2}>
            {/* 등록 중인 이미지와 샘플 이미지를 같은 방식으로 보여 준다 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.url}
              alt={image.alt}
              className={styles.image}
            />
            {image.badge && images.length > 1 && (
              <Badge tone="neutral" className={styles.badge}>
                {image.badge}
              </Badge>
            )}
          </li>
        ))}
      </ul>
      {(canPrev || canNext) && (
        <>
          <GalleryNavButton direction="prev" disabled={!canPrev} onClick={() => move(-1)} />
          <GalleryNavButton direction="next" disabled={!canNext} onClick={() => move(1)} />
        </>
      )}
    </div>
  );
}
