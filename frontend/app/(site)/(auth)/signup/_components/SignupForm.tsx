"use client";

import { type FormEvent, startTransition, useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { FormField, FormMessage } from "@/components/ui/FormField";
import type { FormState } from "@/lib/form";
import { NICKNAME_HINT, PASSWORD_HINT } from "@/features/member/validation";
import { signup } from "../../../../../features/auth/actions";
import { Agreements } from "./Agreements";
import type { SignupField } from "../../../../../features/auth/types";

const initialState: FormState<SignupField> = { status: "idle" };

/** 회원가입. 검사는 서버에서 하고, 실패하면 칸과 체크 상태가 남는다. 성공하면 서버 액션이 로그인 화면으로 보낸다 */
export function SignupForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(signup, initialState);

  /* React가 폼 액션 뒤 칸을 자동으로 비우지 않게 직접 제출한다 */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  const errors = state.status === "error" ? state.errors : {};
  /* JS가 아직 없을 때도 비밀번호가 주소(GET)로 나가지 않게 서버 액션으로 POST 제출한다. JS가 있으면 handleSubmit이 대신 제출한다 */
  return (
    <form action={formAction} onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      {/* 칸에 붙지 않는 오류(백엔드 연결 실패·시간 초과·서버 오류) */}
      {errors.form && <FormMessage status="error" message={errors.form} />}
      <input type="hidden" name="next" value={next} />
      <div className="flex flex-col gap-5">
        <FormField id="signup-name" name="name" label="이름" autoComplete="name" error={errors.name} />
        <FormField id="signup-nickname" name="nickname" label="닉네임" autoComplete="nickname" hint={NICKNAME_HINT} error={errors.nickname} />
        <FormField id="signup-email" name="email" type="email" label="이메일" autoComplete="email" error={errors.email} />
        <FormField
          id="signup-password"
          name="password"
          type="password"
          label="비밀번호"
          autoComplete="new-password"
          hint={PASSWORD_HINT}
          error={errors.password}
        />
        <FormField
          id="signup-confirm"
          name="confirm"
          type="password"
          label="비밀번호 확인"
          autoComplete="new-password"
          error={errors.confirm}
        />
      </div>
      <Agreements idPrefix="signup" error={errors.agreements} />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "가입하는 중…" : "가입하기"}
      </Button>
    </form>
  );
}
