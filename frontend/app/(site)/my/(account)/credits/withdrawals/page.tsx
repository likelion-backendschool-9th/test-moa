import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { getCreditBalance, getWithdrawals } from "@/features/credit/api";
import { WithdrawalForm } from "@/app/(site)/my/(account)/credits/withdrawals/_components/WithdrawalForm/WithdrawalForm";
import { WithdrawalHistory } from "@/app/(site)/my/(account)/credits/withdrawals/_components/WithdrawalHistory/WithdrawalHistory";
import { cashableCredits } from "@/features/credit/types";
import { AccountCard } from "@/app/(site)/my/(account)/_components/AccountCard/AccountCard";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "출금" };

const PATH = "/my/credits/withdrawals";

export default function WithdrawalsPage() {
  return (
    <div className={styles.withdrawalsPage}>
      <h1 className={styles.withdrawalsPageTitle}>출금</h1>
      <Suspense fallback={<WithdrawalsSkeleton />}>
        <Withdrawals />
      </Suspense>
    </div>
  );
}

async function Withdrawals() {
  const [balance, withdrawals] = await Promise.all([getCreditBalance(PATH), getWithdrawals(PATH)]);
  return (
    <div className={styles.withdrawals}>
      <WithdrawalForm cashable={cashableCredits(balance)} />
      <WithdrawalHistory withdrawals={withdrawals} now={new Date()} />
    </div>
  );
}

function WithdrawalsSkeleton() {
  return (
    <div aria-busy="true" aria-label="출금 불러오는 중" className={styles.withdrawalsSkeleton}>
      {Array.from({ length: 2 }, (_, index) => (
        <AccountCard key={index}>
          <Skeleton className={styles.withdrawalsSkeletonSkeleton} />
          <Skeleton className={styles.withdrawalsSkeletonSkeleton2} />
          <Skeleton className={styles.withdrawalsSkeletonSkeleton3} />
        </AccountCard>
      ))}
    </div>
  );
}
