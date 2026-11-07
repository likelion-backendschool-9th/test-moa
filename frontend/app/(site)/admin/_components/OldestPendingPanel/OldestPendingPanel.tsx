import Link from "next/link";
import { Badge } from "@/components/ui/Badge/Badge";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { formatElapsed } from "@/lib/format";
import { ADMIN_REQUEST_LABEL, adminRequestHref, type PendingItem } from "@/app/(site)/admin/_lib/paths";
import { AdminPanel } from "@/app/(site)/admin/_components/AdminPanel/AdminPanel";
import styles from "./OldestPendingPanel.module.css";


/** 세 종류 요청을 합친 순위 패널. 출금은 목록 모달로, 나머지는 상세로 간다 */
export function OldestPendingPanel({ items, now }: { items: PendingItem[]; now: Date }) {
  return (
    <AdminPanel as="section" aria-labelledby="oldest-heading">
      <h2 id="oldest-heading" className={styles.title}>
        오래 기다린 요청
      </h2>
      {items.length === 0 ? (
        <p className={styles.text}>기다리는 요청이 없어요.</p>
      ) : (
        <ol className={styles.list}>
          {items.map((item, index) => (
            <li key={item.id}>
              <Link
                href={adminRequestHref(item.kind, item.id)}
                className={styles.link}
              >
                <span className={styles.label}>{index + 1}</span>
                <Badge tone="muted">{ADMIN_REQUEST_LABEL[item.kind]}</Badge>
                <span className={styles.title2}>{item.title}</span>
                {item.overdue && <Badge tone="neutral">72시간 지남</Badge>}
                <span className={styles.label2}>{formatElapsed(item.createdAt, now)}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </AdminPanel>
  );
}

export function OldestPendingPanelSkeleton() {
  return (
    <AdminPanel aria-busy="true" aria-label="오래 기다린 요청 불러오는 중" data-skeleton="oldest">
      <Skeleton className={styles.oldestPendingPanelSkeletonSkeleton} />
      {Array.from({ length: 5 }, (_, index) => (
        <Skeleton key={index} className={styles.oldestPendingPanelSkeleton} />
      ))}
    </AdminPanel>
  );
}
