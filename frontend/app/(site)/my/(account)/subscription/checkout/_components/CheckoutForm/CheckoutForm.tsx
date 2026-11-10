"use client";

import { WarningCircleIcon } from "@phosphor-icons/react";
import { useActionState, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button/Button";
import { formatCredits, formatDate, formatWon } from "@/lib/format";
import { payForSubscription, type CheckoutFormState } from "@/features/subscription/actions";
import { isMobileUserAgent, PG_LABEL, PG_PROVIDERS, tossPopupPath, type PgProvider } from "@/features/subscription/pg";
import { openTossWindow } from "@/features/subscription/toss-window";
import type { CheckoutPeriod, SubscriptionPlan } from "@/features/subscription/types";
import { AccountCard, AccountCardTitle } from "@/app/(site)/my/(account)/_components/AccountCard/AccountCard";
import { usePaymentPopup } from "./usePaymentPopup";
import styles from "./CheckoutForm.module.css";

const initialState: CheckoutFormState = { status: "idle" };

const DAY_MS = 24 * 60 * 60 * 1000;

const POPUP_BLOCKED = "팝업이 막혀 있어요. 주소창 오른쪽에서 이 사이트의 팝업을 허용한 뒤 결제하기를 다시 눌러 주세요";

/* PC 브라우저만 결제창을 팝업으로 연다. 서버 렌더에서는 알 수 없어서 PC로 본다 */
const noSubscription = () => () => {};
function useMobile(): boolean {
  return useSyncExternalStore(noSubscription, () => isMobileUserAgent(navigator.userAgent), () => false);
}

type Method = "credit" | "cash";

type CheckoutFormProps = {
  plans: SubscriptionPlan[];
  /** 서버가 플랜마다 계산한 이용 기간. 없으면(목업) 만료일과 기간으로 직접 계산한다 */
  periods: Record<string, CheckoutPeriod> | null;
  /** 지금 쓸 수 있는 현금 결제 대행사. 없으면(목업) 대행사 칸을 보이지 않고 시연용 현금 결제를 한다 */
  providers: PgProvider[] | null;
  /** 결제창에서 취소·실패하고 돌아왔을 때의 안내 */
  notice: string | null;
  payableCredits: number;
  /** 구독 중이면 지금 만료일. 결제하면 이 날부터 이어진다 */
  activeUntil: string | null;
  now: string;
};

/*
 * 구독 결제 폼. 금액을 다루는 폼이라 고르는 칸과 버튼 모두 12px 모서리를 쓴다 (DESIGN.md The Money Field Rule).
 * 고른 상품·결제 수단에 따라 금액과 이용 기간을 버튼 바로 위에서 한 번 더 보여 준다
 */
export function CheckoutForm({ plans, periods, providers, notice, payableCredits, activeUntil, now }: CheckoutFormProps) {
  const [state, formAction, pending] = useActionState(payForSubscription, initialState);
  /* 서버가 토스 결제 준비를 마치면 브라우저가 토스 결제창을 연다. 열리면 페이지가 토스로 이동하고, 돌아오면(창을 닫음·열지 못함) 결과 문구를 남긴다 */
  const [opened, setOpened] = useState<{ state: CheckoutFormState; message: string } | null>(null);
  /* 결제 팝업(#252). 팝업을 결과 없이 닫았거나 브라우저가 막았을 때의 안내를 남기고, 다시 결제하면 지운다 */
  const [popupNotice, setPopupNotice] = useState<string | null>(null);
  const popup = usePaymentPopup(() => setPopupNotice("결제를 취소했어요"));
  const mobile = useMobile();
  const tossOpening = state.status === "toss" && opened?.state !== state && !popup.opened;
  const tossError = opened?.state === state ? opened.message : null;
  /* 개발 모드의 효과 두 번 실행에도 같은 결제창을 두 번 열지 않는다(토스가 이미 열린 창이 있다고 거절한다) */
  const started = useRef<CheckoutFormState | null>(null);
  const bannerRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (started.current === state) return;
    started.current = state;
    if (state.status === "kakao") popup.navigate(state.url);
    else if (state.status === "toss" && popup.opened) popup.navigate(tossPopupPath(state.window));
    else if (state.status === "toss") openTossWindow(state.window).then((message) => setOpened({ state, message }));
    else if (state.status === "error") popup.close();
  }, [state, popup]);
  /* 안내가 새로 뜨면(결제창을 닫음) 화면을 많이 내려 둔 경우에도 보이게 한다 */
  const bannerText = tossError ?? popupNotice ?? notice;
  useEffect(() => {
    if (bannerText) bannerRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [bannerText]);
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
  const [chosenProvider, setChosenProvider] = useState<PgProvider | null>(null);
  const provider = chosenProvider && providers?.includes(chosenProvider) ? chosenProvider : (providers?.[0] ?? null);
  if (!plan) return null;
  /* 서버가 준 대행사 목록이 있는 백엔드 모드의 현금 결제만 대행사를 고른다. 쓸 수 있는 곳이 없으면 현금 결제를 막는다 */
  const askProvider = method === "cash" && providers !== null;
  const noProvider = askProvider && provider === null;
  const popupMode = askProvider && provider !== null && !mobile;

  const serverPeriod = periods?.[plan.id];
  const startsAt = serverPeriod?.startAt ?? activeUntil ?? now;
  const endsAt = serverPeriod?.endAt ?? new Date(new Date(startsAt).getTime() + plan.periodDays * DAY_MS).toISOString();
  const price = method === "credit" ? formatCredits(plan.creditPrice) : formatWon(plan.cashPrice);
  /* 결제를 취소했거나 결제창을 열지 못한 안내는 버튼 옆의 작은 글씨로는 놓치기 쉬워서 카드 위쪽에 눈에 띄게 보인다. 서버가 거절한 이유는 버튼 위에 그대로 둔다 */
  const banner = tossError ?? popupNotice ?? notice ?? undefined;
  const error = state.status === "error" ? state.error : undefined;
  const busy = pending || tossOpening || popup.opened;

  return (
    <AccountCard
      as="form"
      action={formAction}
      onSubmit={(event: React.FormEvent) => {
        setPopupNotice(null);
        /* 응답을 기다린 뒤에는 브라우저가 팝업을 막으므로 누른 순간에 연다. 막히면 서버에 결제를 준비시키지 않고 허용 방법을 안내한다 */
        if (popupMode && provider && !popup.open(provider)) {
          event.preventDefault();
          setPopupNotice(POPUP_BLOCKED);
        }
      }}
      aria-labelledby="checkout-heading"
    >
      {popupMode && <input type="hidden" name="popup" value="1" />}
      <AccountCardTitle id="checkout-heading">
        {activeUntil ? "구독 연장" : "구독 시작"}
      </AccountCardTitle>
      {banner && (
        <p ref={bannerRef} role="alert" className={styles.notice}>
          <WarningCircleIcon aria-hidden size={20} weight="bold" />
          {banner}
        </p>
      )}
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

      {askProvider && (
        <fieldset key={`provider-${responses}`} className={styles.fieldset2}>
          <legend className={styles.legend2}>결제 대행사</legend>
          {PG_PROVIDERS.map((item) => (
            <Choice
              key={item}
              name="provider"
              value={item}
              checked={provider === item}
              disabled={!providers?.includes(item)}
              onChange={() => setChosenProvider(item)}
              label={PG_LABEL[item]}
              detail={providers?.includes(item) ? undefined : "지금은 쓸 수 없어요"}
            />
          ))}
        </fieldset>
      )}

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
        {popup.opened ? (
          <p role="status" className={styles.text3}>
            결제창이 열려 있어요. 결제를 마치면 이 화면이 자동으로 바뀌어요.{" "}
            <button type="button" className={styles.link} onClick={popup.focus}>
              결제창 앞으로 가져오기
            </button>
          </p>
        ) : (
          <p className={styles.text3}>자동으로 갱신되지 않아요. 만료일이 지나면 무료로 돌아가요.</p>
        )}
        <Button type="submit" shape="field" disabled={busy || noProvider} className={styles.button}>
          {busy ? "결제하는 중…" : `${price} 결제하기`}
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
