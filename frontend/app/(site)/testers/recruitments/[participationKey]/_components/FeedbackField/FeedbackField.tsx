"use client";

import { PlusIcon, XIcon } from "@phosphor-icons/react";
import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge/Badge";
import { FeedbackMarker } from "../FeedbackMarker/FeedbackMarker";
import { buttonClass } from "@/components/ui/Button/button-class";
import { TextArea } from "@/components/ui/TextField/TextField";
import { contentFieldName, imagesFieldName } from "@/features/participation/feedback-fields";
import {
  checkFeedbackImages,
  FEEDBACK_IMAGE_HINT,
  FEEDBACK_IMAGE_LIMIT,
  type FileMeta,
} from "@/features/participation/feedback-images";
import { FEEDBACK_MAX_LENGTH } from "@/features/participation/types";
import styles from "./FeedbackField.module.css";

export type PickedImage = FileMeta & { url: string; file: File };

const toMeta = ({ name, size, type }: PickedImage): FileMeta => ({ name, size, type });

type FeedbackFieldProps = {
  fieldKey: string;
  /** 테스트 항목 번호. 기타 의견은 없다 */
  number?: number;
  title: string;
  description: string;
  required: boolean;
  error?: string;
  images: PickedImage[];
  onImagesChange: (images: PickedImage[]) => void;
};

/**
 * 피드백 칸 하나. 내용과 이미지를 칸마다 따로 갖는다.
 * 이미지는 고를 때 바로 한도를 확인해 브라우저 안에서 미리 보여 준다. 파일 칸에 name이 없어 파일은 서버로 가지 않고,
 * 숨은 칸으로 이름·크기·형식만 보낸다(feedback-images.ts).
 */
export function FeedbackField({ fieldKey, number, title, description, required, error, images, onImagesChange }: FeedbackFieldProps) {
  const [content, setContent] = useState("");
  const [imageError, setImageError] = useState<string>();
  const fileInput = useRef<HTMLInputElement>(null);
  const full = images.length >= FEEDBACK_IMAGE_LIMIT.count;
  const ids = {
    content: `feedback-content-${fieldKey}`,
    hint: `feedback-hint-${fieldKey}`,
    error: `feedback-error-${fieldKey}`,
    imageHint: `feedback-image-hint-${fieldKey}`,
    imageError: `feedback-image-error-${fieldKey}`,
  };

  /* 화면을 떠날 때 미리보기 주소를 돌려준다 */
  const imagesRef = useRef(images);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);
  useEffect(() => () => imagesRef.current.forEach((image) => URL.revokeObjectURL(image.url)), []);

  /* 한 장이라도 한도를 넘으면 이번에 고른 파일을 모두 넣지 않고 이유를 알린다 */
  function addImages(event: ChangeEvent<HTMLInputElement>) {
    const picked = [...(event.target.files ?? [])];
    event.target.value = "";
    if (picked.length === 0) return;
    const problem = checkFeedbackImages([...images, ...picked]);
    setImageError(problem);
    if (problem) return;
    onImagesChange([
      ...images,
      ...picked.map((file) => ({ name: file.name, size: file.size, type: file.type, file, url: URL.createObjectURL(file) })),
    ]);
  }

  function removeImage(url: string) {
    URL.revokeObjectURL(url);
    onImagesChange(images.filter((image) => image.url !== url));
    setImageError(undefined);
    /* 5장이 차 있었으면 추가 칸이 다시 그려진 뒤에 포커스를 옮길 수 있다 */
    requestAnimationFrame(() => fileInput.current?.focus());
  }

  return (
    <li data-testid="feedback-field" className={styles.root}>
      <FeedbackMarker number={number} />
      <section aria-label={`${title} 피드백`} className={styles.section}>
        <div className={styles.box}>
          <div className={styles.box2}>
            <label htmlFor={ids.content} className={styles.title}>
              {title}
            </label>
            <Badge tone={required ? "neutral" : "outline"}>{required ? "필수" : "선택"}</Badge>
          </div>
          {description && (
            <p id={ids.hint} className={styles.description}>
              {description}
            </p>
          )}
        </div>
        <TextArea
          id={ids.content}
          name={contentFieldName(fieldKey)}
          rows={4}
          maxLength={FEEDBACK_MAX_LENGTH}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={[description && ids.hint, error && ids.error].filter(Boolean).join(" ") || undefined}
        />
        <div className={styles.box3}>
          {error ? (
            <p id={ids.error} data-testid="feedback-error" className={styles.error}>
              {error}
            </p>
          ) : (
            <span />
          )}
          <span className={styles.label}>
            {content.length} / {FEEDBACK_MAX_LENGTH}자
          </span>
        </div>

        <div className={styles.box4}>
          <div className={styles.box5}>
            <p className={styles.text}>
              이미지 <span className={styles.label2}>{images.length} / {FEEDBACK_IMAGE_LIMIT.count}</span>
            </p>
            <p id={ids.imageHint} className={styles.FEEDBACK_IMAGE_HINT}>
              {FEEDBACK_IMAGE_HINT}
            </p>
          </div>
          {images.length > 0 && (
            <ul className={styles.list}>
              {images.map((image) => (
                <li key={image.url} data-testid="feedback-image" className={styles.root2}>
                  {/* 고른 파일의 임시 주소라 next/image로 최적화할 수 없다 */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.url} alt={image.name} className={styles.image} />
                  <button
                    type="button"
                    aria-label={`${image.name} 빼기`}
                    onClick={() => removeImage(image.url)}
                    className={styles.button}
                  >
                    <XIcon aria-hidden size={14} weight="bold" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {imageError && (
            <p role="alert" id={ids.imageError} className={styles.imageError}>
              {imageError}
            </p>
          )}
          {!full && (
            <label className={buttonClass("secondary", "sm", styles.fileButton)}>
              <PlusIcon aria-hidden size={16} weight="bold" />
              <span className={styles.srOnly}>{title}</span> 이미지 추가
              <input
                ref={fileInput}
                type="file"
                multiple
                accept={FEEDBACK_IMAGE_LIMIT.types.join(",")}
                aria-describedby={imageError ? `${ids.imageHint} ${ids.imageError}` : ids.imageHint}
                onChange={addImages}
                className={styles.srOnly2}
              />
            </label>
          )}
          <input type="hidden" name={imagesFieldName(fieldKey)} value={JSON.stringify(images.map(toMeta))} />
        </div>
      </section>
    </li>
  );
}
