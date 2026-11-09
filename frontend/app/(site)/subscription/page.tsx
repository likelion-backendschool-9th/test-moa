import type { Metadata } from "next";
import { Suspense } from "react";
import { Card } from "@/components/ui/Card/Card";
import { Container } from "@/components/ui/Container/Container";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { getSubscriptionIntro } from "@/features/subscription/api";
import { SubscriptionIntroCards } from "@/app/(site)/subscription/_components/SubscriptionIntroCards/SubscriptionIntroCards";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "구독" };

/* 제목은 정적 셸에 두고, 세션·구독 상태를 읽는 카드만 Suspense 안에서 스트리밍한다 */
export default function SubscriptionIntroPage() {
  return (
    <Container className={styles.page}>
      <div className={styles.heading}>
        <h1 className={styles.title}>구독</h1>
        <p className={styles.lead}>모집을 더 넓게, 구독으로 시작해 보세요</p>
      </div>
      <Suspense fallback={<IntroSkeleton />}>
        <Intro />
      </Suspense>
    </Container>
  );
}

async function Intro() {
  const { freePlan, plans, subscription, isGuest } = await getSubscriptionIntro();
  return <SubscriptionIntroCards freePlan={freePlan} plans={plans} subscription={subscription} isGuest={isGuest} />;
}

function IntroSkeleton() {
  return (
    <div aria-busy="true" aria-label="구독 안내 불러오는 중" className={styles.skeletonGrid}>
      {Array.from({ length: 2 }, (_, index) => (
        <Card key={index} className={styles.skeletonCard}>
          <Skeleton className={styles.skName} />
          <Skeleton className={styles.skBlurb} />
          <Skeleton className={styles.skButton} />
          <Skeleton className={styles.skPrice} />
          {Array.from({ length: 4 }, (_, row) => (
            <Skeleton key={row} className={styles.skRow} />
          ))}
        </Card>
      ))}
    </div>
  );
}
