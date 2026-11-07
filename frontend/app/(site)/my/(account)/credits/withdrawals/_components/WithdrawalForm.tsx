"use client";

import { CaretDownIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { type FormEvent, type ReactNode, startTransition, useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cardClass, cardTitleClass } from "@/app/(site)/my/(account)/_components/card-styles";
import { formatCredits, formatWon } from "@/lib/format";
import { requestWithdrawal, type WithdrawalField, type WithdrawalFormState } from "@/features/credit/actions";
import { BANKS } from "@/features/credit/types";

const initialState: WithdrawalFormState = { status: "idle" };

/*
 * 금액·계좌를 다루는 폼이라 알약 대신 12px 모서리를 쓴다 (DESIGN.md The Money Field Rule).
 * 입력·선택·버튼은 모두 높이 3rem이고, 라벨·안내·오류는 입력 글자와 같은 1rem에서 시작한다
 */
const fieldClass =
  "h-12 w-full rounded-xl bg-surface-strong px-4 text-base outline-none focus:bg-surface-muted focus:ring-2 focus:ring-accent aria-invalid:ring-2 aria-invalid:ring-text";
const insetTextClass = "px-4 text-sm";

/** 출금 신청 폼. 입력 검사는 서버에서 하고, 성공하면 칸을 비운다 */
export function WithdrawalForm({ cashable }: { cashable: number }) {
  const [state, formAction, pending] = useActionState(requestWithdrawal, initialState);
  const disabled = cashable <= 0;

  /*
   * 칸을 비우는 기준. 성공 응답이 올 때만 바뀌고 뒤이은 오류에서는 그대로라서, 성공 뒤 실패해도 입력이 남는다.
   * 렌더 중에 이전 응답과 비교해 갱신한다 (effect를 쓰면 한 번 비운 칸이 깜박인다)
   */
  const [resetKey, setResetKey] = useState(0);
  const [lastState, setLastState] = useState(state);
  if (state !== lastState) {
    setLastState(state);
    if (state.status === "success") setResetKey(state.submittedAt);
  }

  /* React가 폼 액션 뒤 칸을 자동으로 비우지 않게 직접 제출한다. 오류가 나도 입력이 남는다 */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  const errors = state.status === "error" ? state.errors : {};
  return (
    <section aria-labelledby="withdrawal-form-heading" className={cardClass}>
      <div className="flex flex-col gap-1">
        <h2 id="withdrawal-form-heading" className={cardTitleClass}>
          출금 신청
        </h2>
        <p className="text-sm text-text-muted">
          출금 가능 <span className="font-semibold text-text tabular-nums">{formatCredits(cashable)}</span> · 1크레딧은 1원이에요.
          이벤트 크레딧은 출금할 수 없어요.
        </p>
      </div>
      {disabled && <p className="text-sm font-semibold">출금할 수 있는 크레딧이 없어요</p>}
      {errors.form && <p className="text-sm font-semibold">{errors.form}</p>}
      {state.status === "success" && (
        <p role="status" className="rounded-xl bg-accent-soft px-4 py-3 text-sm font-semibold text-accent">
          {state.message}
        </p>
      )}
      <form onSubmit={handleSubmit} noValidate>
        {/* 성공할 때마다 새로 그려 입력을 비운다 */}
        <Fields
          key={resetKey}
          cashable={cashable}
          disabled={disabled}
          pending={pending}
          errors={errors}
        />
      </form>
    </section>
  );
}

type FieldsProps = {
  cashable: number;
  disabled: boolean;
  pending: boolean;
  errors: Partial<Record<WithdrawalField | "form", string>>;
};

function Fields({ cashable, disabled, pending, errors }: FieldsProps) {
  const [amount, setAmount] = useState("");
  const amountNumber = /^\d+$/.test(amount) ? Number(amount) : 0;
  return (
    <div className="flex flex-col gap-6">
      <fieldset disabled={disabled} className="grid gap-x-4 gap-y-5 md:grid-cols-2">
        <Field id="withdrawal-amount" label="금액(크레딧)" error={errors.amount}>
          <div className="flex gap-2">
            <input
              id="withdrawal-amount"
              name="amount"
              inputMode="numeric"
              autoComplete="off"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              aria-invalid={errors.amount ? true : undefined}
              aria-describedby={errors.amount ? "withdrawal-amount-error" : "withdrawal-amount-summary"}
              className={fieldClass}
            />
            <Button type="button" variant="secondary" shape="field" onClick={() => setAmount(String(cashable))} className="h-12 shrink-0 py-0">
              전액
            </Button>
          </div>
        </Field>
        <Field id="withdrawal-bank" label="은행" error={errors.bank}>
          <div className="relative">
            <select
              id="withdrawal-bank"
              name="bank"
              defaultValue=""
              aria-invalid={errors.bank ? true : undefined}
              aria-describedby={errors.bank ? "withdrawal-bank-error" : undefined}
              className={`${fieldClass} select-field pr-11`}
            >
              {/* 안내 문구는 칸에만 보이고 펼친 목록에는 넣지 않는다 */}
              <option value="" hidden>
                은행 선택
              </option>
              {BANKS.map((bank) => (
                <option key={bank} value={bank}>
                  {bank}
                </option>
              ))}
            </select>
            <CaretDownIcon
              aria-hidden
              size={16}
              weight="bold"
              className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-text-muted"
            />
          </div>
        </Field>
        <Field id="withdrawal-account" label="계좌번호" error={errors.account}>
          <input
            id="withdrawal-account"
            name="account"
            inputMode="numeric"
            autoComplete="off"
            placeholder="숫자만 입력"
            aria-invalid={errors.account ? true : undefined}
            aria-describedby={errors.account ? "withdrawal-account-error" : undefined}
            className={fieldClass}
          />
        </Field>
        <Field id="withdrawal-holder" label="예금주" error={errors.holder}>
          <input
            id="withdrawal-holder"
            name="holder"
            autoComplete="name"
            aria-invalid={errors.holder ? true : undefined}
            aria-describedby={errors.holder ? "withdrawal-holder-error" : undefined}
            className={fieldClass}
          />
        </Field>
      </fieldset>
      {/* 마지막 칸(예금주) 바로 아래 오른쪽에서 끝난다. 누르기 직전에 받을 금액을 한 번 더 보여 준다 */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-end md:gap-4">
        <p id="withdrawal-amount-summary" className="text-sm text-text-muted">
          받을 금액 <span className="text-lg font-extrabold text-text tabular-nums">{formatWon(amountNumber)}</span>
        </p>
        <Button type="submit" shape="field" disabled={disabled || pending} className="w-full md:w-auto">
          {pending ? "신청하는 중…" : "출금 신청"}
        </Button>
      </div>
    </div>
  );
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className={`${insetTextClass} font-semibold`}>
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className={`${insetTextClass} flex items-center gap-1 font-semibold`}>
          <WarningCircleIcon aria-hidden size={16} weight="bold" />
          {error}
        </p>
      )}
    </div>
  );
}
