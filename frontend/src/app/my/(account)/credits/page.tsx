import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { getCreditBalance, getCreditLedger } from "@/features/credit/api";
import { LedgerList } from "@/features/credit/components/LedgerList";
import { parseLedgerType } from "@/features/credit/query";
import { cardClass } from "@/features/my/components/card-styles";
import { CreditSummaryCard } from "@/features/my/components/CreditSummaryCard";

export const metadata: Metadata = { title: "크레딧" };

const PATH = "/my/credits";

/* 제목은 정적 셸에 두고, 세션을 읽는 부분만 Suspense 안에서 스트리밍한다 */
export default function CreditsPage({ searchParams }: PageProps<"/my/credits">) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold tracking-[-0.03em]">크레딧</h1>
      <Suspense fallback={<CreditsSkeleton />}>
        <Credits searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Credits({ searchParams }: { searchParams: PageProps<"/my/credits">["searchParams"] }) {
  const type = parseLedgerType((await searchParams).type);
  const [balance, entries] = await Promise.all([getCreditBalance(PATH), getCreditLedger(PATH, type)]);
  return (
    <div className="flex flex-col gap-4">
      <CreditSummaryCard credits={balance} title="잔액" showHistoryLink={false} />
      <LedgerList entries={entries} type={type} />
    </div>
  );
}

function CreditsSkeleton() {
  return (
    <div aria-busy="true" aria-label="크레딧 불러오는 중" className="flex flex-col gap-4">
      <div className={cardClass}>
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-16 w-full" />
      </div>
      <div className={cardClass}>
        <Skeleton className="h-6 w-28" />
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-8 w-full" />
        ))}
      </div>
    </div>
  );
}
