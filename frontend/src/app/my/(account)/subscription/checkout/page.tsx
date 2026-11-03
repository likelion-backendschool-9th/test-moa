import { CaretLeftIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LinkButton } from "@/components/ui/LinkButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { getSubscriptionOverview } from "@/features/my/api";
import { cardClass } from "@/features/my/components/card-styles";
import { CheckoutForm } from "@/features/my/components/CheckoutForm";

export const metadata: Metadata = { title: "구독 결제" };

const PATH = "/my/subscription/checkout";

/* 처음 구독과 연장이 같은 화면이라 제목은 둘 다에 맞는 "구독 결제"로 정적 셸에 둔다 */
export default function CheckoutPage() {
  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/my/subscription"
        className="inline-flex items-center gap-1 self-start rounded-full text-sm font-bold text-text-muted transition-colors duration-300 ease-brand hover:text-text"
      >
        <CaretLeftIcon aria-hidden size={16} weight="bold" />
        구독
      </Link>
      <h1 className="text-2xl font-extrabold tracking-[-0.03em]">구독 결제</h1>
      <Suspense fallback={<CheckoutSkeleton />}>
        <Checkout />
      </Suspense>
    </div>
  );
}

async function Checkout() {
  const { subscription, plans, payableCredits, now } = await getSubscriptionOverview(PATH);
  if (!subscription) {
    return (
      <section className={cardClass}>
        <p className="text-lg font-extrabold">운영자 계정은 구독 대상이 아니에요</p>
        <div>
          <LinkButton href="/my" variant="secondary" size="sm">
            마이페이지
          </LinkButton>
        </div>
      </section>
    );
  }
  return (
    <div className="max-w-2xl">
      <CheckoutForm
        plans={plans}
        payableCredits={payableCredits}
        activeUntil={subscription.status === "active" ? subscription.expiresAt : null}
        now={now}
      />
    </div>
  );
}

function CheckoutSkeleton() {
  return (
    <div aria-busy="true" aria-label="구독 결제 불러오는 중" className={`${cardClass} max-w-2xl`}>
      <Skeleton className="h-6 w-24" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-40 self-end" />
    </div>
  );
}
