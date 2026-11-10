"use client";

import { type ChangeEvent, useActionState, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button/Button";
import { Card } from "@/components/ui/Card/Card";
import { TextArea } from "@/components/ui/TextField/TextField";
import { submitReport } from "@/features/report/actions";
import { checkEvidence, REPORT_REASON_MAX, type ReportSubject, type ReportSubmitState } from "@/features/report/types";
import styles from "./ReportDialog.module.css";

type ReportDialogProps = {
  subject: ReportSubject;
  /** 제목 (예: "모집 글 신고") */
  title: string;
  /** 무엇을 신고하는지 한 줄 */
  description: string;
  /** 닫기(Esc, 바깥 클릭, 취소, 확인). 부모가 이 대화상자를 지운다 */
  onClose: () => void;
};

const initialState: ReportSubmitState = { status: "idle" };

/**
 * 모집 글·채팅방 신고 창(#85). 화면에 그려지면 바로 모달로 열린다.
 * 사유와 증거 파일(PNG·JPG·WEBP·PDF, 한 장 5MB, 5장까지)을 받고, 접수하면 결과를 내 신고에서 볼 수 있다고 알린다.
 */
export function ReportDialog({ subject, title, description, onClose }: ReportDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [state, action, pending] = useActionState(submitReport.bind(null, subject), initialState);
  /* 파일을 고르자마자 규칙을 알려, 큰 파일을 올리느라 기다리지 않게 한다 */
  const [fileError, setFileError] = useState<string | null>(null);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  function onFiles(event: ChangeEvent<HTMLInputElement>) {
    setFileError(checkEvidence([...(event.currentTarget.files ?? [])]));
  }

  const reasonError = state.status === "error" && state.field === "reason" ? state.message : undefined;
  const formError = fileError ?? (state.status === "error" && state.field !== "reason" ? state.message : undefined);
  return (
    <Card
      as="dialog"
      ref={ref}
      aria-labelledby={`${id}-title`}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) ref.current?.close();
      }}
      className={styles.dialog}
    >
      {state.status === "success" ? (
        <div className={styles.form}>
          <div className={styles.head}>
            <h2 id={`${id}-title`} className={styles.title}>
              신고를 접수했어요
            </h2>
            <p role="status" className={styles.text}>
              운영자가 검토한 결과는 마이페이지의 &lsquo;내 신고&rsquo;에서 볼 수 있어요.
            </p>
          </div>
          <div className={styles.actions}>
            <Button size="sm" onClick={() => ref.current?.close()}>
              확인
            </Button>
          </div>
        </div>
      ) : (
        <form action={action} noValidate className={styles.form}>
          <div className={styles.head}>
            <h2 id={`${id}-title`} className={styles.title}>
              {title}
            </h2>
            <p className={styles.text}>{description} 운영자가 검토하고, 신고한 사람은 상대에게 알리지 않아요.</p>
          </div>
          <div className={styles.field}>
            <label htmlFor={`${id}-reason`} className={styles.label}>
              신고 사유
            </label>
            <TextArea
              id={`${id}-reason`}
              name="reason"
              rows={4}
              maxLength={REPORT_REASON_MAX}
              required
              aria-invalid={reasonError ? true : undefined}
              aria-describedby={reasonError ? `${id}-reason-error` : undefined}
            />
            {reasonError && (
              <p id={`${id}-reason-error`} className={styles.error}>
                {reasonError}
              </p>
            )}
          </div>
          <div className={styles.field}>
            <label htmlFor={`${id}-files`} className={styles.label}>
              증거 파일 <span className={styles.optional}>(선택)</span>
            </label>
            <input
              id={`${id}-files`}
              name="files"
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp,application/pdf"
              onChange={onFiles}
              aria-describedby={`${id}-files-hint`}
              className={styles.file}
            />
            <p id={`${id}-files-hint`} className={styles.hint}>
              화면 캡처나 PDF를 5장까지 올릴 수 있어요 (PNG·JPG·WEBP·PDF, 한 장 5MB)
            </p>
          </div>
          {formError && (
            <p role="alert" className={styles.error}>
              {formError}
            </p>
          )}
          <div className={styles.actions}>
            <Button variant="ghost" size="sm" onClick={() => ref.current?.close()}>
              취소
            </Button>
            <Button type="submit" size="sm" disabled={pending || fileError !== null}>
              {pending ? "신고하는 중…" : "신고하기"}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
