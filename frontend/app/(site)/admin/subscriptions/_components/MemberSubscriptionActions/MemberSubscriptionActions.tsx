"use client";

import { WarningCircleIcon } from "@phosphor-icons/react";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button/Button";
import { cn } from "@/lib/cn";
import { changeMemberSubscription, type MemberSubscriptionFormState } from "@/features/subscription/actions";
import styles from "./MemberSubscriptionActions.module.css";

const initialState: MemberSubscriptionFormState = { status: "idle" };

/**
 * "구독 주기"와 "구독 빼기". 한 양식에서 누른 버튼의 intent 값으로 나눈다.
 * 결제는 남지 않는 시연·확인용이다. 결과는 버튼 아래에 알린다
 */
export function MemberSubscriptionActions({ email, active }: { email: string; active: boolean }) {
  const [state, formAction, pending] = useActionState(changeMemberSubscription, initialState);
  return (
    <form action={formAction} className={styles.actions} aria-label="구독 주기·빼기">
      <input type="hidden" name="email" value={email} />
      <Button type="submit" name="intent" value="grant" size="sm" disabled={pending}>
        구독 주기
      </Button>
      {active && (
        <Button type="submit" name="intent" value="revoke" variant="secondary" size="sm" disabled={pending}>
          구독 빼기
        </Button>
      )}
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
    </form>
  );
}
