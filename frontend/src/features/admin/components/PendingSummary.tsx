import Link from "next/link";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatCredits } from "@/lib/format";
import { ADMIN_REQUEST_PATH, type AdminSummary } from "../types";

const cardClass = "flex flex-col gap-3 rounded-2xl bg-surface-muted p-6 md:p-8";

type SummaryCard = {
  label: string;
  count: number;
  href: string;
  detail: ReactNode;
};

/** 영역별 처리 대기 건수. 카드 전체가 해당 관리 페이지 링크다 */
export function PendingSummary({ summary }: { summary: AdminSummary }) {
  const cards: SummaryCard[] = [
    {
      label: "신고 대기",
      count: summary.reportCount,
      href: ADMIN_REQUEST_PATH.report,
      detail: (
        <>
          보상 보류 <strong className="font-extrabold text-text tabular-nums">{summary.heldRewardCount}</strong>건
        </>
      ),
    },
    {
      label: "출금 요청",
      count: summary.withdrawalCount,
      href: ADMIN_REQUEST_PATH.withdrawal,
      detail: <>요청 금액 {formatCredits(summary.withdrawalAmount)}</>,
    },
    {
      label: "모집 취소 요청",
      count: summary.cancellationCount,
      href: ADMIN_REQUEST_PATH.cancellation,
      detail: <>확정 테스터가 있는 모집 {summary.cancellationWithTestersCount}건</>,
    },
  ];

  return (
    <section aria-labelledby="pending-heading" className="flex flex-col gap-6">
      <h2 id="pending-heading" className="text-2xl font-extrabold tracking-[-0.03em]">
        처리 대기
      </h2>
      <ul className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <li key={card.href}>
            <Link
              href={card.href}
              className={`${cardClass} h-full transition-colors duration-300 ease-brand hover:bg-surface-strong`}
            >
              <span className="text-sm font-semibold">{card.label}</span>
              {card.count === 0 ? (
                <span className="text-sm text-text-muted">처리할 요청 없음</span>
              ) : (
                <>
                  <span className="text-4xl font-extrabold tracking-[-0.03em] tabular-nums">
                    {card.count}
                    <span className="ml-1 text-base font-semibold">건</span>
                  </span>
                  <span className="text-sm text-text-muted">{card.detail}</span>
                </>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PendingSummarySkeleton() {
  return (
    <div aria-busy="true" aria-label="처리 대기 불러오는 중" className="flex flex-col gap-6">
      <Skeleton className="h-8 w-28" />
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className={cardClass} data-skeleton="summary">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-10 w-16" />
            <Skeleton className="h-5 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}
