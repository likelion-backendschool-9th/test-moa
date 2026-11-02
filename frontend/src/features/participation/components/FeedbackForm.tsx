"use client";

import { type FormEvent, startTransition, useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/features/project/components/TextField";
import { submitFeedback, type FeedbackFormState } from "../actions";
import { FEEDBACK_MAX_LENGTH } from "../types";

const initialState: FeedbackFormState = { status: "idle" };

/** 피드백 작성 폼. 입력 검사는 서버에서 하고, 오류가 나면 입력을 남긴 채 칸으로 포커스를 옮긴다 */
export function FeedbackForm({ participationKey }: { participationKey: string }) {
  const [state, formAction, pending] = useActionState(submitFeedback.bind(null, participationKey), initialState);
  const [content, setContent] = useState("");
  const field = useRef<HTMLTextAreaElement>(null);
  const error = state.status === "error" ? state.error : undefined;

  useEffect(() => {
    if (state.status === "error") field.current?.focus();
  }, [state]);

  /* React가 폼 액션 뒤 칸을 비우지 않게 직접 제출한다 */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
      <label htmlFor="feedback-content" className="text-sm font-bold">
        내용
      </label>
      <p id="feedback-hint" className="text-sm text-text-muted">
        해 본 일, 써 보며 느낀 점, 발견한 버그를 적어 주세요. 버그를 찾지 못했다면 그렇다고 적어도 괜찮아요.
      </p>
      <textarea
        ref={field}
        id="feedback-content"
        name="content"
        rows={8}
        maxLength={FEEDBACK_MAX_LENGTH}
        value={content}
        onChange={(event) => setContent(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "feedback-hint feedback-error" : "feedback-hint"}
        className={inputClass}
      />
      <div className="flex items-start justify-between gap-4">
        {error ? (
          <p id="feedback-error" className="text-sm font-semibold">
            {error}
          </p>
        ) : (
          <span />
        )}
        <span className="shrink-0 text-xs text-text-muted tabular-nums">
          {content.length} / {FEEDBACK_MAX_LENGTH}자
        </span>
      </div>
      <div className="flex flex-col gap-3 pt-2 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-text-muted">제출한 뒤에는 고칠 수 없어요.</p>
        <Button type="submit" disabled={pending} className="w-full md:w-auto">
          {pending ? "제출하는 중…" : "피드백 제출"}
        </Button>
      </div>
    </form>
  );
}
