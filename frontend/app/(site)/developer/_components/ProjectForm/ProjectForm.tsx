"use client";

import { useActionState, useRef, useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/Button/Button";
import { Card } from "@/components/ui/Card/Card";
import { FormMessage } from "@/components/ui/FormField/FormField";
import { LinkButton } from "@/components/ui/LinkButton/LinkButton";
import { saveProject } from "@/features/project/actions";
import { checkImages, formatBytes, isUploadedImageUrl, type FileMeta } from "@/features/project/media";
import { uploadImages } from "@/lib/image-upload";
import { EMPTY_FORM_STATE, PROJECT_MEDIA_LIMIT, validateProjectForm, type FormState, type ProjectImage } from "@/features/project/types";
import { FormSection } from "../FormSection/FormSection";
import { ProjectBody } from "../ProjectDetail/ProjectDetail";
import { TextField } from "@/components/ui/TextField/TextField";
import { FileField, revoke } from "../FileField/FileField";
import { useFocusFirstError } from "../../_lib/focus-first-error";
import styles from "./ProjectForm.module.css";

/*
 * 프로젝트 등록·수정 폼과 미리보기. 검증은 서버 액션이 하고, 오류가 오면 첫 오류 칸으로 포커스를 옮긴다.
 * 이미지는 고를 때 한도를 확인하고 제출할 때 한 장씩 올린다(media.ts).
 * 등록 버튼 옆 "미리보기"를 누르면 지금 적은 내용을 상세 화면과 같은 모양(ProjectBody)으로 대화상자에 보여 준다.
 * 대화상자는 기본 dialog를 써서 Esc 닫기와 포커스 복귀를 브라우저에 맡긴다.
 */

type ProjectFormProps = {
  /** 수정이면 프로젝트 키, 등록이면 null */
  projectKey: string | null;
  uploadEnabled: boolean;
  /** 수정할 때 채워 둘 값 */
  initialValues?: Record<string, string>;
  initialImage?: ProjectImage | null;
  cancelHref: string;
};

/** 고른 이미지. 새로 고른 파일은 브라우저 임시 주소(blob:)로 보여 준다 */
type ImageItem = FileMeta & { url: string; file?: File };

const TEXT_FIELDS = ["name", "description"] as const;

/** 폼에 지금 적힌 글자 값을 읽는다. 미리보기에 쓴다 */
function readDraft(form: HTMLFormElement) {
  const data = new FormData(form);
  return Object.fromEntries(TEXT_FIELDS.map((name) => [name, String(data.get(name) ?? "")]));
}

/** 프로젝트 등록·수정 폼 */
export function ProjectForm({
  projectKey,
  uploadEnabled,
  initialValues = {},
  initialImage = null,
  cancelHref,
}: ProjectFormProps) {
  const [image, setImage] = useState<ImageItem | null>(initialImage && { ...initialImage, size: 0, type: "image/png" });
  const uploaded = useRef(new WeakMap<File, string>());
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    async (previous, data) => {
      if (uploadEnabled) {
        const checked = validateProjectForm(data);
        if (Object.keys(checked.errors).length) return checked;
        try {
          data.set("imageUrls", JSON.stringify(await uploadImages(image ? [image] : [], "/api/v1/developer/projects/images", uploaded.current, isUploadedImageUrl)));
        } catch (error) {
          return { values: checked.values, errors: { images: error instanceof Error ? error.message : "이미지를 다시 올려 주세요" } };
        }
      }
      return saveProject(projectKey, previous, data);
    },
    EMPTY_FORM_STATE,
  );
  const formRef = useFocusFirstError(state);
  const previewRef = useRef<HTMLDialogElement>(null);
  const values: Record<string, string> = { ...initialValues, ...state.values };

  const [draft, setDraft] = useState<Record<string, string>>(values);
  const [fileErrors, setFileErrors] = useState<{ images?: string }>({});
  function pickImage(event: ChangeEvent<HTMLInputElement>) {
    const [file] = event.target.files ?? [];
    event.target.value = "";
    if (!file) return;
    const error = checkImages([file]);
    setFileErrors((prev) => ({ ...prev, images: error }));
    if (error) return;
    if (image) revoke(image.url);
    setImage({ name: file.name, size: file.size, type: file.type, file, url: URL.createObjectURL(file) });
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
      <form aria-busy={pending} inert={pending} ref={formRef} action={formAction} noValidate className={styles.form}>
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
            <div data-testid="image-item" className={styles.box}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.url} alt={image.name} className={styles.image} />
              <button
                type="button"
                onClick={removeImage}
                aria-label={`${image.name} 삭제`}
                className={styles.button}
              >
                삭제
              </button>
            </div>
          )}
        </FileField>

        </FormSection>

        <input type="hidden" name="imagesMeta" value={JSON.stringify(image ? [toMeta(image)] : [])} />

        {state.errors.form && <FormMessage status="error" message={state.errors.form} />}

        <div className={styles.box2}>
          <Button type="submit" disabled={pending}>
            {pending ? "저장 중…" : projectKey ? "저장" : "등록"}
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
        className={styles.dialog}
      >
        <div className={styles.box3}>
          <div>
            <h2 id="preview-heading" className={styles.title}>
              미리보기
            </h2>
            <p className={styles.text}>프로젝트 상세에서 이렇게 보여요</p>
          </div>
          <Button type="button" size="sm" variant="secondary" onClick={() => previewRef.current?.close()}>
            닫기
          </Button>
        </div>
        <Card data-testid="project-preview" className={styles.card}>
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
