import Link from "next/link";
import { Badge } from "@/components/ui/Badge/Badge";
import { EmptyState } from "@/components/ui/EmptyState/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { formatElapsed, formatWon } from "@/lib/format";
import { isHolderMismatch, WITHDRAWAL_DECISION_LABEL, type WithdrawalRequest } from "@/features/credit/types";
import { withdrawalsHref } from "@/features/credit/paths";
import { type ListTab } from "@/features/credit/paths";
import { LinkTabs } from "../../../_components/LinkTabs/LinkTabs";
import { Card } from "@/components/ui/Card/Card";
import { AdminListRow } from "@/app/(site)/admin/_components/AdminListRow/AdminListRow";
import styles from "./WithdrawalList.module.css";

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
    <Card as="p" role="status" className={styles.withdrawalProcessedNotice}>
      {message}
    </Card>
  );
}


/** 출금 요청 목록. 계좌번호는 모달에서만 보여 준다 */
export function WithdrawalList({ withdrawals, tab, now }: { withdrawals: WithdrawalRequest[]; tab: ListTab; now: Date }) {
  if (withdrawals.length === 0) {
    return <EmptyState title={tab === "pending" ? "처리할 출금 요청이 없어요" : "처리한 출금 요청이 없어요"} />;
  }
  const total = withdrawals.reduce((sum, request) => sum + request.amount, 0);
  return (
    <div className={styles.root}>
      {tab === "pending" && (
        <p className={styles.text}>
          {withdrawals.length}건 · {formatWon(total)}
        </p>
      )}
      <ul aria-label={tab === "pending" ? "처리 대기 출금 요청" : "처리 완료 출금 요청"} className={styles.list}>
        {withdrawals.map((request) => (
          <li key={request.id}>
            <AdminListRow as={Link}
              href={withdrawalsHref({ tab, open: request.id })}
              replace
              scroll={false}
              data-withdrawal-key={request.id}
              className={styles.withdrawalKey}
            >
              <div className={styles.box}>
                <span className={styles.nickname}>{request.nickname}</span>
                <span className={styles.bank}>{request.bank}</span>
              </div>
              <div className={styles.box2}>
                <span className={styles.label}>{formatWon(request.amount)}</span>
                {request.review ? (
                  <>
                    <Badge tone="neutral">{WITHDRAWAL_DECISION_LABEL[request.review.decision]}</Badge>
                    <span className={styles.label2}>처리 {formatElapsed(request.review.processedAt, now)}</span>
                  </>
                ) : (
                  <>
                    {isHolderMismatch(request) && <Badge tone="neutral">예금주 확인 필요</Badge>}
                    <span className={styles.label3}>신청 {formatElapsed(request.createdAt, now)}</span>
                  </>
                )}
              </div>
            </AdminListRow>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function WithdrawalListSkeleton() {
  return (
    <div aria-busy="true" aria-label="출금 요청 목록 불러오는 중" className={styles.withdrawalListSkeleton}>
      {Array.from({ length: 3 }, (_, index) => (
        <AdminListRow key={index} data-skeleton="withdrawal">
          <div className={styles.withdrawalListSkeletonBox}>
            <Skeleton className={styles.withdrawalListSkeletonSkeleton} />
            <Skeleton className={styles.withdrawalListSkeletonSkeleton2} />
          </div>
          <Skeleton className={styles.withdrawalListSkeletonSkeleton3} />
        </AdminListRow>
      ))}
    </div>
  );
}

/** 모달 데이터를 기다리는 동안 보여 주는 다이얼로그 모양 스켈레톤 */
export function WithdrawalModalSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="출금 요청 불러오는 중"
      className={styles.withdrawalModalSkeleton}
    >
      <div className={styles.withdrawalModalSkeletonBox}>
        <div className={styles.withdrawalModalSkeletonBox2}>
          <div className={styles.withdrawalModalSkeletonBox3}>
            <Skeleton className={styles.withdrawalModalSkeletonSkeleton} />
            <Skeleton className={styles.withdrawalModalSkeletonSkeleton2} />
          </div>
          <Skeleton className={styles.withdrawalModalSkeletonSkeleton3} />
          <Skeleton className={styles.withdrawalModalSkeletonSkeleton4} />
        </div>
      </div>
    </div>
  );
}
