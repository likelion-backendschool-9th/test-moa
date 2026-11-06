"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { cancelRecruitment } from "../../../../../../features/project/actions";
import { EMPTY_FORM_STATE, RECRUITMENT_LIMIT, type FormState } from "../../../../../../features/project/types";
import { TextField } from "../../../../../../components/ui/TextField";

/*
 * 모집 취소 버튼과 확인 대화상자. 운영자 승인 없이 바로 취소된다.
 * 테스트 중에는 사유를 받고, 테스트 전에는 확인만 받는다. 취소하면 서버가 화면을 다시 그린다.
 * 대화상자는 기본 dialog를 써서 Esc 닫기와 포커스 복귀를 브라우저에 맡긴다.
 */

type CancelRecruitmentButtonProps = { recruitmentKey: string; reasonRequired: boolean };

/** "모집 취소" 버튼. 누르면 확인 대화상자가 열린다 */
export function CancelRecruitmentButton({ recruitmentKey, reasonRequired }: CancelRecruitmentButtonProps) {
  const [state, formAction, pending] = useActionState<FormState & { ok?: boolean }, FormData>(
    cancelRecruitment.bind(null, recruitmentKey),
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
        모집 취소
      </Button>
      <dialog
        ref={dialogRef}
        aria-labelledby="cancel-title"
        className="m-auto w-full max-w-md rounded-2xl bg-surface-muted p-6 text-text backdrop:bg-text/50"
      >
        <form action={formAction} noValidate className="flex flex-col gap-4">
          <h2 id="cancel-title" className="text-xl font-extrabold tracking-[-0.03em]">
            모집을 취소할까요?
          </h2>
          <p className="text-sm text-text-muted">
            {reasonRequired
              ? "중대한 사유로 테스트를 진행할 수 없을 때만 취소해 주세요. 취소하면 되돌릴 수 없어요. 피드백을 내지 않은 테스터의 참여는 취소되고, 이미 낸 피드백의 보상은 그대로 지급돼요."
              : "취소하면 바로 모집이 닫히고 되돌릴 수 없어요. 대기 중인 지원도 함께 취소돼요."}
          </p>
          {reasonRequired ? (
            <TextField
              name="reason"
              label="취소 사유"
              multiline
              defaultValue={state.values.reason}
              error={state.errors.reason}
              hint={`${RECRUITMENT_LIMIT.cancelReasonLength}자까지`}
            />
          ) : (
            state.errors.reason && (
              <p role="alert" className="text-sm font-semibold">
                {state.errors.reason}
              </p>
            )
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => dialogRef.current?.close()}>
              닫기
            </Button>
            <Button type="submit" disabled={pending}>
              모집 취소하기
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
