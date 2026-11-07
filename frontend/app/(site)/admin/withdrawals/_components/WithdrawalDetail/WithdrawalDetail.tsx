import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge/Badge";
import { formatDate, formatElapsed, formatWon } from "@/lib/format";
import {
  isHolderMismatch,
  maskAccount,
  rejectReasonText,
  WITHDRAWAL_DECISION_LABEL,
  type WithdrawalRequest,
} from "@/features/credit/types";
import { CopyAccountButton } from "../CopyAccountButton/CopyAccountButton";
import { AdminPanel } from "@/app/(site)/admin/_components/AdminPanel/AdminPanel";
import styles from "./WithdrawalDetail.module.css";


/** 송금에 필요한 정보. 계좌번호 전체는 처리 대기일 때만 보여 준다 */
export function WithdrawalDetail({ withdrawal, now }: { withdrawal: WithdrawalRequest; now: Date }) {
  const pending = !withdrawal.review;
  const mismatch = isHolderMismatch(withdrawal);
  return (
    <div className={styles.root}>
      <div className={styles.box}>
        <Badge tone="muted">출금 요청</Badge>
        {pending && mismatch && <Badge tone="neutral">예금주 확인 필요</Badge>}
      </div>

      <AdminPanel as="section" aria-labelledby="withdrawal-info-heading">
        <h3 id="withdrawal-info-heading" className={styles.title}>
          신청 내용
        </h3>
        <dl className={styles.infoGrid}>
          <Info label="닉네임">{withdrawal.nickname}</Info>
          <Info label="회원 이름">{withdrawal.memberName}</Info>
          <Info label="신청 금액">
            <span className={styles.label}>{formatWon(withdrawal.amount)}</span>
          </Info>
          <Info label="신청">
            {formatDate(withdrawal.createdAt)} · {formatElapsed(withdrawal.createdAt, now)}
          </Info>
        </dl>
      </AdminPanel>

      <AdminPanel as="section" aria-labelledby="account-heading">
        <h3 id="account-heading" className={styles.title2}>
          받을 계좌
        </h3>
        <dl className={styles.infoGrid}>
          <Info label="은행">{withdrawal.bank}</Info>
          <Info label="계좌번호">
            <span className={styles.label2}>
              {pending ? withdrawal.accountNumber : maskAccount(withdrawal.accountNumber)}
            </span>
          </Info>
          <Info label="예금주">{withdrawal.accountHolder}</Info>
        </dl>
        {pending && mismatch && <p className={styles.text}>예금주가 회원 이름과 달라요.</p>}
        {pending && <CopyAccountButton accountNumber={withdrawal.accountNumber} />}
      </AdminPanel>
    </div>
  );
}

/* 메모는 공백 없는 긴 문자열이나 URL일 수 있어서, 좁은 화면에서도 칸 안에서 줄을 바꾼다 */
function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className={styles.infoLabel}>{label}</dt>
      <dd className={styles.infoChildren}>{children}</dd>
    </>
  );
}

/** 처리한 요청. 결과는 바꿀 수 없어서 읽기만 한다 */
export function WithdrawalResult({ withdrawal, now }: { withdrawal: WithdrawalRequest; now: Date }) {
  const review = withdrawal.review;
  if (!review) return null;
  return (
    <AdminPanel as="section" aria-labelledby="withdrawal-result-heading">
      <h3 id="withdrawal-result-heading" className={styles.withdrawalResultTitle}>
        처리 결과
      </h3>
      <dl className={styles.infoGrid}>
        <Info label="결과">
          <Badge tone="neutral">{WITHDRAWAL_DECISION_LABEL[review.decision]}</Badge>
        </Info>
        {review.decision === "rejected" && <Info label="반려 사유">{rejectReasonText(review)}</Info>}
        {review.decision === "rejected" && review.reason !== "other" && review.memo && <Info label="운영자 메모">{review.memo}</Info>}
        <Info label="처리">
          {formatDate(review.processedAt)} · {formatElapsed(review.processedAt, now)}
        </Info>
      </dl>
    </AdminPanel>
  );
}
