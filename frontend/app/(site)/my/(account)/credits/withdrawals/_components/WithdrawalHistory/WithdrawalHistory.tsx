import { cn } from "@/lib/cn";
import { formatClock, formatWon } from "@/lib/format";
import { WITHDRAWAL_STATUS_LABEL, type Withdrawal, type WithdrawalStatus } from "@/features/credit/types";
import { DayGroups } from "../../../../_components/DayGroups/DayGroups";
import { FlowIcon } from "../../../../_components/FlowIcon/FlowIcon";
import { AccountCard, AccountCardTitle } from "@/app/(site)/my/(account)/_components/AccountCard/AccountCard";
import styles from "./WithdrawalHistory.module.css";

/*
 * 상태는 라이트·다크 모두 대비가 높은 조합만 쓴다.
 * 지급 완료는 강조색 면, 처리 중은 먹 반전, 반려는 칩 회색 면에 먹 글씨와 흐린 먹 테두리
 */
const STATUS_CLASS: Record<WithdrawalStatus, string> = {
  requested: styles.statusRequested,
  paid: styles.statusPaid,
  rejected: styles.statusRejected,
};

/** 지난 출금 요청을 신청 날짜별로 묶는다. 왼쪽에 신청 시각, 금액 아래에 계좌를 두고, 반려는 이유를 함께 보여 준다 */
export function WithdrawalHistory({ withdrawals, now }: { withdrawals: Withdrawal[]; now: Date }) {
  return (
    <AccountCard as="section" aria-labelledby="withdrawal-history-heading">
      <AccountCardTitle id="withdrawal-history-heading">
        출금 내역
      </AccountCardTitle>
      {withdrawals.length === 0 ? (
        <p className={styles.text}>아직 출금 요청이 없어요</p>
      ) : (
        <DayGroups items={withdrawals} dateOf={(item) => item.requestedAt} idPrefix="withdrawal-day" now={now}>
          {(item) => (
            <li key={item.id} className={styles.root}>
              <FlowIcon incoming={false} />
              <div className={styles.box}>
                <span className={styles.label}>{formatWon(item.amount)}</span>
                <p className={styles.text2}>
                  <time dateTime={item.requestedAt} className={styles.time}>
                    {formatClock(item.requestedAt)}
                  </time>
                  {" · "}
                  {item.bank} {item.accountMasked}
                  {item.rejectReason && ` · ${item.rejectReason}`}
                </p>
              </div>
              <span className={cn(styles.label2, STATUS_CLASS[item.status])}>
                {WITHDRAWAL_STATUS_LABEL[item.status]}
              </span>
            </li>
          )}
        </DayGroups>
      )}
    </AccountCard>
  );
}
