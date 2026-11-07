import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatElapsed } from "@/lib/format";
import { ADMIN_REQUEST_LABEL, adminRequestHref, type PendingItem } from "@/app/(site)/admin/_lib/paths";

const panelClass = "flex flex-col gap-4 rounded-2xl bg-surface-muted p-6 md:p-8";

/** 세 종류 요청을 합친 순위 패널. 출금은 목록 모달로, 나머지는 상세로 간다 */
export function OldestPendingPanel({ items, now }: { items: PendingItem[]; now: Date }) {
  return (
    <section aria-labelledby="oldest-heading" className={panelClass}>
      <h2 id="oldest-heading" className="text-lg font-extrabold">
        오래 기다린 요청
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-text-muted">기다리는 요청이 없어요.</p>
      ) : (
        <ol className="flex flex-col gap-1">
          {items.map((item, index) => (
            <li key={item.id}>
              <Link
                href={adminRequestHref(item.kind, item.id)}
                className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors duration-300 ease-brand hover:bg-surface-strong"
              >
                <span className="w-4 text-sm font-extrabold text-accent tabular-nums">{index + 1}</span>
                <Badge tone="muted">{ADMIN_REQUEST_LABEL[item.kind]}</Badge>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{item.title}</span>
                {item.overdue && <Badge tone="neutral">72시간 지남</Badge>}
                <span className="text-xs font-semibold text-text-muted tabular-nums">{formatElapsed(item.createdAt, now)}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function OldestPendingPanelSkeleton() {
  return (
    <div aria-busy="true" aria-label="오래 기다린 요청 불러오는 중" className={panelClass} data-skeleton="oldest">
      <Skeleton className="h-6 w-36" />
      {Array.from({ length: 5 }, (_, index) => (
        <Skeleton key={index} className="h-10 w-full" />
      ))}
    </div>
  );
}
