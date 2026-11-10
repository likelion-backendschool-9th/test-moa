"use client";

import { WarningCircleIcon } from "@phosphor-icons/react";
import { useActionState } from "react";
import { AdminPanel } from "@/app/(site)/admin/_components/AdminPanel/AdminPanel";
import { Button } from "@/components/ui/Button/Button";
import { TextArea, TextInput } from "@/components/ui/TextField/TextField";
import { registerPlanTerms, saveFreePlanTerms, type PlanFormState } from "@/features/subscription/actions";
import { BENEFIT_MAX_COUNT, BENEFIT_MAX_LENGTH, PLAN_NAME_MAX_LENGTH } from "@/features/subscription/types";
import { cn } from "@/lib/cn";
import styles from "./PlanTermsForm.module.css";

const initialState: PlanFormState = { status: "idle" };

type Props =
  | { kind: "free"; title: string; name: string; benefits: string[] }
  | { kind: "subscription"; title: string; planId: string; name: string; benefits: string[] };

/**
 * 플랜 하나의 혜택 양식. 혜택은 한 줄에 하나다.
 * 무료는 이름도 고치고 바로 저장되며, 구독은 이름·가격·기간을 서버 값 그대로 두고 혜택만 고쳐 새 버전으로 등록한다.
 * 저장하면 서버 값으로 다시 그려지도록 값이 바뀌면 key로 새로 그린다
 */
export function PlanTermsForm(props: Props) {
  const isFree = props.kind === "free";
  const [state, formAction, pending] = useActionState(isFree ? saveFreePlanTerms : registerPlanTerms, initialState);
  const id = isFree ? "free" : `plan-${props.planId}`;
  return (
    <AdminPanel as="section" aria-label={props.title} className={styles.panel}>
      <h2 className={styles.title}>{props.title}</h2>
      <form key={props.benefits.join("\n")} action={formAction} className={styles.form} aria-label={`${props.title} 혜택`}>
        {props.kind === "subscription" && <input type="hidden" name="planId" value={props.planId} />}
        {isFree && (
          <div className={styles.field}>
            <label htmlFor={`${id}-name`} className={styles.label}>
              이름
            </label>
            <TextInput id={`${id}-name`} name="name" defaultValue={props.name} maxLength={PLAN_NAME_MAX_LENGTH} required />
          </div>
        )}
        <div className={styles.field}>
          <label htmlFor={`${id}-benefits`} className={styles.label}>
            혜택
          </label>
          <TextArea id={`${id}-benefits`} name="benefits" rows={5} defaultValue={props.benefits.join("\n")} aria-describedby={`${id}-hint`} />
          <p id={`${id}-hint`} className={styles.hint}>
            한 줄에 하나씩 쓰세요. {BENEFIT_MAX_COUNT}개까지, 한 줄 {BENEFIT_MAX_LENGTH}자까지, 쉼표는 쓸 수 없어요.
            {!isFree && " 저장하면 가격·기간은 그대로 새 버전이 만들어져요. 이미 구독한 회원의 조건은 그대로예요."}
          </p>
        </div>
        <div className={styles.actions}>
          <Button type="submit" size="sm" disabled={pending}>
            {isFree ? "저장" : "새 버전으로 저장"}
          </Button>
          {state.status === "done" && (
            <p role="status" className={styles.message}>
              {state.message}
            </p>
          )}
          {state.status === "error" && (
            <p role="alert" className={cn(styles.message, styles.error)}>
              <WarningCircleIcon aria-hidden size={16} weight="bold" />
              {state.error}
            </p>
          )}
        </div>
      </form>
    </AdminPanel>
  );
}
