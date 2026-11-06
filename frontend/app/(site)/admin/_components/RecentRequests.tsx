import Link from "next/link";
import type { ReactNode } from "react";
import { LinkButton } from "@/components/ui/LinkButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatCredits, formatElapsed } from "@/lib/format";
import {
  ADMIN_REQUEST_PATH,
  REPORT_TARGET_LABEL,
  adminRequestHref,
  type Report,
  type WithdrawalRequest,
} from "../../../../features/admin/types";

const columnClass = "flex flex-col gap-4 rounded-2xl bg-surface-muted p-6";

type RecentRequestsProps = {
  now: Date;
  reports: Report[];
  withdrawals: WithdrawalRequest[];
};

/** 영역별 최근 요청. 확인만 하고 승인·반려는 각 관리 페이지에서 한다 */
export function RecentRequests({ now, reports, withdrawals }: RecentRequestsProps) {
  return (
    <section aria-labelledby="recent-heading" className="flex flex-col gap-6">
      <h2 id="recent-heading" className="text-2xl font-extrabold tracking-[-0.03em]">
        최근 요청
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
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
    <div className={columnClass}>
      <h3 className="text-lg font-extrabold">{title}</h3>
      {children.length === 0 ? (
        <p className="flex-1 text-sm text-text-muted">최근 요청이 없어요.</p>
      ) : (
        <ul className="flex flex-1 flex-col gap-3">{children}</ul>
      )}
      <LinkButton href={href} variant="secondary" size="sm" aria-label={`${title} 전체 보기`} className="self-start">
        전체 보기
      </LinkButton>
    </div>
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
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate text-sm font-semibold">{title}</span>
        <span className="shrink-0 text-xs text-text-muted tabular-nums">{elapsed}</span>
      </div>
      <span className="truncate text-sm text-text-muted">{description}</span>
    </>
  );
  return (
    <li className="flex flex-col gap-1">
      {href ? (
        <Link href={href} className="flex flex-col gap-1 rounded-lg transition-colors duration-300 ease-brand hover:bg-surface-strong">
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
    <div aria-busy="true" aria-label="최근 요청 불러오는 중" className="flex flex-col gap-6">
      <Skeleton className="h-8 w-28" />
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} className={columnClass} data-skeleton="recent">
            <Skeleton className="h-6 w-20" />
            {Array.from({ length: 3 }, (_, row) => (
              <Skeleton key={row} className="h-10 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
