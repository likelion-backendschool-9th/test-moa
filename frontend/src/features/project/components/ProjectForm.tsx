"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { LinkButton } from "@/components/ui/LinkButton";
import { SOFTWARE_TYPE_LABEL, SOFTWARE_TYPES } from "@/features/recruitment/types";
import { saveProject } from "../actions";
import { EMPTY_FORM_STATE, type FormState } from "../types";
import { TextField } from "./TextField";

/* 프로젝트 등록·수정 폼. 검증은 서버 액션이 하고, 오류가 오면 첫 오류 칸으로 포커스를 옮긴다 */

type ProjectFormProps = {
  /** 수정이면 프로젝트 키, 등록이면 null */
  projectKey: string | null;
  /** 수정할 때 채워 둘 값 */
  initialValues?: Record<string, string>;
  cancelHref: string;
};

/** 프로젝트 등록·수정 폼 */
export function ProjectForm({ projectKey, initialValues = {}, cancelHref }: ProjectFormProps) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    saveProject.bind(null, projectKey),
    EMPTY_FORM_STATE,
  );
  const formRef = useFocusFirstError(state);
  const values: Record<string, string> = { softwareType: "web", ...initialValues, ...state.values };

  return (
    <form ref={formRef} action={formAction} noValidate className="flex max-w-2xl flex-col gap-6">
      <TextField name="name" label="프로젝트 이름" defaultValue={values.name} error={state.errors.name} hint="50자까지" />
      <TextField name="summary" label="한 줄 소개" defaultValue={values.summary} error={state.errors.summary} hint="100자까지" />
      <fieldset
        className="flex flex-col gap-2"
        aria-describedby={state.errors.softwareType ? "field-softwareType-error" : undefined}
      >
        <legend className="mb-2 text-sm font-bold">유형</legend>
        <div className="flex flex-wrap gap-2">
          {SOFTWARE_TYPES.map((type) => {
            const ready = type === "web";
            return (
              <label
                key={type}
                className="flex items-center gap-2 rounded-full bg-surface-strong px-4 py-2 text-sm font-bold has-disabled:text-text-muted"
              >
                <input
                  type="radio"
                  name="softwareType"
                  value={type}
                  defaultChecked={values.softwareType === type}
                  disabled={!ready}
                  className="accent-accent"
                />
                {SOFTWARE_TYPE_LABEL[type]}
                {!ready && <span className="text-xs font-medium">준비 중</span>}
              </label>
            );
          })}
        </div>
        {state.errors.softwareType && (
          <p id="field-softwareType-error" className="text-sm font-semibold">
            {state.errors.softwareType}
          </p>
        )}
      </fieldset>
      <TextField
        name="accessUrl"
        label="접속 링크"
        type="url"
        inputMode="url"
        placeholder="https://"
        defaultValue={values.accessUrl}
        error={state.errors.accessUrl}
        hint="테스터가 이 주소로 접속해요"
      />
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {projectKey ? "저장" : "등록"}
        </Button>
        <LinkButton href={cancelHref} variant="secondary">
          취소
        </LinkButton>
      </div>
    </form>
  );
}

/** 서버 검증 결과가 바뀌면 첫 오류 칸으로 포커스를 옮긴다. 모집 작성 폼도 같이 쓴다 */
export function useFocusFirstError(state: FormState) {
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [state]);
  return formRef;
}
