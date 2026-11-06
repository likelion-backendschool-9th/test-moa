"use client";

import { type FormEvent, startTransition, useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { submitFeedback, type FeedbackFormState } from "../actions";
import { OTHER_FEEDBACK_KEY } from "../feedback-fields";
import type { FeedbackTestItem } from "../types";
import { FeedbackField } from "./FeedbackField";

const initialState: FeedbackFormState = { status: "idle" };

/**
 * 피드백 작성 폼. 테스트 항목마다 칸이 있고, 그 아래에 기타 의견 칸이 있다. 한 번에 제출한다.
 * 입력 검사는 서버에서 하고, 오류가 나면 입력을 남긴 채 첫 번째 오류 칸으로 포커스를 옮긴다.
 */
export function FeedbackForm({ participationKey, testItems }: { participationKey: string; testItems: FeedbackTestItem[] }) {
  const [state, formAction, pending] = useActionState(submitFeedback.bind(null, participationKey), initialState);
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

  return (
    <form ref={form} onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <p className="text-sm text-text-muted">해 본 일, 써 보며 느낀 점, 발견한 버그를 항목마다 적어 주세요. 버그를 찾지 못했다면 그렇다고 적어도 괜찮아요.</p>

      {/* 모집글 상세의 테스트 항목과 같은 번호와 구분선으로 칸을 나눈다 */}
      <ol className="flex flex-col divide-y divide-line">
        {testItems.map((item, index) => (
          <FeedbackField
            key={item.id}
            fieldKey={item.id}
            number={index + 1}
            title={item.title}
            description={item.description}
            required={item.required}
            error={errors[item.id]}
          />
        ))}
        <FeedbackField fieldKey={OTHER_FEEDBACK_KEY} title="기타 의견" description="항목에 속하지 않는 의견이 있으면 적어 주세요." required={false} error={errors[OTHER_FEEDBACK_KEY]} />
      </ol>

      {formError && (
        <p role="alert" className="text-sm font-semibold">
          {formError}
        </p>
      )}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-text-muted">제출한 뒤에는 고칠 수 없어요.</p>
        <Button type="submit" disabled={pending} className="w-full md:w-auto">
          {pending ? "제출하는 중…" : "피드백 제출"}
        </Button>
      </div>
    </form>
  );
}
