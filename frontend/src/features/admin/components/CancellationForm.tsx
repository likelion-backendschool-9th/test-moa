"use client";

import { type FormEvent, startTransition, useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { processCancellation } from "../actions";
import {
  CANCELLATION_REJECT_REASONS,
  REVIEW_MEMO_MAX_LENGTH,
  type CancellationFormError,
  type CancellationFormState,
  type CancellationRejectReason,
} from "../types";

const initialState: CancellationFormState = { error: null };

const ERROR_MESSAGE: Record<CancellationFormError, string> = {
  decision: "처리 결과를 골라 주세요.",
  reason: "반려 사유를 골라 주세요.",
  note: "개발자에게 보여 줄 사유를 적어 주세요.",
  memo: "시연용 저장 공간이 모자라 처리하지 못했어요. 메모를 줄이거나 demo-admin-cancellations 쿠키를 지운 뒤 다시 시도해 주세요.",
};

const panelClass = "flex flex-col gap-4 rounded-2xl bg-surface-muted p-6 md:p-8";

type CancellationFormProps = { cancellationKey: string; confirmedCount: number };

/** 모집 취소 처리 양식. 출금 처리 양식과 같이 막혀도 고른 값과 메모가 남는다 */
export function CancellationForm({ cancellationKey, confirmedCount }: CancellationFormProps) {
  const [state, formAction, pending] = useActionState(processCancellation, initialState);
  const errorId = state.error ? "cancellation-error" : undefined;

  /* React가 폼 액션 뒤 칸을 자동으로 비우지 않게 직접 제출한다 (크레딧 출금 신청 폼과 같다) */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} aria-labelledby="cancellation-review-heading" className={panelClass}>
      <h3 id="cancellation-review-heading" className="text-lg font-extrabold">
        처리하기
      </h3>
      <input type="hidden" name="cancellationKey" value={cancellationKey} />
      <fieldset className="flex flex-col gap-3" aria-describedby={state.error === "decision" ? errorId : undefined}>
        <legend className="mb-3 text-sm font-semibold">처리 결과</legend>
        <Choice
          name="decision"
          value="approved"
          label="승인"
          detail={confirmedCount > 0 ? `모집을 취소해요. 확정 테스터 ${confirmedCount}명의 참여도 함께 취소돼요.` : "모집을 취소해요."}
        />
        <Choice name="decision" value="rejected" label="반려" detail="모집은 그대로 진행돼요." />
      </fieldset>
      <fieldset className="flex flex-col gap-3" aria-describedby={state.error === "reason" ? errorId : undefined}>
        <legend className="mb-3 text-sm font-semibold">반려 사유</legend>
        {(Object.keys(CANCELLATION_REJECT_REASONS) as CancellationRejectReason[]).map((reason) => (
          <Choice key={reason} name="reason" value={reason} label={CANCELLATION_REJECT_REASONS[reason]} />
        ))}
      </fieldset>
      <div className="flex flex-col gap-2 text-sm">
        <label htmlFor="cancellation-memo" className="font-semibold">
          반려 메모
        </label>
        {/* placeholder는 입력하면 사라져서 안내는 늘 보이게 둔다 */}
        <p id="cancellation-memo-hint" className="text-text-muted">
          반려할 때 운영자 기록으로 남아요. 사유가 &ldquo;기타&rdquo;이면 이 메모가 개발자에게 보이는 사유가 돼요.
        </p>
        <textarea
          id="cancellation-memo"
          name="memo"
          rows={3}
          maxLength={REVIEW_MEMO_MAX_LENGTH}
          aria-describedby={state.error === "note" || state.error === "memo" ? `cancellation-memo-hint ${errorId}` : "cancellation-memo-hint"}
          placeholder={`${REVIEW_MEMO_MAX_LENGTH}자까지`}
          className="rounded-2xl bg-surface-strong px-4 py-3 text-text placeholder:text-text-muted focus:outline-2 focus:outline-accent"
        />
      </div>
      {state.error && (
        <p id="cancellation-error" role="alert" className="text-sm font-semibold">
          {ERROR_MESSAGE[state.error]}
        </p>
      )}
      <Button type="submit" disabled={pending} className="self-start">
        처리하기
      </Button>
    </form>
  );
}

function Choice({ name, value, label, detail }: { name: string; value: string; label: string; detail?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-surface-strong px-4 py-3 has-checked:bg-line">
      <input type="radio" name={name} value={value} className="mt-1 accent-accent" />
      <span className="flex flex-col gap-1">
        <span className="text-sm font-bold">{label}</span>
        {detail && <span className="text-sm text-text-muted">{detail}</span>}
      </span>
    </label>
  );
}
