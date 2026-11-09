import type { ChangeEvent, ReactNode } from "react";
import styles from "./FileField.module.css";

/** 미리보기에 쓴 blob 주소를 놓는다. 프로젝트·모집 작성 폼이 같이 쓴다 */
export function revoke(url: string) {
  if (url.startsWith("blob:")) URL.revokeObjectURL(url);
}

type FileFieldProps = {
  name: string;
  label: string;
  accept: string;
  hint: string;
  error?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  buttonLabel: string;
  multiple?: boolean;
  children?: ReactNode;
};

/**
 * 파일 고르기 칸. 브라우저 기본 버튼은 언어를 바꿀 수 없어 입력란을 숨기고 라벨을 버튼처럼 그린다. 파일은 제출 시 따로 업로드하므로 input에 name을 달지 않는다.
 * 고른 이미지(children)는 입력란 아래에 그린다.
 */
export function FileField({ name, label, accept, hint, error, onChange, buttonLabel, multiple = false, children }: FileFieldProps) {
  const id = `field-${name}`;
  const describedBy = [`${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ");
  return (
    <div className={styles.root}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <input
        id={id}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={onChange}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={styles.input}
      />
      <label
        htmlFor={id}
        className={styles.button}
      >
        {buttonLabel}
      </label>
      <p id={`${id}-hint`} className={styles.hint}>
        {hint}
      </p>
      {error && (
        <p id={`${id}-error`} className={styles.error}>
          {error}
        </p>
      )}
      {children}
    </div>
  );
}

