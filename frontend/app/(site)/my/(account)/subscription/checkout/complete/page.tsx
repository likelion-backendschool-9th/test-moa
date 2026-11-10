import { CheckCircleIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LinkButton } from "@/components/ui/LinkButton/LinkButton";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { requireMember } from "@/features/session/guard";
import { getPaymentReceipt } from "@/features/subscription/api";
import { isJustPaid, parsePaymentId, receiptMethodLabel } from "@/features/subscription/pg";
import { isBackendAuth } from "@/lib/backend";
import { formatCredits, formatDate, formatDateTime, formatWon } from "@/lib/format";
import { PopupReturn } from "@/app/(site)/my/(account)/subscription/checkout/_components/PopupReturn/PopupReturn";
import { AccountCard } from "@/app/(site)/my/(account)/_components/AccountCard/AccountCard";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "구독 결제 완료" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/*
 * 구독 결제를 마친 뒤 보는 확인 화면(#249). 백엔드 모드에서 크레딧·카카오페이·토스 결제가 끝나면 이리로 온다(`?paid=1`).
 * 구독 화면의 결제 내역에서도 한 건을 누르면 이 화면이 열리고(`paid` 없음) 제목이 "결제 내역"이다.
 * `?payment=`의 결제를 서버의 내 결제 이력에서 읽어 보여 주고, 없으면 안내와 구독 화면 링크를 보인다.
 * 목업은 결제를 서버에 남기지 않아서 이 화면 없이 구독 화면의 안내로 끝난다
 */
export default function CheckoutCompletePage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className={styles.completePage}>
      <PopupReturn />
      <Suspense fallback={<CompleteSkeleton />}>
        <Complete searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Complete({ searchParams }: { searchParams: SearchParams }) {
  await requireMember("/my/subscription/checkout/complete");
  if (!isBackendAuth) redirect("/my/subscription");
  const query = await searchParams;
  const paymentId = parsePaymentId(query.payment);
  const justPaid = isJustPaid(query.paid);
  const receipt = paymentId ? await getPaymentReceipt(paymentId) : null;
  if (!receipt) {
    return (
      <AccountCard as="section" aria-labelledby="complete-heading" className={styles.complete}>
        <h1 id="complete-heading" className={styles.completeTitle}>
          결제 내역을 찾지 못했어요
        </h1>
        <p className={styles.completeText}>구독 화면에서 구독 상태를 확인해 주세요.</p>
        <div className={styles.completeActions}>
          <LinkButton href="/my/subscription" size="sm">
            구독 보기
          </LinkButton>
        </div>
      </AccountCard>
    );
  }
  const amount = receipt.method === "CREDIT" ? formatCredits(receipt.amount) : formatWon(receipt.amount);
  return (
    <AccountCard as="section" aria-labelledby="complete-heading" className={styles.complete}>
      <div className={styles.completeHead}>
        <CheckCircleIcon aria-hidden size={40} weight="fill" className={styles.completeIcon} />
        <h1 id="complete-heading" className={styles.completeTitle}>
          {justPaid ? "결제가 완료됐어요" : "결제 내역"}
        </h1>
        <p role={justPaid ? "status" : undefined} className={styles.completeText}>
          {formatDate(receipt.period.endAt)}까지 구독 혜택을 쓸 수 있어요.
        </p>
      </div>
      <dl className={styles.list}>
        <Row term="상품" value={receipt.plan} />
        <Row term="결제 수단" value={receiptMethodLabel(receipt)} />
        <Row term="결제 시각" value={formatDateTime(receipt.paidAt)} />
        <Row term="이용 기간" value={`${formatDate(receipt.period.startAt)} ~ ${formatDate(receipt.period.endAt)}`} />
        <div className={styles.total}>
          <dt className={styles.term}>결제 금액</dt>
          <dd className={styles.price}>{amount}</dd>
        </div>
      </dl>
      <div className={styles.completeActions}>
        <LinkButton href="/my/subscription" size="sm">
          구독 보기
        </LinkButton>
        <LinkButton href="/my" variant="secondary" size="sm">
          마이페이지
        </LinkButton>
      </div>
    </AccountCard>
  );
}

function Row({ term, value }: { term: string; value: string }) {
  return (
    <div className={styles.row}>
      <dt className={styles.term}>{term}</dt>
      <dd className={styles.value}>{value}</dd>
    </div>
  );
}

function CompleteSkeleton() {
  return (
    <AccountCard aria-busy="true" aria-label="결제 내역 불러오는 중" className={styles.complete}>
      <Skeleton className={styles.completeSkeleton} />
      <Skeleton className={styles.completeSkeleton2} />
      <Skeleton className={styles.completeSkeleton3} />
    </AccountCard>
  );
}
