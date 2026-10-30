import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/* 폼 입력란 공통 모양. 레이블, 입력, 오류 문구를 한 묶음으로 그리고 aria로 잇는다 */

type TextFieldProps = {
  name: string;
  label: string;
  error?: string;
  /** 입력란 아래 도움말 */
  hint?: string;
  multiline?: boolean;
} & Omit<ComponentProps<"input">, "name">;

export const inputClass =
  "w-full rounded-xl bg-surface-strong px-4 py-3 text-base transition-colors duration-300 ease-brand focus:bg-surface-muted aria-invalid:ring-2 aria-invalid:ring-text";

/** 레이블과 오류 문구가 붙은 입력란. 오류가 있으면 aria-invalid와 aria-describedby를 단다 */
export function TextField({ name, label, error, hint, multiline, className, ...props }: TextFieldProps) {
  const id = `field-${name}`;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined;
  const shared = { id, name, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className="text-sm font-bold">
        {label}
      </label>
      {multiline ? (
        <textarea {...shared} rows={4} defaultValue={props.defaultValue} className={inputClass} />
      ) : (
        <input {...shared} {...props} className={inputClass} />
      )}
      {hint && (
        <p id={hintId} className="text-xs text-text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm font-semibold">
          {error}
        </p>
      )}
    </div>
  );
}
