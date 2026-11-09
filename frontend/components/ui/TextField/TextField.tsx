import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import styles from "./TextField.module.css";

/* 폼 입력란 공통 모양. 레이블, 입력, 오류 문구를 한 묶음으로 그리고 aria로 잇는다 */

type TextFieldProps = {
  name: string;
  label: string;
  error?: string;
  /** 입력란 아래 도움말 */
  hint?: string;
  multiline?: boolean;
} & Omit<ComponentProps<"input">, "name">;

/** 입력란만. TextField와, 레이블을 따로 그리는 폼이 함께 쓴다 */
export function TextInput({ className, ...props }: ComponentProps<"input">) {
  return <input {...props} className={cn(styles.input, className)} />;
}

export function TextArea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea {...props} className={cn(styles.input, className)} />;
}

/** 레이블과 오류 문구가 붙은 입력란. 오류가 있으면 aria-invalid와 aria-describedby를 단다 */
export function TextField({ id: idProp, name, label, error, hint, multiline, className, ...props }: TextFieldProps) {
  /* 같은 name이 여러 줄이면(추가 링크) id를 따로 받는다 */
  const id = idProp ?? `field-${name}`;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined;
  const shared = { id, name, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy };

  return (
    <div className={cn(styles.root, className)}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {multiline ? (
        <TextArea {...shared} rows={4} defaultValue={props.defaultValue} />
      ) : (
        <TextInput {...shared} {...props} />
      )}
      {hint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}
