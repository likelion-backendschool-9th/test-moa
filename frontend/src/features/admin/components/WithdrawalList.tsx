import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";
import { formatElapsed, formatWon } from "@/lib/format";
import {
  isHolderMismatch,
  withdrawalsHref,
  WITHDRAWAL_DECISION_LABEL,
  type WithdrawalRequest,
  type ListTab,
} from "../types";
import { LinkTabs } from "./LinkTabs";

/* 탭을 바꾸면 open을 지워서 모달이 닫힌다 */
const TABS: { tab: ListTab; label: string; href: string }[] = [
  { tab: "pending", label: "처리 대기", href: withdrawalsHref() },
  { tab: "done", label: "처리 완료", href: withdrawalsHref({ tab: "done" }) },
];

/** 처리 대기·처리 완료 탭. 탭 href에는 open이 없어서, 탭으로 이동하면 모달이 닫힌다 */
export function WithdrawalTabs({ current }: { current: ListTab }) {
  return <LinkTabs label="출금 요청 상태" tabs={TABS} current={current} />;
}

/**
 * 처리 직후 목록에서 한 번 보여 주는 결과 문구. 주소의 값이 아니라 처리된 요청 데이터로 만든다.
 * 그래서 주소를 바꿔도 처리하지 않은 요청이나 틀린 금액은 보이지 않는다.
 */
export function WithdrawalProcessedNotice({ withdrawal }: { withdrawal: WithdrawalRequest }) {
  if (!withdrawal.review) return null;
  const message =
    withdrawal.review.decision === "paid"
      ? `${formatWon(withdrawal.amount)}을 지급 완료로 처리했어요.`
      : "출금 요청을 반려했어요. 잠긴 크레딧이 회원에게 돌아가요.";
  return (
    <p role="status" className="rounded-2xl bg-surface-muted px-6 py-4 text-sm font-semibold">
      {message}
    </p>
  );
}

const rowClass = "flex flex-col gap-2 rounded-2xl bg-surface-muted p-5 md:flex-row md:items-center md:gap-4 md:p-6";

/** 출금 요청 목록. 계좌번호는 모달에서만 보여 준다 */
export function WithdrawalList({ withdrawals, tab, now }: { withdrawals: WithdrawalRequest[]; tab: ListTab; now: Date }) {
  if (withdrawals.length === 0) {
    return <EmptyState title={tab === "pending" ? "처리할 출금 요청이 없어요" : "처리한 출금 요청이 없어요"} />;
  }
  const total = withdrawals.reduce((sum, request) => sum + request.amount, 0);
  return (
    <div className="flex flex-col gap-3">
      {tab === "pending" && (
        <p className="text-sm font-semibold text-text-muted tabular-nums">
          {withdrawals.length}건 · {formatWon(total)}
        </p>
      )}
      <ul aria-label={tab === "pending" ? "처리 대기 출금 요청" : "처리 완료 출금 요청"} className="flex flex-col gap-3">
        {withdrawals.map((request) => (
          <li key={request.id}>
            <Link
              href={withdrawalsHref({ tab, open: request.id })}
              replace
              data-withdrawal-key={request.id}
              className={cn(rowClass, "transition-colors duration-300 ease-brand hover:bg-surface-strong")}
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="font-semibold">{request.nickname}</span>
                <span className="text-sm text-text-muted">{request.bank}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 md:justify-end">
                <span className="font-bold tabular-nums">{formatWon(request.amount)}</span>
                {request.review ? (
                  <>
                    <Badge tone="neutral">{WITHDRAWAL_DECISION_LABEL[request.review.decision]}</Badge>
                    <span className="text-xs text-text-muted tabular-nums">처리 {formatElapsed(request.review.processedAt, now)}</span>
                  </>
                ) : (
                  <>
                    {isHolderMismatch(request) && <Badge tone="neutral">예금주 확인 필요</Badge>}
                    <span className="text-xs text-text-muted tabular-nums">신청 {formatElapsed(request.createdAt, now)}</span>
                  </>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function WithdrawalListSkeleton() {
  return (
    <div aria-busy="true" aria-label="출금 요청 목록 불러오는 중" className="flex flex-col gap-3">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className={rowClass} data-skeleton="withdrawal">
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-5 w-20" />
          </div>
          <Skeleton className="h-6 w-28" />
        </div>
      ))}
    </div>
  );
}
