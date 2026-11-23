"use client";

import { useActionState, useRef } from "react";
import { Button } from "@/components/ui/Button/Button";
import { Card } from "@/components/ui/Card/Card";
import { deleteProject, type DeleteProjectState } from "@/features/project/actions";
import styles from "./DeleteProjectButton.module.css";

/*
 * 프로젝트 삭제 버튼과 확인 대화상자. 확인하면 바로 지워지고 서버가 내 프로젝트 목록으로 보낸다.
 * 대화상자는 기본 dialog를 써서 Esc 닫기와 포커스 복귀를 브라우저에 맡긴다(모집 취소 대화상자와 같다).
 */

type DeleteProjectButtonProps = { projectKey: string; projectName: string };

/** "프로젝트 삭제" 버튼. 누르면 확인 대화상자가 열린다 */
export function DeleteProjectButton({ projectKey, projectName }: DeleteProjectButtonProps) {
  const [state, formAction, pending] = useActionState<DeleteProjectState, FormData>(deleteProject, {});
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <Button type="button" size="sm" variant="secondary" onClick={() => dialogRef.current?.showModal()}>
        프로젝트 삭제
      </Button>
      <Card as="dialog" ref={dialogRef} aria-labelledby="delete-project-title" className={styles.dialog}>
        <form action={formAction} className={styles.form}>
          <input type="hidden" name="projectKey" value={projectKey} />
          <h2 id="delete-project-title" className={styles.title}>
            프로젝트를 삭제할까요?
          </h2>
          <p className={styles.text}>
            &ldquo;{projectName}&rdquo;을 지우면 되돌릴 수 없어요. 연결한 GitHub 레포 정보도 함께 지워져요.
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
              삭제하기
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
