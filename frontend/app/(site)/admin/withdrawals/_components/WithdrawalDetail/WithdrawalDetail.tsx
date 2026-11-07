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

const panelClass = "flex flex-col gap-4 rounded-2xl bg-surface-muted p-6 md:p-8";
const infoGridClass = "grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[8rem_minmax(0,1fr)]";

/** 송금에 필요한 정보. 계좌번호 전체는 처리 대기일 때만 보여 준다 */
export function WithdrawalDetail({ withdrawal, now }: { withdrawal: WithdrawalRequest; now: Date }) {
  const pending = !withdrawal.review;
  const mismatch = isHolderMismatch(withdrawal);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="muted">출금 요청</Badge>
        {pending && mismatch && <Badge tone="neutral">예금주 확인 필요</Badge>}
      </div>

      <section aria-labelledby="withdrawal-info-heading" className={panelClass}>
        <h3 id="withdrawal-info-heading" className="text-lg font-extrabold">
          신청 내용
        </h3>
        <dl className={infoGridClass}>
          <Info label="닉네임">{withdrawal.nickname}</Info>
          <Info label="회원 이름">{withdrawal.memberName}</Info>
          <Info label="신청 금액">
            <span className="tabular-nums">{formatWon(withdrawal.amount)}</span>
          </Info>
          <Info label="신청">
            {formatDate(withdrawal.createdAt)} · {formatElapsed(withdrawal.createdAt, now)}
          </Info>
        </dl>
      </section>

      <section aria-labelledby="account-heading" className={panelClass}>
        <h3 id="account-heading" className="text-lg font-extrabold">
          받을 계좌
        </h3>
        <dl className={infoGridClass}>
          <Info label="은행">{withdrawal.bank}</Info>
          <Info label="계좌번호">
            <span className="whitespace-nowrap tabular-nums">
              {pending ? withdrawal.accountNumber : maskAccount(withdrawal.accountNumber)}
            </span>
          </Info>
          <Info label="예금주">{withdrawal.accountHolder}</Info>
        </dl>
        {pending && mismatch && <p className="text-sm font-bold">예금주가 회원 이름과 달라요.</p>}
        {pending && <CopyAccountButton accountNumber={withdrawal.accountNumber} />}
      </section>
    </div>
  );
}

/* 메모는 공백 없는 긴 문자열이나 URL일 수 있어서, 좁은 화면에서도 칸 안에서 줄을 바꾼다 */
function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-text-muted">{label}</dt>
      <dd className="font-semibold wrap-anywhere">{children}</dd>
    </>
  );
}

/** 처리한 요청. 결과는 바꿀 수 없어서 읽기만 한다 */
export function WithdrawalResult({ withdrawal, now }: { withdrawal: WithdrawalRequest; now: Date }) {
  const review = withdrawal.review;
  if (!review) return null;
  return (
    <section aria-labelledby="withdrawal-result-heading" className={panelClass}>
      <h3 id="withdrawal-result-heading" className="text-lg font-extrabold">
        처리 결과
      </h3>
      <dl className={infoGridClass}>
        <Info label="결과">
          <Badge tone="neutral">{WITHDRAWAL_DECISION_LABEL[review.decision]}</Badge>
        </Info>
        {review.decision === "rejected" && <Info label="반려 사유">{rejectReasonText(review)}</Info>}
        {review.decision === "rejected" && review.reason !== "other" && review.memo && <Info label="운영자 메모">{review.memo}</Info>}
        <Info label="처리">
          {formatDate(review.processedAt)} · {formatElapsed(review.processedAt, now)}
        </Info>
      </dl>
    </section>
  );
}
