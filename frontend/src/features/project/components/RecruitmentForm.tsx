"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { LinkButton } from "@/components/ui/LinkButton";
import { SOFTWARE_TYPE_LABEL, SOFTWARE_TYPES } from "@/features/recruitment/types";
import { formatCredits } from "@/lib/format";
import { createRecruitment } from "../actions";
import { EMPTY_FORM_STATE, RECRUITMENT_LIMIT, SELECTION_MODE_LABEL, type FormState, type SelectionMode } from "../types";
import { FormSection } from "./FormSection";
import { useFocusFirstError } from "./ProjectForm";
import { TextField } from "./TextField";

/*
 * 테스트 모집 작성 폼. 보상은 서비스가 정하므로 입력받지 않고 안내만 한다.
 * 테스트 항목은 테스터가 해 볼 작업 목록이다(README: 확정되면 안내된 항목을 테스트). 1개 이상 적는다.
 * 선발형은 구독 모집 혜택이라 무료 모집은 선착순으로 고정한다.
 */

const SELECTION_MODE_HINT: Record<SelectionMode, string> = {
  firstCome: "지원 순서대로 자동 확정돼요",
  selection: "지원자를 직접 확정하고 거절해요",
};

type RecruitmentFormProps = {
  projectKey: string;
  isSubscription: boolean;
  baseReward: number;
  extraReward: number;
  maxCapacity: number;
};

/** 테스트 모집 작성 폼 */
export function RecruitmentForm({ projectKey, isSubscription, baseReward, extraReward, maxCapacity }: RecruitmentFormProps) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    createRecruitment.bind(null, projectKey),
    EMPTY_FORM_STATE,
  );
  const formRef = useFocusFirstError(state);
  const { values, errors } = state;
  /* 항목 줄은 화면 상태로 들고 있어서 제출 뒤 오류가 와도 적은 값이 남는다 */
  const [items, setItems] = useState([{ title: "", description: "", required: true }]);
  /* 줄 오류는 제출할 때의 순서로 찾으므로, 줄을 지우면 다음 제출까지 숨긴다 */
  const [dismissedFor, setDismissedFor] = useState<FormState | null>(null);
  const rowErrors = dismissedFor === state ? {} : errors;
  const { max, titleLength, descriptionLength } = RECRUITMENT_LIMIT.testItems;
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

  function updateItem(index: number, change: Partial<(typeof items)[number]>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...change } : item)));
  }

  return (
    <form ref={formRef} action={formAction} noValidate className="flex max-w-2xl flex-col gap-6">
      <FormSection title="모집글">
        <TextField name="title" label="모집글 제목" defaultValue={values.title} error={errors.title} hint={`${RECRUITMENT_LIMIT.titleLength}자까지`} />
        <TextField name="request" label="모집 설명" multiline defaultValue={values.request} error={errors.request} hint="테스터에게 해 달라고 할 일을 200자까지 적어 주세요" />
        <fieldset className="flex flex-col gap-2" aria-describedby={errors.softwareType ? "field-softwareType-error" : undefined}>
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
                    defaultChecked={(values.softwareType || "web") === type}
                    disabled={!ready}
                    className="accent-accent"
                  />
                  {SOFTWARE_TYPE_LABEL[type]}
                  {!ready && <span className="text-xs font-medium">준비 중</span>}
                </label>
              );
            })}
          </div>
          {errors.softwareType && (
            <p id="field-softwareType-error" className="text-sm font-semibold">
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
        <TextField
          name="conditions"
          label="모집 조건 (선택)"
          multiline
          defaultValue={values.conditions}
          error={errors.conditions}
          hint={`필요한 경험, 관심사, 사용 환경을 적어 주세요. ${RECRUITMENT_LIMIT.conditionsLength}자까지`}
        />
      </FormSection>
      <FormSection title="선정 조건과 일정">
        <fieldset className="flex flex-col gap-2" aria-describedby={errors.selectionMode ? "field-selectionMode-error" : undefined}>
          <legend className="mb-2 text-sm font-bold">모집 선정 조건</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {(["firstCome", "selection"] as const).map((mode) => {
              const ready = mode === "firstCome" || isSubscription;
              return (
                <label
                  key={mode}
                  className="flex items-start gap-3 rounded-2xl bg-surface-strong p-4 has-checked:inset-ring-2 has-checked:inset-ring-accent has-disabled:text-text-muted"
                >
                  <input
                    type="radio"
                    name="selectionMode"
                    value={mode}
                    defaultChecked={selectionMode === mode}
                    disabled={!ready}
                    className="mt-1 accent-accent"
                  />
                  <span className="flex flex-col gap-1">
                    <span className="text-sm font-bold">
                      {SELECTION_MODE_LABEL[mode]}
                      {!ready && <span className="ml-2 text-xs font-medium">구독 전용</span>}
                    </span>
                    <span className="text-xs text-text-muted">{SELECTION_MODE_HINT[mode]}</span>
                  </span>
                </label>
              );
            })}
          </div>
          {errors.selectionMode && (
            <p id="field-selectionMode-error" className="text-sm font-semibold">
              {errors.selectionMode}
            </p>
          )}
        </fieldset>
        <TextField
          name="capacity"
          label="모집 인원"
          type="number"
          min={1}
          max={maxCapacity}
          defaultValue={values.capacity}
          error={errors.capacity}
          hint={`1~${maxCapacity}명`}
        />
        <div className="grid gap-6 sm:grid-cols-2">
          <TextField name="recruitDeadline" label="모집 마감일" type="date" defaultValue={values.recruitDeadline} error={errors.recruitDeadline} />
          <TextField name="submitDeadline" label="피드백 제출 마감일" type="date" defaultValue={values.submitDeadline} error={errors.submitDeadline} />
        </div>
      </FormSection>
      <FormSection title="테스트 항목">
        <fieldset className="flex flex-col gap-3" aria-label="테스트 항목" aria-describedby="field-testItems-hint">
          <p id="field-testItems-hint" className="text-xs text-text-muted">
            테스터가 해 볼 작업을 1~{max}개 적어 주세요. 테스터는 항목별로 피드백을 남겨요. 필수를 끄면 건너뛸 수 있는 항목이 돼요
          </p>
          {items.map((item, index) => (
            <div key={index} data-testid="test-item-row" className="flex flex-col gap-4 rounded-2xl inset-ring inset-ring-line p-4">
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
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* 체크를 끈 줄은 값이 안 보내지므로, 몇 번째 줄이 필수인지 줄 번호로 보낸다 */}
                <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    name="testItemRequired"
                    value={index}
                    checked={item.required}
                    onChange={(event) => updateItem(index, { required: event.target.checked })}
                    className="size-4 accent-accent"
                  />
                  <span className="sr-only">항목 {index + 1} </span>
                  필수
                </label>
                {items.length > 1 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="w-fit"
                    onClick={() => {
                      setItems((prev) => prev.filter((_, i) => i !== index));
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
          {errors.testItems && <p className="text-sm font-semibold">{errors.testItems}</p>}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="w-fit"
            disabled={items.length >= max}
            onClick={() => setItems((prev) => [...prev, { title: "", description: "", required: true }])}
          >
            항목 추가
          </Button>
        </fieldset>
      </FormSection>
      <div className="flex flex-col gap-1 rounded-2xl bg-surface-muted p-6 text-sm">
        <p className="font-bold">기본 보상 {formatCredits(baseReward)}</p>
        <p className="text-text-muted">보상은 서비스가 정해요. 테스터가 피드백을 내면 지급돼요.</p>
        {isSubscription && (
          <p className="mt-2 font-semibold text-accent">
            구독 모집이라 추가 보상 {formatCredits(extraReward)}이 붙어요.
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          모집 등록
        </Button>
        <LinkButton href={`/my/projects/${projectKey}`} variant="secondary">
          취소
        </LinkButton>
      </div>
    </form>
  );
}
