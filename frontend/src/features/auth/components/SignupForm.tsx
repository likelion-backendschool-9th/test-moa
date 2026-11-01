"use client";

import { WarningCircleIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { type FormEvent, startTransition, useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import type { FormState } from "@/lib/form";
import { NICKNAME_HINT, PASSWORD_HINT } from "@/lib/validation";
import { signup } from "../actions";
import type { SignupField } from "../types";

const initialState: FormState<SignupField> = { status: "idle" };

const AGREEMENTS = [
  { name: "terms", label: "이용약관", href: "/terms" },
  { name: "privacy", label: "개인정보처리방침", href: "/privacy" },
] as const;

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
  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
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
      <fieldset aria-describedby={errors.agreements ? "signup-agreements-error" : undefined} className="flex flex-col gap-3 px-4">
        <legend className="sr-only">약관 동의</legend>
        {AGREEMENTS.map((agreement) => (
          <div key={agreement.name} className="flex items-center gap-3 text-sm">
            <input
              id={`signup-${agreement.name}`}
              name={agreement.name}
              type="checkbox"
              aria-invalid={errors.agreements ? true : undefined}
              className="size-5 shrink-0 accent-accent"
            />
            <label htmlFor={`signup-${agreement.name}`} className="font-semibold">
              {agreement.label} 동의(필수)
            </label>
            {/* 좁은 화면에서 줄이 넘치지 않게 보이는 글자는 "보기"만, 읽는 이름은 문서 이름까지 */}
            <Link
              href={agreement.href}
              target="_blank"
              aria-label={`${agreement.label} 보기`}
              className="ml-auto shrink-0 text-text-muted underline underline-offset-4"
            >
              보기
            </Link>
          </div>
        ))}
        {errors.agreements && (
          <p id="signup-agreements-error" className="flex items-center gap-1 text-sm font-semibold">
            <WarningCircleIcon aria-hidden size={16} weight="bold" />
            {errors.agreements}
          </p>
        )}
      </fieldset>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "가입하는 중…" : "가입하기"}
      </Button>
    </form>
  );
}
