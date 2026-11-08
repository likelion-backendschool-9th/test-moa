"use client";

import { type FormEvent, startTransition, useActionState } from "react";
import { Button } from "@/components/ui/Button/Button";
import { FormField, FormMessage } from "@/components/ui/FormField/FormField";
import type { FormState } from "@/lib/form";
import { socialSignup } from "@/features/auth/actions";
import type { SocialSignupField } from "@/features/auth/types";
import { Agreements } from "../../../_components/Agreements/Agreements";
import { Card } from "@/components/ui/Card/Card";
import styles from "./SocialSignupForm.module.css";

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
    <form action={formAction} onSubmit={handleSubmit} noValidate className={styles.root}>
      {errors.form && <FormMessage status="error" message={errors.form} />}
      <input type="hidden" name="next" value={next} />
      <Card as="dl" radius="lg" className={styles.list}>
        <div className={styles.box}>
          <dt className={styles.term}>이메일</dt>
          <dd className={styles.email}>{email}</dd>
        </div>
        <div className={styles.box2}>
          <dt className={styles.term2}>닉네임</dt>
          <dd className={styles.nickname}>{nickname}</dd>
        </div>
      </Card>
      <FormField
        id="social-signup-name"
        name="name"
        label="이름"
        autoComplete="name"
        hint="크레딧을 출금할 때 예금주 확인에 쓰여요. 실명으로 입력해 주세요"
        error={errors.name}
      />
      <Agreements idPrefix="social-signup" error={errors.agreements} />
      <Button type="submit" disabled={pending} className={styles.button}>
        {pending ? "가입하는 중…" : "가입하기"}
      </Button>
    </form>
  );
}
