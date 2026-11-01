import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";
import { formatElapsed } from "@/lib/format";
import { CANCELLATION_DECISION_LABEL, type CancellationRequest, type ListTab } from "../types";
import { StatusTabs } from "./StatusTabs";

const TABS: { tab: ListTab; label: string; href: string }[] = [
  { tab: "pending", label: "처리 대기", href: "/admin/cancellations" },
  { tab: "done", label: "처리 완료", href: "/admin/cancellations?tab=done" },
];

/** 처리 대기·처리 완료 탭 */
export function CancellationTabs({ current }: { current: ListTab }) {
  return <StatusTabs label="모집 취소 요청 상태" tabs={TABS} current={current} />;
}

/**
 * 처리 직후 목록에서 한 번 보여 주는 결과 문구. 출금과 같이 주소의 값이 아니라 처리된 요청 데이터로 만든다.
 * 승인하면 확정 테스터의 참여도 함께 취소된다. 테스트 전 취소라 지급할 보상은 없다.
 */
export function CancellationProcessedNotice({ cancellation }: { cancellation: CancellationRequest }) {
  if (!cancellation.review) return null;
  const message =
    cancellation.review.decision === "approved"
      ? `${cancellation.recruitmentName} 모집을 취소했어요.${
          cancellation.confirmedCount > 0 ? ` 확정 테스터 ${cancellation.confirmedCount}명의 참여도 함께 취소돼요.` : ""
        }`
      : "취소 요청을 반려했어요. 모집은 그대로 진행돼요.";
  return (
    <p role="status" className="rounded-2xl bg-surface-muted px-6 py-4 text-sm font-semibold">
      {message}
    </p>
  );
}

/** 확정 테스터가 없는 요청은 빨리 처리할 수 있게 따로 표시한다 */
export function confirmedLabel(confirmedCount: number) {
  return confirmedCount > 0 ? `확정 테스터 ${confirmedCount}명` : "확정 테스터 없음";
}

const rowClass = "flex flex-col gap-2 rounded-2xl bg-surface-muted p-5 md:flex-row md:items-center md:gap-4 md:p-6";

type CancellationListProps = { cancellations: CancellationRequest[]; tab: ListTab; now: Date };

export function CancellationList({ cancellations, tab, now }: CancellationListProps) {
  if (cancellations.length === 0) {
    return <EmptyState title={tab === "pending" ? "처리할 모집 취소 요청이 없어요" : "처리한 모집 취소 요청이 없어요"} />;
  }
  return (
    <ul aria-label={tab === "pending" ? "처리 대기 모집 취소 요청" : "처리 완료 모집 취소 요청"} className="flex flex-col gap-3">
      {cancellations.map((request) => (
        <li key={request.id}>
          <Link
            href={`/admin/cancellations/${request.id}`}
            className={cn(rowClass, "transition-colors duration-300 ease-brand hover:bg-surface-strong")}
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="font-semibold">{request.recruitmentName}</span>
              <span className="text-sm text-text-muted">
                {request.developerNickname} · {confirmedLabel(request.confirmedCount)}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              {request.review ? (
                <>
                  <Badge tone="neutral">{CANCELLATION_DECISION_LABEL[request.review.decision]}</Badge>
                  <span className="text-xs text-text-muted tabular-nums">처리 {formatElapsed(request.review.processedAt, now)}</span>
                </>
              ) : (
                <span className="text-xs text-text-muted tabular-nums">요청 {formatElapsed(request.createdAt, now)}</span>
              )}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function CancellationListSkeleton() {
  return (
    <div aria-busy="true" aria-label="모집 취소 요청 목록 불러오는 중" className="flex flex-col gap-3">
      {Array.from({ length: 2 }, (_, index) => (
        <div key={index} className={rowClass} data-skeleton="cancellation">
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-5 w-48" />
          </div>
          <Skeleton className="h-6 w-24" />
        </div>
      ))}
    </div>
  );
}
