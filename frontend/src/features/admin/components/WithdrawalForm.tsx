"use client";

import { type FormEvent, startTransition, useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { formatWon } from "@/lib/format";
import { processWithdrawal } from "../actions";
import {
  REJECT_REASONS,
  REVIEW_MEMO_MAX_LENGTH,
  type RejectReason,
  type WithdrawalFormError,
  type WithdrawalFormState,
} from "../types";

const initialState: WithdrawalFormState = { error: null };

const ERROR_MESSAGE: Record<WithdrawalFormError, string> = {
  decision: "처리 결과를 골라 주세요.",
  reason: "반려 사유를 골라 주세요.",
  note: "회원에게 보여 줄 사유를 적어 주세요.",
  memo: "시연용 저장 공간이 모자라 처리하지 못했어요. 메모를 줄이거나 demo-admin-withdrawals 쿠키를 지운 뒤 다시 시도해 주세요.",
};

const panelClass = "flex flex-col gap-4 rounded-2xl bg-surface-muted p-6 md:p-8";

type WithdrawalFormProps = { withdrawalKey: string; amount: number };

/**
 * 처리 양식. 확인은 서버에서 하고, 막히면 페이지를 옮기지 않고 오류만 보여 준다.
 * 그래서 고른 결과·사유와 메모가 그대로 남고, 주소나 방문 기록에 메모가 실리지 않는다.
 */
export function WithdrawalForm({ withdrawalKey, amount }: WithdrawalFormProps) {
  const [state, formAction, pending] = useActionState(processWithdrawal, initialState);
  const errorId = state.error ? "withdrawal-error" : undefined;

  /* React가 폼 액션 뒤 칸을 자동으로 비우지 않게 직접 제출한다 (크레딧 출금 신청 폼과 같다) */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} aria-labelledby="withdrawal-review-heading" className={panelClass}>
      <h3 id="withdrawal-review-heading" className="text-lg font-extrabold">
        처리하기
      </h3>
      <input type="hidden" name="withdrawalKey" value={withdrawalKey} />
      <fieldset className="flex flex-col gap-3" aria-describedby={state.error === "decision" ? errorId : undefined}>
        <legend className="mb-3 text-sm font-semibold">처리 결과</legend>
        <Choice
          name="decision"
          value="paid"
          label="지급 완료"
          detail={`${formatWon(amount)}을 계좌로 보냈어요. 잠긴 크레딧이 차감돼요.`}
        />
        <Choice name="decision" value="rejected" label="반려" detail="지급하지 않아요. 잠긴 크레딧이 회원에게 돌아가요." />
      </fieldset>
      <fieldset className="flex flex-col gap-3" aria-describedby={state.error === "reason" ? errorId : undefined}>
        <legend className="mb-3 text-sm font-semibold">반려 사유</legend>
        {(Object.keys(REJECT_REASONS) as RejectReason[]).map((reason) => (
          <Choice key={reason} name="reason" value={reason} label={REJECT_REASONS[reason]} />
        ))}
      </fieldset>
      <div className="flex flex-col gap-2 text-sm">
        <label htmlFor="withdrawal-memo" className="font-semibold">
          반려 메모
        </label>
        {/* placeholder는 입력하면 사라져서 안내는 늘 보이게 둔다 */}
        <p id="memo-hint" className="text-text-muted">
          반려할 때 운영자 기록으로 남아요. 사유가 &ldquo;기타&rdquo;이면 이 메모가 회원에게 보이는 사유가 돼요.
        </p>
        <textarea
          id="withdrawal-memo"
          name="memo"
          rows={3}
          maxLength={REVIEW_MEMO_MAX_LENGTH}
          aria-describedby={state.error === "note" || state.error === "memo" ? `memo-hint ${errorId}` : "memo-hint"}
          placeholder={`${REVIEW_MEMO_MAX_LENGTH}자까지`}
          className="rounded-2xl bg-surface-strong px-4 py-3 text-text placeholder:text-text-muted focus:outline-2 focus:outline-accent"
        />
      </div>
      {state.error && (
        <p id="withdrawal-error" role="alert" className="text-sm font-semibold">
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
