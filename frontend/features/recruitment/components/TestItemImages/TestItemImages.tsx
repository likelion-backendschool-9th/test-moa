"use client";

import { MagnifyingGlassPlusIcon, XIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/Button/Button";
import type { TestItem } from "@/features/recruitment/types";
import { GalleryNavButton } from "@/features/recruitment/components/GalleryNavButton/GalleryNavButton";
import { Card } from "@/components/ui/Card/Card";
import styles from "./TestItemImages.module.css";

/** 테스트 항목 설명을 돕는 이미지. 정한 순서대로 크게 나열하고, 누르면 확대해서 보여 준다 */
export function TestItemImages({ item }: { item: TestItem }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  if (item.images.length === 0) return null;
  return (
    <>
      <ul aria-label={`${item.title} 이미지 ${item.images.length}장`} data-testid="test-item-images" className={styles.list}>
        {item.images.map((image, index) => (
          <li key={image.url}>
            <button
              type="button"
              aria-label={`${image.name} 크게 보기`}
              onClick={() => setOpenIndex(index)}
              className={styles.button}
            >
              {/* 등록 중인 이미지와 샘플을 같은 방식으로 보여 준다 */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.url} alt={image.name} className={styles.image} />
              <span className={styles.label}>
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
    <Card as="dialog"
      ref={ref}
      aria-label={`${item.title} 이미지 크게 보기`}
      onClose={onClose}
      onKeyDown={onKeyDown}
      onClick={(event) => {
        if (event.target === event.currentTarget) ref.current?.close();
      }}
      className={styles.imageViewer}
    >
      <div className={styles.imageViewerBox}>
        <div className={styles.imageViewerBox2}>
          <p className={styles.imageViewerText}>
            {image.name}
            {count > 1 && (
              <span className={styles.imageViewerLabel}>
                {index + 1} / {count}
              </span>
            )}
          </p>
          <Button variant="ghost" size="sm" aria-label="닫기" onClick={() => ref.current?.close()} className={styles.imageViewerButton}>
            <XIcon aria-hidden size={20} weight="bold" />
          </Button>
        </div>
        <div className={styles.imageViewerBox3}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.url} alt={image.name} className={styles.imageViewerImage} />
          {count > 1 && (
            <>
              <GalleryNavButton direction="prev" onClick={() => move(-1)} />
              <GalleryNavButton direction="next" onClick={() => move(1)} />
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
