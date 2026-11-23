"use client";

import { useActionState, useRef } from "react";
import { Button } from "@/components/ui/Button/Button";
import { Card } from "@/components/ui/Card/Card";
import { cancelParticipation, type CancelParticipationState } from "@/features/participation/actions";
import styles from "./CancelParticipationButton.module.css";

/*
 * 지원 취소 버튼과 확인 대화상자. 확인하면 바로 취소되고 서버가 상세로 다시 보낸다.
 * 대화상자는 기본 dialog를 써서 Esc 닫기와 포커스 복귀를 브라우저에 맡긴다(모집 취소 대화상자와 같다).
 */

type CancelParticipationButtonProps = { participationKey: string; confirmed: boolean };

/** "지원 취소" 버튼. 누르면 확인 대화상자가 열린다 */
export function CancelParticipationButton({ participationKey, confirmed }: CancelParticipationButtonProps) {
  const [state, formAction, pending] = useActionState<CancelParticipationState, FormData>(cancelParticipation, {});
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <Button type="button" size="sm" variant="secondary" onClick={() => dialogRef.current?.showModal()}>
        지원 취소
      </Button>
      <Card as="dialog" ref={dialogRef} aria-labelledby="cancel-participation-title" className={styles.dialog}>
        <form action={formAction} className={styles.form}>
          <input type="hidden" name="participationKey" value={participationKey} />
          <h2 id="cancel-participation-title" className={styles.title}>
            지원을 취소할까요?
          </h2>
          <p className={styles.text}>
            {confirmed
              ? "참여가 확정된 테스트예요. 취소하면 접속 링크와 보상이 사라져요. 모집 기간 안이면 다시 지원할 수 있어요."
              : "취소하면 선정 대상에서 빠져요. 모집 기간 안이면 다시 지원할 수 있어요."}
          </p>
          {state.error && (
            <p role="alert" className={styles.error}>
              {state.error}
            </p>
          )}
          <div className={styles.box}>
            <Button type="button" variant="secondary" onClick={() => dialogRef.current?.close()}>
              닫기
            </Button>
            <Button type="submit" disabled={pending}>
              지원 취소하기
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
