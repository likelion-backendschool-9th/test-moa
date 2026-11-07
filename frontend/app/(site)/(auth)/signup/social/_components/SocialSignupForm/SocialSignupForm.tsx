"use client";

import { type FormEvent, startTransition, useActionState } from "react";
import { Button } from "@/components/ui/Button/Button";
import { FormField, FormMessage } from "@/components/ui/FormField/FormField";
import type { FormState } from "@/lib/form";
import { socialSignup } from "@/features/auth/actions";
import type { SocialSignupField } from "@/features/auth/types";
import { Agreements } from "../../../_components/Agreements/Agreements";

const initialState: FormState<SocialSignupField> = { status: "idle" };

/** 소셜 가입 마무리. 이메일·닉네임은 제공자 정보로 정해져 보여 주기만 하고, 이름과 약관 동의만 받는다 */
export function SocialSignupForm({ email, nickname, next }: { email: string; nickname: string; next: string }) {
  const [state, formAction, pending] = useActionState(socialSignup, initialState);

  /* React가 폼 액션 뒤 칸을 자동으로 비우지 않게 직접 제출한다 */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  const errors = state.status === "error" ? state.errors : {};
  return (
    <form action={formAction} onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      {errors.form && <FormMessage status="error" message={errors.form} />}
      <input type="hidden" name="next" value={next} />
      <dl className="flex flex-col gap-3 rounded-lg bg-surface-muted px-4 py-3 text-sm">
        <div className="flex flex-wrap gap-x-3">
          <dt className="text-text-muted">이메일</dt>
          <dd className="font-semibold break-all">{email}</dd>
        </div>
        <div className="flex flex-wrap gap-x-3">
          <dt className="text-text-muted">닉네임</dt>
          <dd className="font-semibold break-all">{nickname}</dd>
        </div>
      </dl>
      <FormField
        id="social-signup-name"
        name="name"
        label="이름"
        autoComplete="name"
        hint="크레딧을 출금할 때 예금주 확인에 쓰여요. 실명으로 입력해 주세요"
        error={errors.name}
      />
      <Agreements idPrefix="social-signup" error={errors.agreements} />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "가입하는 중…" : "가입하기"}
      </Button>
    </form>
  );
}
