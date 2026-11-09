"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useId, useRef } from "react";
import { Button } from "@/components/ui/Button/Button";
import { restoreAccount } from "@/features/auth/actions";
import styles from "./RestorePrompt.module.css";

type RestorePromptProps = {
  /** 창에서 부를 닉네임. 없으면 "이 계정" */
  nickname?: string;
  /** 삭제 예정일 ("12월 10일"). 없으면 날짜 문장을 뺀다 */
  purgeDate?: string;
};

/**
 * 탈퇴 유예 계정이 로그인하면 로그인 화면 위에 바로 뜨는 창(#84). 탈퇴를 취소하면 그대로 로그인한다.
 * 브라우저 기본 dialog라 Esc 닫기·포커스 가두기를 브라우저에 맡기고, 닫으면 주소의 restore=1을 지워 다시 뜨지 않게 한다
 */
export function RestorePrompt({ nickname, purgeDate }: RestorePromptProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [, action, pending] = useActionState(async () => restoreAccount(), undefined);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const subject = nickname ? `${nickname} 님의 계정은` : "이 계정은";
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-text`}
      onClose={() => router.replace("/login")}
      className={styles.dialog}
    >
      <form action={action} className={styles.form}>
        <div className={styles.head}>
          <h2 id={`${id}-title`} className={styles.title}>
            탈퇴 신청을 취소할 수 있어요
          </h2>
          <p id={`${id}-text`} className={styles.text}>
            {purgeDate ? `${subject} ${purgeDate}에 완전히 삭제될 예정이에요. ` : ""}취소하면 탈퇴 신청 전과 똑같이 이용할 수 있어요.
          </p>
        </div>
        <div className={styles.actions}>
          <Button type="submit" disabled={pending} className={styles.button}>
            {pending ? "취소하는 중…" : "탈퇴 취소하고 로그인"}
          </Button>
          <button type="button" className={styles.link} onClick={() => dialogRef.current?.close()}>
            다른 계정으로 로그인
          </button>
        </div>
      </form>
    </dialog>
  );
}
