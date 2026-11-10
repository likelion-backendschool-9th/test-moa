"use client";

import { type FormEvent, startTransition, useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button/Button";
import { submitFeedback, type FeedbackFormState } from "@/features/participation/actions";
import { imageUrlsFieldName, OTHER_FEEDBACK_KEY, parseFeedbackForm } from "@/features/participation/feedback-fields";
import { feedbackImageUploadPath, isFeedbackImageUrl } from "@/features/participation/feedback-images";
import { uploadImages } from "@/lib/image-upload";
import type { FeedbackTestItem } from "@/features/participation/types";
import { FeedbackField, type PickedImage } from "../FeedbackField/FeedbackField";
import styles from "./FeedbackForm.module.css";

const initialState: FeedbackFormState = { status: "idle" };
const NO_IMAGES: PickedImage[] = [];

/**
 * 피드백 작성 폼. 테스트 항목마다 칸이 있고, 그 아래에 기타 의견 칸이 있다. 한 번에 제출한다.
 * 백엔드 모드에서는 글 입력을 먼저 검사한 뒤 칸 순서대로 이미지를 올리고, 서버 액션에는 주소만 넘긴다.
 * 입력 검사는 서버에서 하고, 오류가 나면 입력을 남긴 채 첫 번째 오류 칸으로 포커스를 옮긴다.
 */
export function FeedbackForm({
  participationKey,
  testItems,
  uploadEnabled,
}: {
  participationKey: string;
  testItems: FeedbackTestItem[];
  uploadEnabled: boolean;
}) {
  const [images, setImages] = useState<Record<string, PickedImage[]>>({});
  const imagesRef = useRef(images);
  const uploaded = useRef(new WeakMap<File, string>());
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);
  const [state, formAction, pending] = useActionState(
    async (prev: FeedbackFormState, data: FormData): Promise<FeedbackFormState> => {
      if (uploadEnabled) {
        const parsed = parseFeedbackForm(testItems, data);
        if (Object.keys(parsed.errors).length > 0) return { status: "error", errors: parsed.errors };
        const keys = [...testItems.map((item) => item.id), OTHER_FEEDBACK_KEY];
        for (const key of keys) {
          try {
            const urls = await uploadImages(imagesRef.current[key] ?? NO_IMAGES, feedbackImageUploadPath(participationKey), uploaded.current, isFeedbackImageUrl);
            data.set(imageUrlsFieldName(key), JSON.stringify(urls));
          } catch (error) {
            const message = error instanceof Error ? error.message : "이미지를 다시 올려 주세요";
            return { status: "error", errors: { [key]: message } };
          }
        }
      }
      return submitFeedback(participationKey, prev, data);
    },
    initialState,
  );
  const form = useRef<HTMLFormElement>(null);
  const errors = state.status === "error" ? state.errors : {};
  const formError = state.status === "error" ? state.error : undefined;

  useEffect(() => {
    if (state.status === "error") form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [state]);

  /* React가 폼 액션 뒤 칸을 비우지 않게 직접 제출한다 */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  function changeImages(key: string, next: PickedImage[]) {
    setImages((prev) => ({ ...prev, [key]: next }));
  }

  return (
    <form ref={form} onSubmit={handleSubmit} noValidate aria-busy={pending} inert={pending} className={styles.root}>
      <p className={styles.text}>해 본 일, 써 보며 느낀 점, 발견한 버그를 항목마다 적어 주세요. 버그를 찾지 못했다면 그렇다고 적어도 괜찮아요.</p>

      {/* 모집글 상세의 테스트 항목과 같은 번호와 구분선으로 칸을 나눈다 */}
      <ol className={styles.list}>
        {testItems.map((item, index) => (
          <FeedbackField
            key={item.id}
            fieldKey={item.id}
            number={index + 1}
            title={item.title}
            description={item.description}
            required={item.required}
            error={errors[item.id]}
            images={images[item.id] ?? NO_IMAGES}
            onImagesChange={(next) => changeImages(item.id, next)}
          />
        ))}
        <FeedbackField
          fieldKey={OTHER_FEEDBACK_KEY}
          title="기타 의견"
          description="항목에 속하지 않는 의견이 있으면 적어 주세요."
          required={false}
          error={errors[OTHER_FEEDBACK_KEY]}
          images={images[OTHER_FEEDBACK_KEY] ?? NO_IMAGES}
          onImagesChange={(next) => changeImages(OTHER_FEEDBACK_KEY, next)}
        />
      </ol>

      {formError && (
        <p role="alert" className={styles.formError}>
          {formError}
        </p>
      )}
      <div className={styles.box}>
        <p className={styles.text2}>제출한 뒤에는 고칠 수 없어요.</p>
        <Button type="submit" disabled={pending} className={styles.button}>
          {pending ? "제출하는 중…" : "피드백 제출"}
        </Button>
      </div>
    </form>
  );
}
