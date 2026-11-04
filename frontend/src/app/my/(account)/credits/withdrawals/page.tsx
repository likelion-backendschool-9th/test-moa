import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { getCreditBalance, getWithdrawals } from "@/features/credit/api";
import { WithdrawalForm } from "@/features/credit/components/WithdrawalForm";
import { WithdrawalHistory } from "@/features/credit/components/WithdrawalHistory";
import { cashableCredits } from "@/features/credit/types";
import { cardClass } from "@/features/my/components/card-styles";

export const metadata: Metadata = { title: "출금" };

const PATH = "/my/credits/withdrawals";

export default function WithdrawalsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold tracking-[-0.03em]">출금</h1>
      <Suspense fallback={<WithdrawalsSkeleton />}>
        <Withdrawals />
      </Suspense>
    </div>
  );
}

async function Withdrawals() {
  const [balance, withdrawals] = await Promise.all([getCreditBalance(PATH), getWithdrawals(PATH)]);
  return (
    <div className="flex flex-col gap-4">
      <WithdrawalForm cashable={cashableCredits(balance)} />
      <WithdrawalHistory withdrawals={withdrawals} now={new Date()} />
    </div>
  );
}

function WithdrawalsSkeleton() {
  return (
    <div aria-busy="true" aria-label="출금 불러오는 중" className="flex flex-col gap-4">
      {Array.from({ length: 2 }, (_, index) => (
        <div key={index} className={cardClass}>
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ))}
    </div>
  );
}
