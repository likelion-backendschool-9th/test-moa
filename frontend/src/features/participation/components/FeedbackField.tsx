"use client";

import { PlusIcon, XIcon } from "@phosphor-icons/react";
import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { buttonClass } from "@/components/ui/button-styles";
import { inputClass } from "@/features/project/components/TextField";
import { contentFieldName, imagesFieldName } from "../feedback-fields";
import { checkFeedbackImages, FEEDBACK_IMAGE_HINT, FEEDBACK_IMAGE_LIMIT, type FileMeta } from "../feedback-images";
import { FEEDBACK_MAX_LENGTH } from "../types";

type PickedImage = FileMeta & { url: string };

const toMeta = ({ name, size, type }: PickedImage): FileMeta => ({ name, size, type });

type FeedbackFieldProps = {
  fieldKey: string;
  title: string;
  description: string;
  required: boolean;
  error?: string;
};

/**
 * 피드백 칸 하나. 내용과 이미지를 칸마다 따로 갖는다.
 * 이미지는 고를 때 바로 한도를 확인해 브라우저 안에서 미리 보여 준다. 파일 칸에 name이 없어 파일은 서버로 가지 않고,
 * 숨은 칸으로 이름·크기·형식만 보낸다(feedback-images.ts).
 */
export function FeedbackField({ fieldKey, title, description, required, error }: FeedbackFieldProps) {
  const [content, setContent] = useState("");
  const [images, setImages] = useState<PickedImage[]>([]);
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
    setImages((prev) => [
      ...prev,
      ...picked.map((file) => ({ name: file.name, size: file.size, type: file.type, url: URL.createObjectURL(file) })),
    ]);
  }

  function removeImage(url: string) {
    URL.revokeObjectURL(url);
    setImages((prev) => prev.filter((image) => image.url !== url));
    setImageError(undefined);
    /* 5장이 차 있었으면 추가 칸이 다시 그려진 뒤에 포커스를 옮길 수 있다 */
    requestAnimationFrame(() => fileInput.current?.focus());
  }

  return (
    <section aria-label={`${title} 피드백`} data-testid="feedback-field" className="flex flex-col gap-3 border-t border-line pt-6">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor={ids.content} className="text-sm font-bold">
            {title}
          </label>
          <Badge tone={required ? "neutral" : "outline"}>{required ? "필수" : "선택"}</Badge>
        </div>
        {description && (
          <p id={ids.hint} className="text-sm text-text-muted">
            {description}
          </p>
        )}
      </div>
      <textarea
        id={ids.content}
        name={contentFieldName(fieldKey)}
        rows={4}
        maxLength={FEEDBACK_MAX_LENGTH}
        value={content}
        onChange={(event) => setContent(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={[description && ids.hint, error && ids.error].filter(Boolean).join(" ") || undefined}
        className={inputClass}
      />
      <div className="flex items-start justify-between gap-4">
        {error ? (
          <p id={ids.error} data-testid="feedback-error" className="text-sm font-semibold">
            {error}
          </p>
        ) : (
          <span />
        )}
        <span className="shrink-0 text-xs text-text-muted tabular-nums">
          {content.length} / {FEEDBACK_MAX_LENGTH}자
        </span>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="text-sm font-bold">
            이미지 <span className="ml-1 font-semibold text-text-muted tabular-nums">{images.length} / {FEEDBACK_IMAGE_LIMIT.count}</span>
          </p>
          <p id={ids.imageHint} className="text-sm text-text-muted">
            {FEEDBACK_IMAGE_HINT}
          </p>
        </div>
        {images.length > 0 && (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {images.map((image) => (
              <li key={image.url} data-testid="feedback-image" className="relative">
                {/* 고른 파일의 임시 주소라 next/image로 최적화할 수 없다 */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt={image.name} className="aspect-square w-full rounded-xl bg-surface-strong object-cover" />
                <button
                  type="button"
                  aria-label={`${image.name} 빼기`}
                  onClick={() => removeImage(image.url)}
                  className="absolute top-1 right-1 flex size-7 items-center justify-center rounded-full bg-surface-strong text-text transition-colors duration-300 ease-brand hover:bg-surface-muted"
                >
                  <XIcon aria-hidden size={14} weight="bold" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {imageError && (
          <p role="alert" id={ids.imageError} className="text-sm font-semibold">
            {imageError}
          </p>
        )}
        {!full && (
          <label className={buttonClass("secondary", "sm", "w-full cursor-pointer self-start focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent md:w-auto")}>
            <PlusIcon aria-hidden size={16} weight="bold" />
            <span className="sr-only">{title}</span> 이미지 추가
            <input
              ref={fileInput}
              type="file"
              multiple
              accept={FEEDBACK_IMAGE_LIMIT.types.join(",")}
              aria-describedby={imageError ? `${ids.imageHint} ${ids.imageError}` : ids.imageHint}
              onChange={addImages}
              className="sr-only"
            />
          </label>
        )}
        <input type="hidden" name={imagesFieldName(fieldKey)} value={JSON.stringify(images.map(toMeta))} />
      </div>
    </section>
  );
}
