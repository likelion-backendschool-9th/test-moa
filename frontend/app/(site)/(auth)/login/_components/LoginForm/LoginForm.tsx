"use client";

import { type FormEvent, startTransition, useActionState } from "react";
import { Button } from "@/components/ui/Button/Button";
import { FormField, FormMessage } from "@/components/ui/FormField/FormField";
import type { FormState } from "@/lib/form";
import { login } from "@/features/auth/actions";
import type { LoginField } from "@/features/auth/types";
import styles from "./LoginForm.module.css";

const initialState: FormState<LoginField> = { status: "idle" };

/** 이메일 로그인. 성공하면 서버 액션이 next로 보내고, 실패하면 입력이 남는다 */
export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(login, initialState);

  /* React가 폼 액션 뒤 칸을 자동으로 비우지 않게 직접 제출한다 */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  const errors = state.status === "error" ? state.errors : {};
  /* JS가 아직 없을 때도 비밀번호가 주소(GET)로 나가지 않게 서버 액션으로 POST 제출한다. JS가 있으면 handleSubmit이 대신 제출한다 */
  return (
    <form action={formAction} onSubmit={handleSubmit} noValidate className={styles.root}>
      {errors.form && <FormMessage status="error" message={errors.form} />}
      <input type="hidden" name="next" value={next} />
      <div className={styles.box}>
        <FormField id="login-email" name="email" type="email" label="이메일" autoComplete="email" error={errors.email} />
        <FormField
          id="login-password"
          name="password"
          type="password"
          label="비밀번호"
          autoComplete="current-password"
          error={errors.password}
        />
      </div>
      <Button type="submit" disabled={pending} className={styles.button}>
        {pending ? "로그인하는 중…" : "로그인"}
      </Button>
    </form>
  );
}
