"use client";

import { FlagIcon } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { ReportDialog } from "@/features/report/components/ReportDialog/ReportDialog";
import styles from "./ReportRecruitmentButton.module.css";

/** 모집 요약 맨 아래의 "모집 글 신고하기"(#85). 누르면 신고 창이 열리고, 닫으면 이 버튼으로 포커스가 돌아온다 */
export function ReportRecruitmentButton({ recruitmentKey, projectName }: { recruitmentKey: string; projectName: string }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={buttonRef} type="button" onClick={() => setOpen(true)} className={styles.button}>
        <FlagIcon aria-hidden size={16} weight="bold" />
        모집 글 신고하기
      </button>
      {open && (
        <ReportDialog
          subject={{ kind: "recruitment", recruitmentKey }}
          title="모집 글 신고"
          description={`"${projectName}" 모집 글을 신고해요.`}
          onClose={() => {
            setOpen(false);
            requestAnimationFrame(() => buttonRef.current?.focus());
          }}
        />
      )}
    </>
  );
}
