"use client";

import { useActionState, useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/LinkButton";
import { saveProject } from "../actions";
import { checkImages, formatBytes, type FileMeta } from "../media";
import { EMPTY_FORM_STATE, PROJECT_MEDIA_LIMIT, type FormState, type ProjectImage } from "../types";
import { FormSection } from "./FormSection";
import { ProjectBody } from "./ProjectDetail";
import { TextField } from "./TextField";

/*
 * 프로젝트 등록·수정 폼과 미리보기. 검증은 서버 액션이 하고, 오류가 오면 첫 오류 칸으로 포커스를 옮긴다.
 * 이미지는 고를 때 바로 한도를 확인하고, 서버에는 이름·크기·형식만 보낸다(media.ts).
 * 등록 버튼 옆 "미리보기"를 누르면 지금 적은 내용을 상세 화면과 같은 모양(ProjectBody)으로 대화상자에 보여 준다.
 * 대화상자는 기본 dialog를 써서 Esc 닫기와 포커스 복귀를 브라우저에 맡긴다.
 */

type ProjectFormProps = {
  /** 수정이면 프로젝트 키, 등록이면 null */
  projectKey: string | null;
  /** 수정할 때 채워 둘 값 */
  initialValues?: Record<string, string>;
  initialImage?: ProjectImage | null;
  cancelHref: string;
};

/** 고른 이미지. 새로 고른 파일은 브라우저 임시 주소(blob:)로 보여 준다 */
type ImageItem = FileMeta & { url: string };

const TEXT_FIELDS = ["name", "description"] as const;

/** 폼에 지금 적힌 글자 값을 읽는다. 미리보기에 쓴다 */
function readDraft(form: HTMLFormElement) {
  const data = new FormData(form);
  return Object.fromEntries(TEXT_FIELDS.map((name) => [name, String(data.get(name) ?? "")]));
}

/** 프로젝트 등록·수정 폼 */
export function ProjectForm({
  projectKey,
  initialValues = {},
  initialImage = null,
  cancelHref,
}: ProjectFormProps) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    saveProject.bind(null, projectKey),
    EMPTY_FORM_STATE,
  );
  const formRef = useFocusFirstError(state);
  const previewRef = useRef<HTMLDialogElement>(null);
  const values: Record<string, string> = { ...initialValues, ...state.values };

  const [draft, setDraft] = useState<Record<string, string>>(values);
  const [image, setImage] = useState<ImageItem | null>(initialImage && { ...initialImage, size: 0, type: "image/png" });
  const [fileErrors, setFileErrors] = useState<{ images?: string }>({});
  function pickImage(event: ChangeEvent<HTMLInputElement>) {
    const [file] = event.target.files ?? [];
    event.target.value = "";
    if (!file) return;
    const error = checkImages([file]);
    setFileErrors((prev) => ({ ...prev, images: error }));
    if (error) return;
    if (image) revoke(image.url);
    setImage({ name: file.name, size: file.size, type: file.type, url: URL.createObjectURL(file) });
  }

  function removeImage() {
    if (image) revoke(image.url);
    setImage(null);
    setFileErrors((prev) => ({ ...prev, images: undefined }));
  }

  const toMeta = ({ name, size, type }: FileMeta) => ({ name, size, type });
  const imageError = fileErrors.images ?? state.errors.images;

  /** 지금 적은 값을 읽어 미리보기를 연다 */
  function openPreview() {
    if (formRef.current) setDraft(readDraft(formRef.current));
    previewRef.current?.showModal();
  }

  return (
    <>
      <form ref={formRef} action={formAction} noValidate className="flex max-w-2xl flex-col gap-6">
        <FormSection title="프로젝트 정보">
        <TextField name="name" label="프로젝트 이름" defaultValue={values.name} error={state.errors.name} hint="50자까지" />
        <TextField
          name="description"
          label="상세 설명 (선택)"
          multiline
          defaultValue={values.description}
          error={state.errors.description}
          hint={`어떤 서비스인지, 이번에 무엇을 보고 싶은지 적어 주세요. ${PROJECT_MEDIA_LIMIT.descriptionLength}자까지`}
        />

        <FileField
          name="images"
          label="대표 이미지 (선택)"
          accept={PROJECT_MEDIA_LIMIT.images.types.join(",")}
          hint={`PNG, JPG, WEBP · ${formatBytes(PROJECT_MEDIA_LIMIT.images.bytes)}까지 · 다시 고르면 바뀌어요 · 없으면 기본 이미지가 보여요`}
          error={imageError}
          onChange={pickImage}
          buttonLabel={image ? "이미지 바꾸기" : "이미지 고르기"}
        >
          {image && (
            <div data-testid="image-item" className="flex w-32 flex-col gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.url} alt={image.name} className="aspect-square w-full rounded-xl bg-surface-muted object-cover outline -outline-offset-1 outline-line" />
              <button
                type="button"
                onClick={removeImage}
                aria-label={`${image.name} 삭제`}
                className="text-xs font-semibold text-text-muted hover:text-text"
              >
                삭제
              </button>
            </div>
          )}
        </FileField>

        </FormSection>

        <input type="hidden" name="imagesMeta" value={JSON.stringify(image ? [toMeta(image)] : [])} />

        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {projectKey ? "저장" : "등록"}
          </Button>
          <Button type="button" variant="secondary" onClick={openPreview}>
            미리보기
          </Button>
          <LinkButton href={cancelHref} variant="secondary">
            취소
          </LinkButton>
        </div>
      </form>

      <dialog
        ref={previewRef}
        aria-labelledby="preview-heading"
        className="m-auto w-full max-w-2xl rounded-2xl bg-surface p-6 text-text backdrop:bg-text/50"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id="preview-heading" className="text-xl font-extrabold tracking-[-0.03em]">
              미리보기
            </h2>
            <p className="text-sm text-text-muted">프로젝트 상세에서 이렇게 보여요</p>
          </div>
          <Button type="button" size="sm" variant="secondary" onClick={() => previewRef.current?.close()}>
            닫기
          </Button>
        </div>
        <Card data-testid="project-preview">
          <ProjectBody
            titleAs="h3"
            project={{
              name: draft.name,
              description: draft.description,
              image,
            }}
          />
        </Card>
      </dialog>
    </>
  );
}

/**
 * 브라우저 임시 주소면 풀어 준다. 저장된 이미지 주소는 그대로 둔다.
 * 이미지를 바꾸거나 지울 때만 부른다. Cache Components는 화면을 떠나도 상태를 남겨 뒤로 오면 같은 주소를 다시 쓰고, 남은 주소는 탭을 닫을 때 브라우저가 푼다.
 */
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
 * 파일 고르기 칸. 브라우저 기본 버튼은 언어를 바꿀 수 없어 입력란을 숨기고 라벨을 버튼처럼 그린다. 시연용이라 파일은 폼으로 보내지 않아서 input에 name을 달지 않는다.
 * 고른 이미지(children)는 입력란 아래에 그린다.
 */
export function FileField({ name, label, accept, hint, error, onChange, buttonLabel, multiple = false, children }: FileFieldProps) {
  const id = `field-${name}`;
  const describedBy = [`${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ");
  return (
    <div className="flex flex-col gap-3">
      <label htmlFor={id} className="text-sm font-bold">
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
        className="peer sr-only"
      />
      <label
        htmlFor={id}
        className="w-fit cursor-pointer rounded-full bg-surface-strong px-4 py-2 text-sm font-bold hover:bg-line peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"
      >
        {buttonLabel}
      </label>
      <p id={`${id}-hint`} className="text-xs text-text-muted">
        {hint}
      </p>
      {error && (
        <p id={`${id}-error`} className="text-sm font-semibold">
          {error}
        </p>
      )}
      {children}
    </div>
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
