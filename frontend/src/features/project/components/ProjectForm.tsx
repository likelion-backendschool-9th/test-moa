"use client";

import { useActionState, useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/LinkButton";
import { SOFTWARE_TYPE_LABEL, SOFTWARE_TYPES, type SoftwareType } from "@/features/recruitment/types";
import { saveProject } from "../actions";
import { checkAttachments, checkImages, formatBytes, type FileMeta } from "../media";
import { EMPTY_FORM_STATE, PROJECT_MEDIA_LIMIT, type FormState, type ProjectFile, type ProjectImage, type ProjectLink } from "../types";
import { ProjectBody } from "./ProjectDetail";
import { TextField } from "./TextField";

/*
 * 프로젝트 등록·수정 폼과 미리보기. 검증은 서버 액션이 하고, 오류가 오면 첫 오류 칸으로 포커스를 옮긴다.
 * 이미지·첨부파일은 고를 때 바로 한도를 확인하고, 서버에는 이름·크기·형식만 보낸다(media.ts).
 * 등록 버튼 옆 "미리보기"를 누르면 지금 적은 내용을 상세 화면과 같은 모양(ProjectBody)으로 대화상자에 보여 준다.
 * 대화상자는 기본 dialog를 써서 Esc 닫기와 포커스 복귀를 브라우저에 맡긴다.
 */

type ProjectFormProps = {
  /** 수정이면 프로젝트 키, 등록이면 null */
  projectKey: string | null;
  /** 수정할 때 채워 둘 값 */
  initialValues?: Record<string, string>;
  initialImages?: ProjectImage[];
  initialLinks?: ProjectLink[];
  initialAttachments?: ProjectFile[];
  cancelHref: string;
};

/** 고른 이미지. 새로 고른 파일은 브라우저 임시 주소(blob:)로 보여 준다 */
type ImageItem = FileMeta & { url: string };

const TEXT_FIELDS = ["name", "summary", "softwareType", "accessUrl", "description"] as const;

/** 폼에 지금 적힌 글자 값을 읽는다. 미리보기에 쓴다 */
function readDraft(form: HTMLFormElement) {
  const data = new FormData(form);
  return Object.fromEntries(TEXT_FIELDS.map((name) => [name, String(data.get(name) ?? "")]));
}

/** 프로젝트 등록·수정 폼 */
export function ProjectForm({
  projectKey,
  initialValues = {},
  initialImages = [],
  initialLinks = [],
  initialAttachments = [],
  cancelHref,
}: ProjectFormProps) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    saveProject.bind(null, projectKey),
    EMPTY_FORM_STATE,
  );
  const formRef = useFocusFirstError(state);
  const previewRef = useRef<HTMLDialogElement>(null);
  const values: Record<string, string> = { softwareType: "web", ...initialValues, ...state.values };

  const [draft, setDraft] = useState<Record<string, string>>(values);
  const [images, setImages] = useState<ImageItem[]>(initialImages.map((image) => ({ ...image, size: 0, type: "image/png" })));
  const [attachments, setAttachments] = useState<FileMeta[]>(initialAttachments.map((file) => ({ ...file, type: "" })));
  const [links, setLinks] = useState<ProjectLink[]>(initialLinks);
  const [fileErrors, setFileErrors] = useState<{ images?: string; attachments?: string }>({});

  /* 화면을 떠나면 브라우저 임시 주소를 풀어 메모리를 돌려준다 */
  const imagesRef = useRef(images);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);
  useEffect(() => () => imagesRef.current.forEach((image) => revoke(image.url)), []);

  function addImages(event: ChangeEvent<HTMLInputElement>) {
    const picked = [...(event.target.files ?? [])];
    event.target.value = "";
    const error = checkImages([...images, ...picked]);
    setFileErrors((prev) => ({ ...prev, images: error }));
    if (error) return;
    setImages((prev) => [...prev, ...picked.map((file) => ({ name: file.name, size: file.size, type: file.type, url: URL.createObjectURL(file) }))]);
  }

  function removeImage(url: string) {
    revoke(url);
    setImages((prev) => prev.filter((image) => image.url !== url));
    setFileErrors((prev) => ({ ...prev, images: undefined }));
  }

  function addAttachments(event: ChangeEvent<HTMLInputElement>) {
    const picked = [...(event.target.files ?? [])].map((file) => ({ name: file.name, size: file.size, type: file.type }));
    event.target.value = "";
    const error = checkAttachments([...attachments, ...picked]);
    setFileErrors((prev) => ({ ...prev, attachments: error }));
    if (!error) setAttachments((prev) => [...prev, ...picked]);
  }

  function updateLink(index: number, field: keyof ProjectLink, value: string) {
    setLinks((prev) => prev.map((link, i) => (i === index ? { ...link, [field]: value } : link)));
  }

  const toMeta = ({ name, size, type }: FileMeta) => ({ name, size, type });
  const imageError = fileErrors.images ?? state.errors.images;
  const attachmentError = fileErrors.attachments ?? state.errors.attachments;

  /** 지금 적은 값을 읽어 미리보기를 연다 */
  function openPreview() {
    if (formRef.current) setDraft(readDraft(formRef.current));
    previewRef.current?.showModal();
  }

  return (
    <>
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
          label="이미지 (선택)"
          accept={PROJECT_MEDIA_LIMIT.images.types.join(",")}
          hint={`PNG, JPG, WEBP · 한 장에 ${formatBytes(PROJECT_MEDIA_LIMIT.images.bytes)}까지 · ${PROJECT_MEDIA_LIMIT.images.count}장까지 · 첫 장이 대표 이미지예요`}
          error={imageError}
          onChange={addImages}
        >
          {images.length > 0 && (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {images.map((image, index) => (
                <li key={image.url} data-testid="image-item" className="flex flex-col gap-1">
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.url} alt={image.name} className="aspect-square w-full rounded-xl bg-surface-strong object-cover" />
                    {index === 0 && (
                      <span className="absolute top-1 left-1 rounded-md bg-surface-muted px-1.5 text-xs font-bold">대표</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeImage(image.url)}
                    aria-label={`${image.name} 삭제`}
                    className="text-xs font-semibold text-text-muted hover:text-text"
                  >
                    삭제
                  </button>
                </li>
              ))}
            </ul>
          )}
        </FileField>

        <FileField
          name="attachments"
          label="첨부파일 (선택)"
          accept={PROJECT_MEDIA_LIMIT.attachments.extensions.join(",")}
          hint={`테스트 시나리오, 설명서 등 · PDF, DOCX, PPTX, ZIP, TXT · 하나에 ${formatBytes(PROJECT_MEDIA_LIMIT.attachments.bytes)}까지 · ${PROJECT_MEDIA_LIMIT.attachments.count}개까지`}
          error={attachmentError}
          onChange={addAttachments}
        >
          {attachments.length > 0 && (
            <ul className="flex flex-col divide-y divide-line rounded-xl bg-surface-muted">
              {attachments.map((file, index) => (
                <li key={`${file.name}-${index}`} data-testid="attachment-item" className="flex items-center gap-3 px-4 py-2 text-sm">
                  <span className="min-w-0 flex-1 truncate">{file.name}</span>
                  <span className="text-text-muted">{formatBytes(file.size)}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setAttachments((prev) => prev.filter((_, i) => i !== index));
                      setFileErrors((prev) => ({ ...prev, attachments: undefined }));
                    }}
                    aria-label={`${file.name} 삭제`}
                    className="font-semibold text-text-muted hover:text-text"
                  >
                    삭제
                  </button>
                </li>
              ))}
            </ul>
          )}
        </FileField>

        <fieldset className="flex flex-col gap-3" aria-describedby="field-links-hint">
          <legend className="mb-2 text-sm font-bold">추가 링크 (선택)</legend>
          <p id="field-links-hint" className="-mt-2 text-xs text-text-muted">
            이용 가이드, 저장소 등 · {PROJECT_MEDIA_LIMIT.links.count}개까지
          </p>
          {links.map((link, index) => (
            <div key={index} data-testid="link-row" className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] sm:items-start">
              <TextField
                name="linkLabel"
                id={`field-linkLabel-${index}`}
                label={`링크 ${index + 1} 이름`}
                value={link.label}
                onChange={(event) => updateLink(index, "label", event.target.value)}
                error={state.errors[`linkLabel-${index}`]}
                placeholder="이용 가이드"
              />
              <TextField
                name="linkUrl"
                id={`field-linkUrl-${index}`}
                label={`링크 ${index + 1} 주소`}
                type="url"
                inputMode="url"
                value={link.url}
                onChange={(event) => updateLink(index, "url", event.target.value)}
                error={state.errors[`linkUrl-${index}`]}
                placeholder="https://"
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="sm:mt-7"
                onClick={() => setLinks((prev) => prev.filter((_, i) => i !== index))}
                aria-label={`링크 ${index + 1} 삭제`}
              >
                삭제
              </Button>
            </div>
          ))}
          {state.errors.links && <p className="text-sm font-semibold">{state.errors.links}</p>}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="w-fit"
            disabled={links.length >= PROJECT_MEDIA_LIMIT.links.count}
            onClick={() => setLinks((prev) => [...prev, { label: "", url: "" }])}
          >
            링크 추가
          </Button>
        </fieldset>

        <input type="hidden" name="imagesMeta" value={JSON.stringify(images.map(toMeta))} />
        <input type="hidden" name="attachmentsMeta" value={JSON.stringify(attachments.map(toMeta))} />

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
              summary: draft.summary,
              softwareType: (draft.softwareType || "web") as SoftwareType,
              accessUrl: draft.accessUrl,
              description: draft.description,
              images,
              links: links.filter((link) => link.label && link.url),
              attachments,
            }}
          />
        </Card>
      </dialog>
    </>
  );
}

/** 브라우저 임시 주소면 풀어 준다. 저장된 이미지 주소는 그대로 둔다 */
function revoke(url: string) {
  if (url.startsWith("blob:")) URL.revokeObjectURL(url);
}

type FileFieldProps = {
  name: string;
  label: string;
  accept: string;
  hint: string;
  error?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  children?: ReactNode;
};

/**
 * 파일 고르기 칸. 시연용이라 파일은 폼으로 보내지 않아서 input에 name을 달지 않는다.
 * 고른 목록(children)은 입력란 아래에 그린다.
 */
function FileField({ name, label, accept, hint, error, onChange, children }: FileFieldProps) {
  const id = `field-${name}`;
  const describedBy = [`${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ");
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-bold">
        {label}
      </label>
      <input
        id={id}
        type="file"
        multiple
        accept={accept}
        onChange={onChange}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className="text-sm text-text-muted file:mr-3 file:rounded-full file:border-0 file:bg-surface-strong file:px-4 file:py-2 file:font-bold file:text-text aria-invalid:rounded-xl aria-invalid:ring-2 aria-invalid:ring-text"
      />
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
