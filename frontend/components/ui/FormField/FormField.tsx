import { WarningCircleIcon } from "@phosphor-icons/react/ssr";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import styles from "./FormField.module.css";

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
    <div className={styles.root}>
      <label htmlFor={id} className={cn(styles.insetText, styles.label)}>
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={styles.input}
        {...inputProps}
      />
      {error ? (
        <p id={`${id}-error`} className={cn(styles.insetText, styles.text)}>
          <WarningCircleIcon aria-hidden size={16} weight="bold" />
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className={cn(styles.insetText, styles.hint)}>
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
      <p role="status" className={styles.formMessage}>
        {message}
      </p>
    );
  }
  return (
    <p role="alert" className={cn(styles.insetText, styles.formMessage2)}>
      <WarningCircleIcon aria-hidden size={16} weight="bold" />
      {message}
    </p>
  );
}
