"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { LinkButton } from "@/components/ui/LinkButton";
import { formatCredits } from "@/lib/format";
import { createRecruitment } from "../actions";
import { EMPTY_FORM_STATE, type FormState } from "../types";
import { useFocusFirstError } from "./ProjectForm";
import { TextField } from "./TextField";

/* 테스트 모집 작성 폼. 보상은 서비스가 정하므로 입력받지 않고 안내만 한다 */

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

  return (
    <form ref={formRef} action={formAction} noValidate className="flex max-w-2xl flex-col gap-6">
      <TextField name="request" label="요청 내용" multiline defaultValue={values.request} error={errors.request} hint="테스터에게 해 달라고 할 일을 200자까지 적어 주세요" />
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
