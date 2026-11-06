"use client";

import { type FormEvent, startTransition, useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { FormField, FormMessage } from "@/components/ui/FormField";
import type { FormState } from "@/lib/form";
import { PASSWORD_HINT } from "@/features/member/validation";
import { changePassword, type PasswordField } from "../../../../../../../features/member/actions";
import { cardTitleClass, settingsBodyClass, settingsSectionClass } from "../../../_components/card-styles";


const initialState: FormState<PasswordField> = { status: "idle" };

/** 비밀번호 변경. 오류가 나면 입력이 남고, 성공하면 세 칸을 비운다 */
export function PasswordForm() {
  const [state, formAction, pending] = useActionState(changePassword, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  /* 성공한 제출마다 한 번만 칸을 비운다. 오류 응답에서는 폼을 건드리지 않아 입력이 남는다 */
  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  /* React가 폼 액션 뒤 칸을 자동으로 비우지 않게 직접 제출한다 */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  const errors = state.status === "error" ? state.errors : {};
  return (
    <section aria-labelledby="password-form-heading" className={settingsSectionClass}>
      <div className="flex flex-col gap-1">
        <h2 id="password-form-heading" className={cardTitleClass}>
          비밀번호 변경
        </h2>
        <p className="text-sm text-text-muted">현재 비밀번호를 확인한 뒤 새 비밀번호로 바꿔요.</p>
      </div>
      <div className={settingsBodyClass}>
        {state.status === "success" && <FormMessage status="success" message={state.message} />}
        {/* JS가 아직 없을 때도 비밀번호가 주소(GET)로 나가지 않게 서버 액션으로 POST 제출한다. JS가 있으면 handleSubmit이 대신 제출한다 */}
        <form ref={formRef} action={formAction} onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
          <div className="flex flex-col gap-5">
            <FormField
              id="password-current"
              name="current"
              type="password"
              label="현재 비밀번호"
              autoComplete="current-password"
              error={errors.current}
            />
            <FormField
              id="password-next"
              name="next"
              type="password"
              label="새 비밀번호"
              autoComplete="new-password"
              hint={PASSWORD_HINT}
              error={errors.next}
            />
            <FormField
              id="password-confirm"
              name="confirm"
              type="password"
              label="새 비밀번호 확인"
              autoComplete="new-password"
              error={errors.confirm}
            />
          </div>
          <div className="flex md:justify-end">
            {/* 주 버튼은 기본 정보 "저장" 하나다 (DESIGN.md The One Green Rule) */}
          <Button type="submit" variant="secondary" disabled={pending} className="w-full md:w-auto">
              {pending ? "바꾸는 중…" : "비밀번호 변경"}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
