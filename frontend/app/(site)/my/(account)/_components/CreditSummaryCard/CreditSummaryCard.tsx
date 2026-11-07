import { LinkButton } from "@/components/ui/LinkButton/LinkButton";
import { formatCredits } from "@/lib/format";
import { cashableCredits, totalCredits, type CreditBalance } from "@/features/credit/types";
import { AccountCard, AccountCardHeader, AccountCardTitle } from "@/app/(site)/my/(account)/_components/AccountCard/AccountCard";
import styles from "./CreditSummaryCard.module.css";

type CreditSummaryCardProps = {
  credits: CreditBalance;
  /** 카드 제목. 크레딧 관리 페이지에서는 "잔액"으로 쓴다 */
  title?: string;
  /** 크레딧 관리 페이지 안에서는 자기 자신으로 가는 "크레딧 내역" 링크를 뺀다 */
  showHistoryLink?: boolean;
};

/** 보유 크레딧과 그 구성. 승인 대기 보상은 잔액과 따로 보여 주고, 출금할 크레딧이 있을 때만 출금 신청을 보여 준다 */
export function CreditSummaryCard({ credits, title = "크레딧", showHistoryLink = true }: CreditSummaryCardProps) {
  const headingId = `credit-summary-${title}`;
  const cashable = cashableCredits(credits);
  const rows = [
    { label: "적립 크레딧", value: cashable },
    { label: "이벤트 크레딧", value: credits.signup },
    { label: "출금 처리 중", value: credits.pendingWithdrawal },
  ];
  return (
    <AccountCard as="section" aria-labelledby={headingId}>
      <AccountCardHeader>
        <AccountCardTitle id={headingId}>
          {title}
        </AccountCardTitle>
        <div className={styles.box}>
          {showHistoryLink && (
            <LinkButton href="/my/credits" variant="secondary" size="sm">
              크레딧 내역
            </LinkButton>
          )}
          {cashable > 0 && (
            <LinkButton href="/my/credits/withdrawals" variant="secondary" size="sm">
              출금 신청
            </LinkButton>
          )}
        </div>
      </AccountCardHeader>
      <p className={styles.text}>{formatCredits(totalCredits(credits))}</p>
      {credits.pendingReward > 0 && (
        <p className={styles.text2}>
          승인 대기 <span className={styles.label}>{formatCredits(credits.pendingReward)}</span>
          {" "}· 확인되면 잔액에 더해져요
        </p>
      )}
      <dl className={styles.list}>
        {rows.map((row) => (
          <div key={row.label} className={styles.root}>
            <dt className={styles.label2}>{row.label}</dt>
            <dd className={styles.value}>{formatCredits(row.value)}</dd>
          </div>
        ))}
      </dl>
    </AccountCard>
  );
}
