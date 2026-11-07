"use client";

import { type FormEvent, type ReactNode, startTransition, useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { REVIEW_MEMO_MAX_LENGTH } from "@/features/report/types";
import { type RequestFormError, type RequestFormState } from "@/features/credit/types";

const initialState: RequestFormState = { error: null };

const panelClass = "flex flex-col gap-4 rounded-2xl bg-surface-muted p-6 md:p-8";

type RequestReviewFormProps = {
  /** 처리 Server Action. 막히면 오류를 돌려주고, 처리되면 목록으로 이동한다 */
  action: (prev: RequestFormState, formData: FormData) => Promise<RequestFormState>;
  /** 요청 키를 담을 숨은 칸 이름(withdrawalKey)과 값 */
  keyName: string;
  keyValue: string;
  /** 같은 화면에 양식이 하나라 id 앞에 붙인다 */
  idPrefix: string;
  /** 반려가 아닌 결과(지급 완료) */
  accept: { value: string; label: string; detail: string };
  rejectDetail: string;
  reasons: Record<string, string>;
  /** 반려 사유를 보는 사람(회원) */
  audience: string;
  /** 시연용 처리 기록 쿠키. 저장 공간이 모자랄 때 안내에 쓴다 */
  cookieName: string;
  /** 목록 탭 등 추가 숨은 칸 */
  extraFields?: ReactNode;
};

/**
 * 출금 처리 양식. 확인은 서버에서 하고, 막히면 페이지를 옮기지 않고 오류만 보여 준다.
 * 그래서 고른 결과·사유와 메모가 그대로 남고, 주소나 방문 기록에 메모가 실리지 않는다.
 */
export function RequestReviewForm({
  action,
  keyName,
  keyValue,
  idPrefix,
  accept,
  rejectDetail,
  reasons,
  audience,
  cookieName,
  extraFields,
}: RequestReviewFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const errorId = `${idPrefix}-error`;
  const hintId = `${idPrefix}-memo-hint`;
  const describedBy = state.error ? errorId : undefined;
  const errorMessage: Record<RequestFormError, string> = {
    decision: "처리 결과를 골라 주세요.",
    reason: "반려 사유를 골라 주세요.",
    note: `${audience}에게 보여 줄 사유를 적어 주세요.`,
    memo: `시연용 저장 공간이 모자라 처리하지 못했어요. 메모를 줄이거나 ${cookieName} 쿠키를 지운 뒤 다시 시도해 주세요.`,
  };

  /* React가 폼 액션 뒤 칸을 자동으로 비우지 않게 직접 제출한다 (크레딧 출금 신청 폼과 같다) */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} aria-labelledby={`${idPrefix}-review-heading`} className={`${panelClass} group/review`}>
      <h3 id={`${idPrefix}-review-heading`} className="text-lg font-extrabold">
        처리하기
      </h3>
      <input type="hidden" name={keyName} value={keyValue} />
      {extraFields}
      <fieldset className="flex flex-col gap-3" aria-describedby={state.error === "decision" ? describedBy : undefined}>
        <legend className="mb-3 text-sm font-semibold">처리 결과</legend>
        <Choice name="decision" value={accept.value} label={accept.label} detail={accept.detail} />
        <Choice name="decision" value="rejected" label="반려" detail={rejectDetail} />
      </fieldset>
      {/*
       * 반려 사유와 메모는 "반려"를 골랐을 때만 보인다. 상태 대신 CSS(:has)로 숨겨서 서버에서 그린 첫 화면부터 맞고,
       * 자바스크립트가 없어도 반려할 수 있다. 숨겨도 고른 값은 남고, 반려가 아니면 서버가 사유·메모를 쓰지 않는다.
       */}
      <div className="hidden flex-col gap-4 group-has-[input[name=decision][value=rejected]:checked]/review:flex">
        <fieldset className="flex flex-col gap-3" aria-describedby={state.error === "reason" ? describedBy : undefined}>
          <legend className="mb-3 text-sm font-semibold">반려 사유</legend>
          {Object.entries(reasons).map(([reason, label]) => (
            <Choice key={reason} name="reason" value={reason} label={label} />
          ))}
        </fieldset>
        <div className="flex flex-col gap-2 text-sm">
          <label htmlFor={`${idPrefix}-memo`} className="font-semibold">
            반려 메모
          </label>
          {/* placeholder는 입력하면 사라져서 안내는 늘 보이게 둔다 */}
          <p id={hintId} className="text-text-muted">
            메모는 {audience}에게 그대로 보여요. 사유가 &ldquo;기타&rdquo;이면 꼭 적고, 다른 사유는 필요할 때만 적어요.
          </p>
          <textarea
            id={`${idPrefix}-memo`}
            name="memo"
            rows={3}
            maxLength={REVIEW_MEMO_MAX_LENGTH}
            aria-describedby={state.error === "note" || state.error === "memo" ? `${hintId} ${errorId}` : hintId}
            placeholder={`${REVIEW_MEMO_MAX_LENGTH}자까지`}
            className="rounded-2xl bg-surface-strong px-4 py-3 text-text placeholder:text-text-muted focus:outline-2 focus:outline-accent"
          />
        </div>
      </div>
      {state.error && (
        <p id={errorId} role="alert" className="text-sm font-semibold">
          {errorMessage[state.error]}
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
