"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { LinkButton } from "@/components/ui/LinkButton";
import { formatCredits } from "@/lib/format";
import { createRecruitment } from "../actions";
import { EMPTY_FORM_STATE, RECRUITMENT_LIMIT, type FormState } from "../types";
import { useFocusFirstError } from "./ProjectForm";
import { TextField } from "./TextField";

/*
 * 테스트 모집 작성 폼. 보상은 서비스가 정하므로 입력받지 않고 안내만 한다.
 * 테스트 항목은 테스터가 해 볼 작업 목록이다(README: 확정되면 안내된 항목을 테스트). 1개 이상 적는다.
 */

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
  const [items, setItems] = useState([{ title: "", description: "" }]);
  const { max, titleLength, descriptionLength } = RECRUITMENT_LIMIT.testItems;

  function updateItem(index: number, field: "title" | "description", value: string) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  }

  return (
    <form ref={formRef} action={formAction} noValidate className="flex max-w-2xl flex-col gap-6">
      <TextField name="request" label="요청 내용" multiline defaultValue={values.request} error={errors.request} hint="테스터에게 해 달라고 할 일을 200자까지 적어 주세요" />
      <TextField
        name="conditions"
        label="모집 조건 (선택)"
        multiline
        defaultValue={values.conditions}
        error={errors.conditions}
        hint={`필요한 경험, 관심사, 사용 환경을 적어 주세요. ${RECRUITMENT_LIMIT.conditionsLength}자까지`}
      />
      <fieldset className="flex flex-col gap-3" aria-describedby="field-testItems-hint">
        <legend className="mb-2 text-sm font-bold">테스트 항목</legend>
        <p id="field-testItems-hint" className="-mt-2 text-xs text-text-muted">
          테스터가 해 볼 작업을 1~{max}개 적어 주세요. 테스터는 항목별로 피드백을 남겨요
        </p>
        {items.map((item, index) => (
          <div key={index} data-testid="test-item-row" className="flex flex-col gap-2 rounded-2xl bg-surface-muted p-4">
            <TextField
              name="testItemTitle"
              id={`field-testItemTitle-${index}`}
              label={`항목 ${index + 1} 이름`}
              value={item.title}
              onChange={(event) => updateItem(index, "title", event.target.value)}
              error={errors[`testItemTitle-${index}`]}
              placeholder="책 검색해서 등록하기"
              hint={`${titleLength}자까지`}
            />
            <TextField
              name="testItemDescription"
              id={`field-testItemDescription-${index}`}
              label={`항목 ${index + 1} 설명 (선택)`}
              value={item.description}
              onChange={(event) => updateItem(index, "description", event.target.value)}
              error={errors[`testItemDescription-${index}`]}
              hint={`${descriptionLength}자까지`}
            />
            {items.length > 1 && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="w-fit"
                onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                aria-label={`항목 ${index + 1} 삭제`}
              >
                삭제
              </Button>
            )}
          </div>
        ))}
        {errors.testItems && <p className="text-sm font-semibold">{errors.testItems}</p>}
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="w-fit"
          disabled={items.length >= max}
          onClick={() => setItems((prev) => [...prev, { title: "", description: "" }])}
        >
          항목 추가
        </Button>
      </fieldset>
      <div className="grid gap-6 sm:grid-cols-2">
        <TextField name="recruitDeadline" label="모집 마감일" type="date" defaultValue={values.recruitDeadline} error={errors.recruitDeadline} />
        <TextField name="submitDeadline" label="피드백 제출 마감일" type="date" defaultValue={values.submitDeadline} error={errors.submitDeadline} />
      </div>
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
      <div className="flex flex-col gap-1 rounded-2xl bg-surface-muted p-5 text-sm">
        <p className="font-bold">기본 보상 {formatCredits(baseReward)}</p>
        <p className="text-text-muted">보상은 서비스가 정해요. 테스터가 피드백을 내면 지급돼요.</p>
        {isSubscription && (
          <p className="mt-2 font-semibold text-accent">
            구독 모집이라 추가 보상 {formatCredits(extraReward)}이 붙고, 지원자를 직접 선정해요.
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
