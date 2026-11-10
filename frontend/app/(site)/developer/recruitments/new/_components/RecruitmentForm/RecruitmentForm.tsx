"use client";

import { useActionState, useEffect, useRef, useState, type ChangeEvent } from "react";
import { projectPath } from "@/features/project/paths";
import { Button } from "@/components/ui/Button/Button";
import { LinkButton } from "@/components/ui/LinkButton/LinkButton";
import { SOFTWARE_TYPE_LABEL, SOFTWARE_TYPES } from "@/features/recruitment/types";
import { formatCredits } from "@/lib/format";
import { createRecruitment } from "@/features/recruitment/actions";
import { checkImages, formatBytes, isUploadedImageUrl, type FileMeta } from "@/features/project/media";
import { uploadImages } from "@/lib/image-upload";
import { EMPTY_FORM_STATE, PROJECT_MEDIA_LIMIT, type FormState } from "@/features/project/types";
import { RECRUITMENT_LIMIT, SELECTION_MODE_LABEL, validateRecruitmentForm, type SelectionMode } from "@/features/recruitment/types";
import { FormSection } from "../../../../_components/FormSection/FormSection";
import { FileField, revoke } from "@/app/(site)/developer/_components/FileField/FileField";
import { useFocusFirstError } from "@/app/(site)/developer/_lib/focus-first-error";
import { TextField } from "@/components/ui/TextField/TextField";
import { Card } from "@/components/ui/Card/Card";
import { FormMessage } from "@/components/ui/FormField/FormField";
import styles from "./RecruitmentForm.module.css";

/*
 * 테스트 모집 작성 폼. 보상은 서비스가 정하므로 입력받지 않고 안내만 한다.
 * 테스트 항목은 테스터가 해 볼 작업 목록이다(README: 확정되면 안내된 항목을 테스트). 1개 이상 적는다.
 * 선발형은 구독 모집 혜택이라 무료 모집은 선착순으로 고정한다.
 */

const SELECTION_MODE_HINT: Record<SelectionMode, string> = {
  firstCome: "지원하면 바로 확정돼요",
  selection: "지원자를 직접 확정하고 거절해요",
};

type RecruitmentFormProps = {
  projectKey: string;
  uploadEnabled: boolean;
  isSubscription: boolean;
  baseReward: number;
  extraReward: number;
};

/** 항목에 고른 이미지. 브라우저 임시 주소(blob:)로 미리 보여 준다 */
type ItemImage = FileMeta & { url: string; file?: File };

type ItemRow = { title: string; description: string; required: boolean; images: ItemImage[] };

const emptyRow = (): ItemRow => ({ title: "", description: "", required: true, images: [] });

const toItemImage = (file: File): ItemImage => ({ name: file.name, size: file.size, type: file.type, file, url: URL.createObjectURL(file) });

/** 테스트 모집 작성 폼 */
export function RecruitmentForm({ projectKey, uploadEnabled, isSubscription, baseReward, extraReward }: RecruitmentFormProps) {
  const [items, setItems] = useState<ItemRow[]>([emptyRow()]);
  const [images, setImages] = useState<ItemImage[]>([]);
  const [conditions, setConditions] = useState<string[]>(Array.from({ length: 5 }, () => ""));
  const uploaded = useRef(new WeakMap<File, string>());
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    async (previous, data) => {
      if (uploadEnabled) {
        const checked = validateRecruitmentForm(data, isSubscription, new Date());
        if (Object.keys(checked.errors).length) return checked;
        let field = "recruitmentImages";
        try {
          data.set("imageUrls", JSON.stringify(await uploadImages(images, "/api/v1/developer/recruitments/images", uploaded.current, isUploadedImageUrl)));
          data.delete("testItemImageUrls");
          for (let index = 0; index < items.length; index++) {
            field = `testItemImages-${index}`;
            const urls = await uploadImages(items[index].images, "/api/v1/developer/recruitments/images", uploaded.current, isUploadedImageUrl);
            data.append("testItemImageUrls", JSON.stringify(urls));
          }
        } catch (error) {
          return { values: checked.values, errors: { [field]: error instanceof Error ? error.message : "이미지를 다시 올려 주세요" } };
        }
      }
      return createRecruitment(projectKey, previous, data);
    },
    EMPTY_FORM_STATE,
  );
  const formRef = useFocusFirstError(state);
  const { values, errors } = state;
  /* 항목 줄은 화면 상태로 들고 있어서 제출 뒤 오류가 와도 적은 값이 남는다 */
  /* 모집글 이미지. 항목 이미지와 따로 들고 있고, 고른 순서가 모집글 상세 이미지 띠의 순서다 (#124) */
  const [imagesPickError, setImagesPickError] = useState<string | undefined>();
  /* 고를 때 나온 이미지 오류는 줄 번호로 들고 있다가 줄을 지우면 함께 지운다 */
  const [pickErrors, setPickErrors] = useState<Record<number, string | undefined>>({});
  /* 줄 오류는 제출할 때의 순서로 찾으므로, 줄을 지우면 다음 제출까지 숨긴다 */
  const [dismissedFor, setDismissedFor] = useState<FormState | null>(null);
  const rowErrors = dismissedFor === state ? {} : errors;
  const { max, titleLength, descriptionLength, imageCount } = RECRUITMENT_LIMIT.testItems;
  const selectionMode = values.selectionMode || (isSubscription ? "selection" : "firstCome");

  /* 폼 액션이 끝나면 React가 폼을 초기화해 체크칸이 처음 값으로 돌아간다. 글자 칸과 달리 다시 맞춰 주지 않아 직접 되돌린다 */
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  useEffect(() => {
    formRef.current?.querySelectorAll<HTMLInputElement>('input[name="testItemRequired"]').forEach((box, index) => {
      box.checked = itemsRef.current[index]?.required ?? true;
    });
  }, [state, formRef]);

  function updateItem(index: number, change: Partial<ItemRow>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...change } : item)));
  }

  /* 한 장이라도 한도를 넘으면 이번에 고른 파일은 넣지 않고 이유를 알린다 */
  function addRecruitmentImages(event: ChangeEvent<HTMLInputElement>) {
    const picked = [...(event.target.files ?? [])];
    event.target.value = "";
    if (picked.length === 0) return;
    const problem = checkImages([...images, ...picked], RECRUITMENT_LIMIT.imageCount);
    setImagesPickError(problem);
    if (problem) return;
    setImages((prev) => [...prev, ...picked.map(toItemImage)]);
  }

  function removeRecruitmentImage(url: string) {
    revoke(url);
    setImages((prev) => prev.filter((image) => image.url !== url));
    setImagesPickError(undefined);
  }

  function addImages(index: number, event: ChangeEvent<HTMLInputElement>) {
    const picked = [...(event.target.files ?? [])];
    event.target.value = "";
    if (picked.length === 0) return;
    const current = items[index].images;
    const problem = checkImages([...current, ...picked], imageCount);
    setPickErrors((prev) => ({ ...prev, [index]: problem }));
    if (problem) return;
    updateItem(index, {
      images: [...current, ...picked.map(toItemImage)],
    });
  }

  function removeImage(index: number, url: string) {
    revoke(url);
    updateItem(index, { images: items[index].images.filter((image) => image.url !== url) });
    setPickErrors((prev) => ({ ...prev, [index]: undefined }));
  }

  return (
    <form aria-busy={pending} inert={pending} ref={formRef} action={formAction} noValidate className={styles.root}>
      <FormSection title="모집글">
        <TextField name="title" label="모집글 제목" defaultValue={values.title} error={errors.title} hint={`${RECRUITMENT_LIMIT.titleLength}자까지`} />
        <TextField name="request" label="모집 설명" multiline defaultValue={values.request} error={errors.request} hint={`테스터에게 해 달라고 할 일을 ${RECRUITMENT_LIMIT.requestLength}자까지 적어 주세요. 마크다운을 쓸 수 있어요`} />
        <fieldset className={styles.fieldset} aria-describedby={errors.softwareType ? "field-softwareType-error" : undefined}>
          <legend className={styles.legend}>유형 (여러 개 고를 수 있어요)</legend>
          <div className={styles.box}>
            {SOFTWARE_TYPES.map((type) => {
              return (
                <label
                  key={type}
                  className={styles.root2}
                >
                  <input
                    type="checkbox"
                    name="softwareTypes"
                    value={type}
                    defaultChecked={(values.softwareType ?? "web").split(",").includes(type)}
                    className={styles.input}
                  />
                  {SOFTWARE_TYPE_LABEL[type]}
                </label>
              );
            })}
          </div>
          {errors.softwareType && (
            <p id="field-softwareType-error" className={styles.softwareType}>
              {errors.softwareType}
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
          error={errors.accessUrl}
          hint="테스터가 이 주소로 접속해요"
        />
        {/* 칸마다 조건 하나. 보낼 때는 줄바꿈으로 이어 한 값(conditions)으로 보낸다 */}
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>모집 조건 (선택)</legend>
          {conditions.map((condition, index) => (
            <TextField
              key={index}
              name="conditionItem"
              id={`field-conditionItem-${index}`}
              label={`조건 ${index + 1}`}
              value={condition}
              onChange={(event) => setConditions((prev) => prev.map((item, i) => (i === index ? event.target.value : item)))}
              error={index === 0 ? errors.conditions : undefined}
              hint={index === 0 ? `필요한 경험, 관심사, 사용 환경을 한 칸에 하나씩 적어 주세요. 전체 ${RECRUITMENT_LIMIT.conditionsLength}자까지` : undefined}
            />
          ))}
          <input type="hidden" name="conditions" value={conditions.map((item) => item.trim()).filter(Boolean).join("\n")} />
          <Button type="button" size="sm" variant="secondary" onClick={() => setConditions((prev) => [...prev, ""])}>
            조건 추가
          </Button>
        </fieldset>
        <FileField
          name="recruitmentImages"
          label="모집글 이미지 (선택)"
          accept={PROJECT_MEDIA_LIMIT.images.types.join(",")}
          multiple
          hint={`모집글 상세에서 대표 이미지 다음에 보여요 · PNG, JPG, WEBP · 한 장에 ${formatBytes(PROJECT_MEDIA_LIMIT.images.bytes)}까지 · ${RECRUITMENT_LIMIT.imageCount}장까지 · 고른 순서대로 보여요`}
          error={imagesPickError ?? errors.recruitmentImages}
          onChange={addRecruitmentImages}
          buttonLabel="이미지 추가"
        >
          {images.length > 0 && (
            <ul className={styles.list}>
              {images.map((image) => (
                <li key={image.url} data-testid="recruitment-image" className={styles.root3}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.url} alt={image.name} className={styles.image} />
                  <button
                    type="button"
                    onClick={() => removeRecruitmentImage(image.url)}
                    aria-label={`모집글 이미지 ${image.name} 삭제`}
                    className={styles.button}
                  >
                    삭제
                  </button>
                </li>
              ))}
            </ul>
          )}
        </FileField>
        <input type="hidden" name="recruitmentImagesMeta" value={JSON.stringify(images.map(({ name, size, type }) => ({ name, size, type })))} />
      </FormSection>
      <FormSection title="선정 조건과 일정">
        <fieldset className={styles.fieldset2} aria-describedby={errors.selectionMode ? "field-selectionMode-error" : undefined}>
          <legend className={styles.legend2}>모집 선정 조건</legend>
          <div className={styles.box2}>
            {(["firstCome", "selection"] as const).map((mode) => {
              const ready = mode === "firstCome" || isSubscription;
              return (
                <label
                  key={mode}
                  className={styles.root4}
                >
                  <input
                    type="radio"
                    name="selectionMode"
                    value={mode}
                    defaultChecked={selectionMode === mode}
                    disabled={!ready}
                    className={styles.input2}
                  />
                  <span className={styles.label2}>
                    <span className={styles.label3}>
                      {SELECTION_MODE_LABEL[mode]}
                      {!ready && <span className={styles.label4}>구독 전용</span>}
                    </span>
                    <span className={styles.label5}>{SELECTION_MODE_HINT[mode]}</span>
                  </span>
                </label>
              );
            })}
          </div>
          {errors.selectionMode && (
            <p id="field-selectionMode-error" className={styles.selectionMode}>
              {errors.selectionMode}
            </p>
          )}
        </fieldset>
        <div className={styles.box3}>
          <TextField name="recruitDeadline" label="모집 마감일" type="date" defaultValue={values.recruitDeadline} error={errors.recruitDeadline} />
          <TextField name="submitDeadline" label="피드백 제출 마감일" type="date" defaultValue={values.submitDeadline} error={errors.submitDeadline} />
        </div>
      </FormSection>
      <FormSection title="테스트 항목">
        <fieldset className={styles.fieldset3} aria-label="테스트 항목" aria-describedby="field-testItems-hint">
          <p id="field-testItems-hint" className={styles.text}>
            테스터가 해 볼 작업을 1~{max}개 적어 주세요. 테스터는 항목별로 피드백을 남겨요. 필수를 끄면 건너뛸 수 있는 항목이 돼요
          </p>
          {items.map((item, index) => (
            <div key={index} data-testid="test-item-row" className={styles.root5}>
              <TextField
                name="testItemTitle"
                id={`field-testItemTitle-${index}`}
                label={`항목 ${index + 1} 이름`}
                value={item.title}
                onChange={(event) => updateItem(index, { title: event.target.value })}
                error={rowErrors[`testItemTitle-${index}`]}
                hint={`${titleLength}자까지`}
              />
              <TextField
                name="testItemDescription"
                id={`field-testItemDescription-${index}`}
                label={`항목 ${index + 1} 설명 (선택)`}
                value={item.description}
                onChange={(event) => updateItem(index, { description: event.target.value })}
                error={rowErrors[`testItemDescription-${index}`]}
                hint={`${descriptionLength}자까지`}
              />
              <FileField
                name={`testItemImages-${index}`}
                label={`항목 ${index + 1} 이미지 (선택)`}
                accept={PROJECT_MEDIA_LIMIT.images.types.join(",")}
                multiple
                hint={`PNG, JPG, WEBP · 한 장에 ${formatBytes(PROJECT_MEDIA_LIMIT.images.bytes)}까지 · ${imageCount}장까지 · 고른 순서대로 보여요`}
                error={pickErrors[index] ?? rowErrors[`testItemImages-${index}`]}
                onChange={(event) => addImages(index, event)}
                buttonLabel="이미지 추가"
              >
                {item.images.length > 0 && (
                  <ul className={styles.list2}>
                    {item.images.map((image) => (
                      <li key={image.url} data-testid="test-item-image" className={styles.root6}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={image.url} alt={image.name} className={styles.image2} />
                        <button
                          type="button"
                          onClick={() => removeImage(index, image.url)}
                          aria-label={`항목 ${index + 1} ${image.name} 삭제`}
                          className={styles.button2}
                        >
                          삭제
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </FileField>
              <input
                type="hidden"
                name="testItemImagesMeta"
                value={JSON.stringify(item.images.map(({ name, size, type }) => ({ name, size, type })))}
              />
              <div className={styles.box4}>
                {/* 체크를 끈 줄은 값이 안 보내지므로, 몇 번째 줄이 필수인지 줄 번호로 보낸다 */}
                <label className={styles.field}>
                  <input
                    type="checkbox"
                    name="testItemRequired"
                    value={index}
                    checked={item.required}
                    onChange={(event) => updateItem(index, { required: event.target.checked })}
                    className={styles.input3}
                  />
                  <span className={styles.srOnly}>항목 {index + 1} </span>
                  필수
                </label>
                {items.length > 1 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className={styles.button3}
                    onClick={() => {
                      item.images.forEach((image) => revoke(image.url));
                      setItems((prev) => prev.filter((_, i) => i !== index));
                      setPickErrors({});
                      setDismissedFor(state);
                    }}
                    aria-label={`항목 ${index + 1} 삭제`}
                  >
                    삭제
                  </Button>
                )}
              </div>
            </div>
          ))}
          {errors.testItems && <p className={styles.testItems}>{errors.testItems}</p>}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className={styles.button4}
            disabled={items.length >= max}
            onClick={() => setItems((prev) => [...prev, emptyRow()])}
          >
            항목 추가
          </Button>
        </fieldset>
      </FormSection>
      <Card as="div" className={styles.box5}>
        <p className={styles.text2}>기본 보상 {formatCredits(baseReward)}</p>
        <p className={styles.text3}>보상은 서비스가 정해요. 테스터가 피드백을 내면 지급돼요.</p>
        {extraReward > 0 && (
          <p className={styles.text4}>
            구독 모집이라 추가 보상 {formatCredits(extraReward)}이 붙어요.
          </p>
        )}
      </Card>
      {errors.form && <FormMessage status="error" message={errors.form} />}
      <div className={styles.box6}>
        <Button type="submit" disabled={pending}>
          {pending ? "등록 중…" : "모집 등록"}
        </Button>
        <LinkButton href={projectPath(projectKey)} variant="secondary">
          취소
        </LinkButton>
      </div>
    </form>
  );
}
