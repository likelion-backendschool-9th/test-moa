import Link from "next/link";
import type { ReactNode } from "react";
import { LinkButton } from "@/components/ui/LinkButton/LinkButton";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { formatCredits, formatElapsed } from "@/lib/format";
import { ADMIN_REQUEST_PATH, adminRequestHref } from "@/app/(site)/admin/_lib/paths";
import { REPORT_TARGET_LABEL, type Report } from "@/features/report/types";
import { type WithdrawalRequest } from "@/features/credit/types";
import { Card } from "@/components/ui/Card/Card";
import styles from "./RecentRequests.module.css";


type RecentRequestsProps = {
  now: Date;
  reports: Report[];
  withdrawals: WithdrawalRequest[];
};

/** 영역별 최근 요청. 확인만 하고 승인·반려는 각 관리 페이지에서 한다 */
export function RecentRequests({ now, reports, withdrawals }: RecentRequestsProps) {
  return (
    <section aria-labelledby="recent-heading" className={styles.root}>
      <h2 id="recent-heading" className={styles.title}>
        최근 요청
      </h2>
      <div className={styles.box}>
        <Column title="신고" href={ADMIN_REQUEST_PATH.report}>
          {reports.map((report) => (
            <Row
              key={report.id}
              title={`${REPORT_TARGET_LABEL[report.targetType]} · ${report.recruitmentName}`}
              description={report.reason}
              elapsed={formatElapsed(report.createdAt, now)}
            />
          ))}
        </Column>
        <Column title="출금 요청" href={ADMIN_REQUEST_PATH.withdrawal}>
          {withdrawals.map((item) => (
            <Row
              key={item.id}
              href={adminRequestHref("withdrawal", item.id)}
              title={item.nickname}
              description={formatCredits(item.amount)}
              elapsed={formatElapsed(item.createdAt, now)}
            />
          ))}
        </Column>
      </div>
    </section>
  );
}

function Column({ title, href, children }: { title: string; href: string; children: ReactNode[] }) {
  return (
    <Card className={styles.column}>
      <h3 className={styles.columnTitle}>{title}</h3>
      {children.length === 0 ? (
        <p className={styles.columnText}>최근 요청이 없어요.</p>
      ) : (
        <ul className={styles.columnChildren}>{children}</ul>
      )}
      <LinkButton href={href} variant="secondary" size="sm" aria-label={`${title} 전체 보기`} className={styles.columnButton}>
        전체 보기
      </LinkButton>
    </Card>
  );
}

function Row({
  title,
  description,
  elapsed,
  href,
}: {
  title: string;
  description: string;
  elapsed: string;
  href?: string;
}) {
  const body = (
    <>
      <div className={styles.rowBox}>
        <span className={styles.rowTitle}>{title}</span>
        <span className={styles.rowElapsed}>{elapsed}</span>
      </div>
      <span className={styles.rowDescription}>{description}</span>
    </>
  );
  return (
    <li className={styles.row}>
      {href ? (
        <Link href={href} className={styles.rowBody}>
          {body}
        </Link>
      ) : (
        body
      )}
    </li>
  );
}

export function RecentRequestsSkeleton() {
  return (
    <div aria-busy="true" aria-label="최근 요청 불러오는 중" className={styles.recentRequestsSkeleton}>
      <Skeleton className={styles.recentRequestsSkeletonSkeleton} />
      <div className={styles.recentRequestsSkeletonBox}>
        {Array.from({ length: 2 }, (_, index) => (
          <Card key={index} className={styles.column} data-skeleton="recent">
            <Skeleton className={styles.recentRequestsSkeletonSkeleton2} />
            {Array.from({ length: 3 }, (_, row) => (
              <Skeleton key={row} className={styles.recentRequestsSkeleton2} />
            ))}
          </Card>
        ))}
      </div>
    </div>
  );
}
