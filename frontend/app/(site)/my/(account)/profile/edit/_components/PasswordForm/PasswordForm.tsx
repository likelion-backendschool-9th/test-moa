"use client";

import { type FormEvent, startTransition, useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button/Button";
import { FormField, FormMessage } from "@/components/ui/FormField/FormField";
import type { FormState } from "@/lib/form";
import { PASSWORD_HINT } from "@/features/member/validation";
import { changePassword, type PasswordField } from "@/features/member/actions";
import { SettingsBody, SettingsSection } from "@/components/ui/SettingsCard/SettingsCard";
import { AccountCardTitle } from "@/app/(site)/my/(account)/_components/AccountCard/AccountCard";
import styles from "./PasswordForm.module.css";


const initialState: FormState<PasswordField> = { status: "idle" };

/**
 * 비밀번호 변경. 오류가 나면 입력이 남고, 성공하면 칸을 비운다.
 * hasPassword가 false(소셜로만 가입)면 현재 비밀번호 칸 없이 "비밀번호 만들기"로 보인다
 */
export function PasswordForm({ hasPassword = true }: { hasPassword?: boolean }) {
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
    <SettingsSection aria-labelledby="password-form-heading">
      <div className={styles.box}>
        <AccountCardTitle id="password-form-heading">
          {hasPassword ? "비밀번호 변경" : "비밀번호 만들기"}
        </AccountCardTitle>
        <p className={styles.text}>
          {hasPassword ? "현재 비밀번호를 확인한 뒤 새 비밀번호로 바꿔요." : "비밀번호를 만들면 소셜 계정 없이 이메일로도 로그인할 수 있어요."}
        </p>
      </div>
      <SettingsBody>
        {state.status === "success" && <FormMessage status="success" message={state.message} />}
        {errors.form && <FormMessage status="error" message={errors.form} />}
        {/* JS가 아직 없을 때도 비밀번호가 주소(GET)로 나가지 않게 서버 액션으로 POST 제출한다. JS가 있으면 handleSubmit이 대신 제출한다 */}
        <form ref={formRef} action={formAction} onSubmit={handleSubmit} noValidate className={styles.form}>
          <div className={styles.box2}>
            {hasPassword && (
              <FormField
                id="password-current"
                name="current"
                type="password"
                label="현재 비밀번호"
                autoComplete="current-password"
                error={errors.current}
              />
            )}
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
          <div className={styles.box3}>
            {/* 주 버튼은 기본 정보 "저장" 하나다 (DESIGN.md The One Green Rule) */}
          <Button type="submit" disabled={pending} className={styles.button}>
              {pending ? "저장하는 중…" : hasPassword ? "비밀번호 변경" : "비밀번호 만들기"}
            </Button>
          </div>
        </form>
      </SettingsBody>
    </SettingsSection>
  );
}
