"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button/Button";
import { FormMessage } from "@/components/ui/FormField/FormField";
import { LinkButton } from "@/components/ui/LinkButton/LinkButton";
import { PARTICIPATIONS_PATH } from "@/features/participation/paths";
import { applyToRecruitment } from "@/features/recruitment/actions";
import type { ApplyState } from "@/features/recruitment/types";
import styles from "./ApplyForm.module.css";

/*
 * 지원 버튼과 결과. 지원은 입력값이 없어 버튼 하나로 제출한다.
 * 지원에 성공하면 화면이 다시 그려져 서버는 "이미 지원"을 알려 온다. 방금 지원한 안내가 먼저 보이도록 결과를 먼저 본다
 */

const INITIAL: ApplyState = { status: "idle" };

export function ApplyForm({ slug, hint, blockedMessage }: { slug: string; hint: string; blockedMessage: string | null }) {
  const [state, formAction, pending] = useActionState<ApplyState, FormData>(applyToRecruitment.bind(null, slug), INITIAL);
  if (state.status === "done") {
    return (
      <div className={styles.root}>
        <FormMessage
          status="success"
          message={state.confirmed ? "지원했어요. 참여가 확정됐어요." : "지원했어요. 개발자가 확정하면 참여가 시작돼요."}
        />
        <LinkButton href={PARTICIPATIONS_PATH}>내 참여 보기</LinkButton>
      </div>
    );
  }
  if (blockedMessage !== null) {
    return (
      <p role="status" className={styles.blocked}>
        {blockedMessage}
      </p>
    );
  }
  return (
    <form action={formAction} className={styles.root}>
      <p className={styles.hint}>{hint}</p>
      {state.status === "error" && <FormMessage status="error" message={state.message} />}
      <Button type="submit" disabled={pending}>
        지원하기
      </Button>
    </form>
  );
}
