"use client";

import { CaretLeftIcon, CaretRightIcon, MagnifyingGlassPlusIcon, XIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/Button";
import type { TestItem } from "@/features/recruitment/types";
import { NAV_BUTTON_CLASS } from "@/features/recruitment/components/RecruitmentGallery";

/** 테스트 항목 설명을 돕는 이미지. 정한 순서대로 크게 나열하고, 누르면 확대해서 보여 준다 */
export function TestItemImages({ item }: { item: TestItem }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  if (item.images.length === 0) return null;
  return (
    <>
      <ul aria-label={`${item.title} 이미지 ${item.images.length}장`} data-testid="test-item-images" className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {item.images.map((image, index) => (
          <li key={image.url}>
            <button
              type="button"
              aria-label={`${image.name} 크게 보기`}
              onClick={() => setOpenIndex(index)}
              className="group relative block w-full cursor-zoom-in rounded-xl transition-transform duration-500 ease-brand hover:-translate-y-1"
            >
              {/* 등록 중인 이미지와 샘플을 같은 방식으로 보여 준다 */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.url} alt={image.name} className="aspect-[4/3] w-full rounded-xl bg-surface-muted object-contain outline -outline-offset-1 outline-line" />
              <span className="absolute right-2 bottom-2 flex size-8 items-center justify-center rounded-full bg-surface text-text outline -outline-offset-1 outline-line">
                <MagnifyingGlassPlusIcon aria-hidden size={16} weight="bold" />
              </span>
            </button>
          </li>
        ))}
      </ul>
      {openIndex !== null && <ImageViewer item={item} index={openIndex} onIndexChange={setOpenIndex} onClose={() => setOpenIndex(null)} />}
    </>
  );
}

type ImageViewerProps = {
  item: TestItem;
  index: number;
  onIndexChange: (index: number) => void;
  /** 닫힌 뒤에 부른다. 부모가 이 대화상자를 지운다 */
  onClose: () => void;
};

/**
 * 항목 이미지 확대 보기. 브라우저 기본 <dialog>라 포커스가 안에 갇히고 Esc로 닫히며, 닫으면 누른 이미지로 포커스가 돌아온다.
 * 좌우 버튼과 화살표 키로 같은 항목의 이미지를 넘긴다.
 */
function ImageViewer({ item, index, onIndexChange, onClose }: ImageViewerProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const count = item.images.length;
  const image = item.images[index];

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  function move(step: number) {
    onIndexChange((index + step + count) % count);
  }

  function onKeyDown(event: KeyboardEvent) {
    if (count < 2) return;
    if (event.key === "ArrowLeft") move(-1);
    if (event.key === "ArrowRight") move(1);
  }

  return (
    <dialog
      ref={ref}
      aria-label={`${item.title} 이미지 크게 보기`}
      onClose={onClose}
      onKeyDown={onKeyDown}
      onClick={(event) => {
        if (event.target === event.currentTarget) ref.current?.close();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-5xl rounded-2xl bg-surface-muted p-0 text-text backdrop:bg-surface/80 backdrop:backdrop-blur-sm"
    >
      <div className="flex animate-rise-in flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-4">
          <p className="min-w-0 text-sm font-bold break-words">
            {image.name}
            {count > 1 && (
              <span className="ml-2 font-semibold text-text-muted tabular-nums">
                {index + 1} / {count}
              </span>
            )}
          </p>
          <Button variant="ghost" size="sm" aria-label="닫기" onClick={() => ref.current?.close()} className="size-10 shrink-0 !px-0 !py-0">
            <XIcon aria-hidden size={20} weight="bold" />
          </Button>
        </div>
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.url} alt={image.name} className="max-h-[75dvh] w-full rounded-xl bg-surface object-contain" />
          {count > 1 && (
            <>
              <Button variant="ghost" size="sm" aria-label="이전 이미지" onClick={() => move(-1)} className={`${NAV_BUTTON_CLASS} left-2`}>
                <CaretLeftIcon aria-hidden size={16} weight="bold" />
              </Button>
              <Button variant="ghost" size="sm" aria-label="다음 이미지" onClick={() => move(1)} className={`${NAV_BUTTON_CLASS} right-2`}>
                <CaretRightIcon aria-hidden size={16} weight="bold" />
              </Button>
            </>
          )}
        </div>
      </div>
    </dialog>
  );
}
