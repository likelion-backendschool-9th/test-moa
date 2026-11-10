import { CaretLeftIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LinkButton } from "@/components/ui/LinkButton/LinkButton";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { getCheckoutInfo, getSubscriptionOverview } from "@/features/subscription/api";
import { pgNotice } from "@/features/subscription/pg";
import { CheckoutForm } from "@/app/(site)/my/(account)/subscription/checkout/_components/CheckoutForm/CheckoutForm";
import { PopupReturn } from "@/app/(site)/my/(account)/subscription/checkout/_components/PopupReturn/PopupReturn";
import { AccountCard } from "@/app/(site)/my/(account)/_components/AccountCard/AccountCard";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "구독 결제" };

const PATH = "/my/subscription/checkout";

/* 처음 구독과 연장이 같은 화면이라 제목은 둘 다에 맞는 "구독 결제"로 정적 셸에 둔다 */
export default function CheckoutPage({ searchParams }: { searchParams: Promise<{ pg?: string | string[] }> }) {
  return (
    <div className={styles.checkoutPage}>
      <Link
        href="/my/subscription"
        className={styles.checkoutPageLink}
      >
        <CaretLeftIcon aria-hidden size={16} weight="bold" />
        구독
      </Link>
      <h1 className={styles.checkoutPageTitle}>구독 결제</h1>
      <PopupReturn />
      <Suspense fallback={<CheckoutSkeleton />}>
        <Checkout searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Checkout({ searchParams }: { searchParams: Promise<{ pg?: string | string[] }> }) {
  const notice = pgNotice((await searchParams).pg);
  const { subscription, plans, payableCredits, now } = await getSubscriptionOverview(PATH);
  if (!subscription) {
    return (
      <AccountCard as="section">
        <p className={styles.checkoutText}>운영자 계정은 구독 대상이 아니에요</p>
        <div>
          <LinkButton href="/my" variant="secondary" size="sm">
            마이페이지
          </LinkButton>
        </div>
      </AccountCard>
    );
  }
  /* 운영자가 아닌 회원만 서버의 결제 기간을 읽는다(운영자는 위에서 안내만 보인다). 목업은 null이라 화면이 직접 계산한다 */
  const info = await getCheckoutInfo(plans);
  return (
    <div className={styles.checkout}>
      <CheckoutForm
        plans={plans}
        periods={info?.periods ?? null}
        providers={info?.providers ?? null}
        notice={notice}
        payableCredits={payableCredits}
        activeUntil={subscription.status === "active" ? subscription.expiresAt : null}
        now={now}
      />
    </div>
  );
}

function CheckoutSkeleton() {
  return (
    <AccountCard aria-busy="true" aria-label="구독 결제 불러오는 중" className={styles.checkoutSkeleton}>
      <Skeleton className={styles.checkoutSkeletonSkeleton} />
      <Skeleton className={styles.checkoutSkeletonSkeleton2} />
      <Skeleton className={styles.checkoutSkeletonSkeleton3} />
      <Skeleton className={styles.checkoutSkeletonSkeleton4} />
      <Skeleton className={styles.checkoutSkeletonSkeleton5} />
    </AccountCard>
  );
}
