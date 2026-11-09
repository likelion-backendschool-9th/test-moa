"use client";

import { WarningCircleIcon } from "@phosphor-icons/react";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button/Button";
import { formatCredits, formatDate, formatWon } from "@/lib/format";
import { payForSubscription, type CheckoutFormState } from "@/features/subscription/actions";
import type { CheckoutPeriod, SubscriptionPlan } from "@/features/subscription/types";
import { AccountCard, AccountCardTitle } from "@/app/(site)/my/(account)/_components/AccountCard/AccountCard";
import styles from "./CheckoutForm.module.css";

const initialState: CheckoutFormState = { status: "idle" };

const DAY_MS = 24 * 60 * 60 * 1000;

type Method = "credit" | "cash";

type CheckoutFormProps = {
  plans: SubscriptionPlan[];
  /** 서버가 플랜마다 계산한 이용 기간. 없으면(목업) 만료일과 기간으로 직접 계산한다 */
  periods: Record<string, CheckoutPeriod> | null;
  payableCredits: number;
  /** 구독 중이면 지금 만료일. 결제하면 이 날부터 이어진다 */
  activeUntil: string | null;
  now: string;
};

/*
 * 구독 결제 폼. 금액을 다루는 폼이라 고르는 칸과 버튼 모두 12px 모서리를 쓴다 (DESIGN.md The Money Field Rule).
 * 고른 상품·결제 수단에 따라 금액과 이용 기간을 버튼 바로 위에서 한 번 더 보여 준다
 */
export function CheckoutForm({ plans, periods, payableCredits, activeUntil, now }: CheckoutFormProps) {
  const [state, formAction, pending] = useActionState(payForSubscription, initialState);
  /*
   * 서버 Action이 끝나면 React가 폼을 처음 상태로 되돌린다. 라디오는 처음 그릴 때의 선택(defaultChecked)으로 돌아가서,
   * 그 뒤 선택이 바뀌었거나 화면 값이 갱신됐으면 금액·버튼(현재 선택)과 라디오 모양이 어긋난다.
   * 응답이 올 때마다 선택 칸을 새로 그려 지금 선택을 기본값으로 삼는다
   */
  const [lastState, setLastState] = useState(state);
  const [responses, setResponses] = useState(0);
  if (lastState !== state) {
    setLastState(state);
    setResponses(responses + 1);
  }
  const [planId, setPlanId] = useState(plans[0]?.id);
  const plan = plans.find(({ id }) => id === planId) ?? plans[0];
  const affordable = plan ? payableCredits >= plan.creditPrice : false;
  const [chosen, setChosen] = useState<Method>(affordable ? "credit" : "cash");
  /* 크레딧이 모자란 상품으로 바꾸면 현금으로 돌린다 */
  const method: Method = chosen === "credit" && !affordable ? "cash" : chosen;
  if (!plan) return null;

  const serverPeriod = periods?.[plan.id];
  const startsAt = serverPeriod?.startAt ?? activeUntil ?? now;
  const endsAt = serverPeriod?.endAt ?? new Date(new Date(startsAt).getTime() + plan.periodDays * DAY_MS).toISOString();
  const price = method === "credit" ? formatCredits(plan.creditPrice) : formatWon(plan.cashPrice);
  const error = state.status === "error" ? state.error : undefined;

  return (
    <AccountCard as="form" action={formAction} aria-labelledby="checkout-heading">
      <AccountCardTitle id="checkout-heading">
        {activeUntil ? "구독 연장" : "구독 시작"}
      </AccountCardTitle>
      {activeUntil && (
        <p className={styles.text}>지금 구독은 {formatDate(activeUntil)}에 끝나요. 결제하면 그날부터 이어져요.</p>
      )}

      <fieldset key={`plan-${responses}`} className={styles.fieldset}>
        <legend className={styles.legend}>상품</legend>
        {plans.map((item) => (
          <Choice
            key={item.id}
            name="plan"
            value={item.id}
            checked={item.id === plan.id}
            onChange={() => setPlanId(item.id)}
            label={`${item.name} · ${item.periodDays}일`}
            detail={`현금 ${formatWon(item.cashPrice)} · ${formatCredits(item.creditPrice)}`}
          />
        ))}
      </fieldset>

      <fieldset key={`method-${responses}`} className={styles.fieldset2}>
        <legend className={styles.legend2}>결제 수단</legend>
        <Choice
          name="method"
          value="credit"
          checked={method === "credit"}
          disabled={!affordable}
          onChange={() => setChosen("credit")}
          label={`크레딧 ${formatCredits(plan.creditPrice)}`}
          detail={
            affordable
              ? `쓸 수 있는 크레딧 ${formatCredits(payableCredits)} · 현금보다 우대 가격이에요`
              : `쓸 수 있는 크레딧 ${formatCredits(payableCredits)} · ${formatCredits(plan.creditPrice - payableCredits)} 모자라요`
          }
        />
        <Choice
          name="method"
          value="cash"
          checked={method === "cash"}
          onChange={() => setChosen("cash")}
          label={`현금 ${formatWon(plan.cashPrice)}`}
        />
      </fieldset>

      <dl className={styles.list}>
        <div className={styles.box}>
          <dt className={styles.term}>이용 기간</dt>
          <dd className={styles.value}>
            {formatDate(startsAt)} ~ {formatDate(endsAt)}
          </dd>
        </div>
        {method === "credit" && (
          <div className={styles.box2}>
            <dt className={styles.term2}>결제 뒤 남는 크레딧</dt>
            <dd className={styles.value2}>{formatCredits(payableCredits - plan.creditPrice)}</dd>
          </div>
        )}
        <div className={styles.box3}>
          <dt className={styles.term3}>결제 금액</dt>
          <dd className={styles.price}>{price}</dd>
        </div>
      </dl>

      {error && (
        <p role="alert" className={styles.text2}>
          <WarningCircleIcon aria-hidden size={16} weight="bold" />
          {error}
        </p>
      )}
      <div className={styles.box4}>
        <p className={styles.text3}>자동으로 갱신되지 않아요. 만료일이 지나면 무료로 돌아가요.</p>
        <Button type="submit" shape="field" disabled={pending} className={styles.button}>
          {pending ? "결제하는 중…" : `${price} 결제하기`}
        </Button>
      </div>
    </AccountCard>
  );
}

type ChoiceProps = {
  name: string;
  value: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  label: string;
  detail?: string;
};

/** 고르는 칸 한 개. 고르면 바탕이 진해지고, 고를 수 없으면 흐려진다 (운영자 처리 폼과 같은 모양) */
function Choice({ name, value, checked, disabled, onChange, label, detail }: ChoiceProps) {
  return (
    <label className={styles.choice}>
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className={styles.choiceInput}
      />
      <span className={styles.choiceLabel}>
        <span className={styles.choiceLabel2}>{label}</span>
        {detail && <span className={styles.choiceDetail}>{detail}</span>}
      </span>
    </label>
  );
}
