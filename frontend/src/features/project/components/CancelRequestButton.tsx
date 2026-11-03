"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { requestCancel } from "../actions";
import { EMPTY_FORM_STATE, RECRUITMENT_LIMIT, type FormState } from "../types";
import { TextField } from "./TextField";

/*
 * 모집 취소 요청 버튼과 사유 입력 대화상자. 요청은 운영자가 승인하거나 반려한다(docs/frontend-admin-cancellations.md).
 * 보내고 나면 서버가 화면을 다시 그려 요청 상태(처리 대기)가 보인다.
 * 대화상자는 기본 dialog를 써서 Esc 닫기와 포커스 복귀를 브라우저에 맡긴다.
 */

type CancelRequestButtonProps = { projectKey: string; recruitmentKey: string };

/** "모집 취소 요청" 버튼. 누르면 사유를 적는 대화상자가 열린다 */
export function CancelRequestButton({ projectKey, recruitmentKey }: CancelRequestButtonProps) {
  const [state, formAction, pending] = useActionState<FormState & { ok?: boolean }, FormData>(
    requestCancel.bind(null, projectKey, recruitmentKey),
    EMPTY_FORM_STATE,
  );
  const dialogRef = useRef<HTMLDialogElement>(null);

  /* 저장되면 닫는다. 오류면 사유 칸으로 포커스를 옮긴다 */
  useEffect(() => {
    if (state.ok) dialogRef.current?.close();
    else if (state.errors.reason) dialogRef.current?.querySelector<HTMLElement>("#field-reason")?.focus();
  }, [state]);

  return (
    <>
      <Button type="button" size="sm" variant="secondary" onClick={() => dialogRef.current?.showModal()}>
        모집 취소 요청
      </Button>
      <dialog
        ref={dialogRef}
        aria-labelledby="cancel-title"
        className="m-auto w-full max-w-md rounded-2xl bg-surface-muted p-6 text-text backdrop:bg-text/50"
      >
        <form action={formAction} noValidate className="flex flex-col gap-4">
          <h2 id="cancel-title" className="text-xl font-extrabold tracking-[-0.03em]">
            모집 취소 요청
          </h2>
          <p className="text-sm text-text-muted">
            운영자가 확인한 뒤 승인하면 모집이 취소되고, 확정된 테스터의 참여도 함께 취소돼요. 테스트가 시작되기 전에만 요청할 수 있어요.
          </p>
          <TextField
            name="reason"
            label="취소 사유"
            multiline
            defaultValue={state.values.reason}
            error={state.errors.reason}
            hint={`${RECRUITMENT_LIMIT.cancelReasonLength}자까지`}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => dialogRef.current?.close()}>
              닫기
            </Button>
            <Button type="submit" disabled={pending}>
              요청 보내기
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
