import { CaretLeftIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LinkButton } from "@/components/ui/LinkButton/LinkButton";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { requireMember } from "@/features/session/guard";
import { approveCashPayment } from "@/features/subscription/api";
import { approvalFromQuery } from "@/features/subscription/pg";
import { AccountCard } from "@/app/(site)/my/(account)/_components/AccountCard/AccountCard";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "구독 결제 확인" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/*
 * 카카오페이·토스 결제창에서 돌아오는 주소(#249). 돌아온 값으로 서버에 승인을 요청하고,
 * 승인되면 구독 화면으로 보낸다. 승인하지 못하면 이 화면에 서버가 준 이유와 결제 화면으로 돌아가는 링크를 보인다.
 * 이 화면을 새로고침해도 서버가 같은 결제를 한 번만 승인해서 구독이 늘지 않는다
 */
export default function CheckoutResultPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className={styles.resultPage}>
      <Link href="/my/subscription/checkout" className={styles.resultPageLink}>
        <CaretLeftIcon aria-hidden size={16} weight="bold" />
        구독 결제
      </Link>
      <h1 className={styles.resultPageTitle}>구독 결제 확인</h1>
      <Suspense fallback={<ResultSkeleton />}>
        <Result searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Result({ searchParams }: { searchParams: SearchParams }) {
  /* 결제창에서 돌아온 값이 없어도 로그인한 회원만 이 화면을 본다(비로그인은 로그인 뒤 이 주소로 돌아온다) */
  await requireMember("/my/subscription/checkout/result");
  const approval = approvalFromQuery(await searchParams);
  let message = "결제 정보를 확인하지 못했어요. 결제 화면에서 다시 시도해 주세요";
  if (approval) {
    const approved = await approveCashPayment(approval);
    /* 새 구독 상태는 구독 화면이 요청마다 서버에서 읽는다 */
    if (approved.ok) redirect("/my/subscription?notice=paid");
    message = approved.message;
  }
  return (
    <AccountCard as="section" aria-labelledby="result-heading" className={styles.result}>
      <p id="result-heading" role="alert" className={styles.resultText}>
        결제를 완료하지 못했어요
      </p>
      <p className={styles.resultMessage}>{message}</p>
      <div>
        <LinkButton href="/my/subscription/checkout" variant="secondary" size="sm">
          결제 화면으로 돌아가기
        </LinkButton>
      </div>
    </AccountCard>
  );
}

function ResultSkeleton() {
  return (
    <AccountCard aria-busy="true" aria-label="결제 확인하는 중" className={styles.result}>
      <Skeleton className={styles.resultSkeleton} />
      <Skeleton className={styles.resultSkeleton2} />
    </AccountCard>
  );
}
