"use client";

import { type FormEvent, type ReactNode, startTransition, useActionState, useEffect, useId, useRef } from "react";
import { Button } from "@/components/ui/Button/Button";
import { FormField, FormMessage } from "@/components/ui/FormField/FormField";
import type { FormState } from "@/lib/form";
import { formatCredits } from "@/lib/format";
import { type LeaveField, leaveAccount } from "@/features/member/actions";
import { LEAVE_CONFIRM_TEXT, LEAVE_PENDING_WITHDRAWAL, type LeaveNotice } from "@/features/member/types";
import styles from "./LeaveAccountButton.module.css";

const initialState: FormState<LeaveField> = { status: "idle" };

type LeaveAccountButtonProps = LeaveNotice & {
  /** 여는 버튼의 모양. 기본은 보조 버튼이고, 마이페이지 홈의 계정 목록은 줄 모양을 넘긴다 */
  triggerClassName?: string;
  children?: ReactNode;
};

/**
 * "회원 탈퇴" 버튼과 확인 창(#84, D안). 새 주소 없이 그 자리에서 브라우저 기본 dialog로 열려 Esc 닫기·포커스 가두기·복귀를 브라우저에 맡긴다.
 * 출금 처리 중인 크레딧이 있으면 안내만 보이고 탈퇴할 수 없다. 탈퇴하면 서버 액션이 로그인 화면으로 보낸다
 */
export function LeaveAccountButton({ credits, pendingWithdrawal, hasPassword, triggerClassName, children = "회원 탈퇴" }: LeaveAccountButtonProps) {
  const [state, formAction, pending] = useActionState(leaveAccount, initialState);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const id = useId();
  const blocked = pendingWithdrawal > 0;
  const field = hasPassword ? "password" : "confirmText";

  /* 입력이 틀리면 칸으로 포커스를 옮긴다 */
  useEffect(() => {
    if (state.status === "error" && state.errors[field]) dialogRef.current?.querySelector<HTMLInputElement>(`input[name=${field}]`)?.focus();
  }, [state, field]);

  /* React가 폼 액션 뒤 칸을 자동으로 비우지 않게 직접 제출한다 */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  const open = () => dialogRef.current?.showModal();
  const close = () => dialogRef.current?.close();
  const errors = state.status === "error" ? state.errors : {};
  return (
    <>
      {triggerClassName ? (
        <button type="button" className={triggerClassName} onClick={open}>
          {children}
        </button>
      ) : (
        <Button type="button" variant="secondary" onClick={open}>
          {children}
        </Button>
      )}
      <dialog
        ref={dialogRef}
        aria-labelledby={`${id}-title`}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
        className={styles.dialog}
      >
        <form action={formAction} onSubmit={handleSubmit} noValidate className={styles.form}>
          <div className={styles.head}>
            <h2 id={`${id}-title`} className={styles.title}>
              회원 탈퇴할까요?
            </h2>
            <ul className={styles.notes}>
              <li>30일 안에 다시 로그인하면 되돌릴 수 있어요.</li>
              <li>30일이 지나면 개인정보가 전부 사라지고 되돌릴 수 없어요.</li>
              <li>
                남은 <span className={styles.credits}>{formatCredits(credits)}</span>은 사라져요.
              </li>
            </ul>
          </div>
          {blocked ? (
            <FormMessage status="error" message={LEAVE_PENDING_WITHDRAWAL} />
          ) : (
            <>
              {errors.form && <FormMessage status="error" message={errors.form} />}
              {hasPassword ? (
                <FormField
                  id={`${id}-password`}
                  name="password"
                  type="password"
                  label="비밀번호"
                  autoComplete="current-password"
                  hint="본인 확인을 위해 지금 비밀번호를 입력해 주세요"
                  error={errors.password}
                />
              ) : (
                <FormField
                  id={`${id}-confirm`}
                  name="confirmText"
                  label="확인 문구"
                  autoComplete="off"
                  hint={`본인 확인을 위해 '${LEAVE_CONFIRM_TEXT}'를 입력해 주세요`}
                  error={errors.confirmText}
                />
              )}
            </>
          )}
          <div className={styles.actions}>
            <Button type="button" variant="ghost" size="sm" onClick={close}>
              취소
            </Button>
            {!blocked && (
              <Button type="submit" variant="strong" size="sm" disabled={pending}>
                {pending ? "탈퇴하는 중…" : "탈퇴하기"}
              </Button>
            )}
          </div>
        </form>
      </dialog>
    </>
  );
}
