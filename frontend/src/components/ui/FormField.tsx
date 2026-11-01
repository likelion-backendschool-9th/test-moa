import { WarningCircleIcon } from "@phosphor-icons/react/ssr";
import type { ComponentProps } from "react";

/*
 * 회원 정보 폼(로그인·회원가입·개인정보 수정)의 칸. 금액 폼이 아니라 검색창과 같은 알약 모양이고 높이는 3rem이다.
 * 라벨·안내·오류는 입력 글자와 같은 안쪽 여백(1rem)에서 시작한다
 */
const inputClass =
  "h-12 w-full rounded-full bg-surface-strong px-4 text-base outline-none focus:bg-surface-muted focus:ring-2 focus:ring-accent aria-invalid:ring-2 aria-invalid:ring-text read-only:text-text-muted read-only:focus:ring-0";
const insetTextClass = "px-4 text-sm";

type FormFieldProps = Omit<ComponentProps<"input">, "id" | "className"> & {
  id: string;
  label: string;
  error?: string;
  hint?: string;
};

/** 라벨·입력·안내·오류 한 묶음. 오류가 있으면 안내 대신 오류를 읽어 준다 */
export function FormField({ id, label, error, hint, ...inputProps }: FormFieldProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className={`${insetTextClass} font-semibold`}>
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={inputClass}
        {...inputProps}
      />
      {error ? (
        <p id={`${id}-error`} className={`${insetTextClass} flex items-center gap-1 font-semibold`}>
          <WarningCircleIcon aria-hidden size={16} weight="bold" />
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className={`${insetTextClass} text-text-muted`}>
            {hint}
          </p>
        )
      )}
    </div>
  );
}

/** 폼 전체에 대한 결과. 성공은 강조색 면, 실패는 굵은 글씨 */
export function FormMessage({ status, message }: { status: "success" | "error"; message: string }) {
  if (status === "success") {
    return (
      <p role="status" className="rounded-2xl bg-accent-soft px-4 py-3 text-sm font-semibold text-accent">
        {message}
      </p>
    );
  }
  return (
    <p role="alert" className={`${insetTextClass} flex items-center gap-1 font-semibold`}>
      <WarningCircleIcon aria-hidden size={16} weight="bold" />
      {message}
    </p>
  );
}
