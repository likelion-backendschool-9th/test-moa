import Link from "next/link";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { formatCredits } from "@/lib/format";
import { ADMIN_REQUEST_PATH, type AdminSummary } from "@/app/(site)/admin/_lib/paths";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/Card/Card";
import styles from "./PendingSummary.module.css";


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
          보상 보류 <strong className={styles.heldRewardCount}>{summary.heldRewardCount}</strong>건
        </>
      ),
    },
    {
      label: "출금 요청",
      count: summary.withdrawalCount,
      href: ADMIN_REQUEST_PATH.withdrawal,
      detail: <>요청 금액 {formatCredits(summary.withdrawalAmount)}</>,
    },
  ];

  return (
    <section aria-labelledby="pending-heading" className={styles.root}>
      <h2 id="pending-heading" className={styles.title}>
        처리 대기
      </h2>
      <ul className={styles.list}>
        {cards.map((card) => (
          <li key={card.href}>
            <Card as={Link}
              href={card.href}
              className={cn(styles.summaryCard, styles.link)}
            >
              <span className={styles.label}>{card.label}</span>
              {card.count === 0 ? (
                <span className={styles.label2}>처리할 요청 없음</span>
              ) : (
                <>
                  <span className={styles.label3}>
                    {card.count}
                    <span className={styles.label4}>건</span>
                  </span>
                  <span className={styles.detail}>{card.detail}</span>
                </>
              )}
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PendingSummarySkeleton() {
  return (
    <div aria-busy="true" aria-label="처리 대기 불러오는 중" className={styles.pendingSummarySkeleton}>
      <Skeleton className={styles.pendingSummarySkeletonSkeleton} />
      <div className={styles.pendingSummarySkeletonBox}>
        {Array.from({ length: 2 }, (_, index) => (
          <Card key={index} className={styles.summaryCard} data-skeleton="summary">
            <Skeleton className={styles.pendingSummarySkeletonSkeleton2} />
            <Skeleton className={styles.pendingSummarySkeletonSkeleton3} />
            <Skeleton className={styles.pendingSummarySkeletonSkeleton4} />
          </Card>
        ))}
      </div>
    </div>
  );
}
