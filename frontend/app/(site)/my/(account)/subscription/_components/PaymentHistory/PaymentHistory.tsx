import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { getPaymentHistory } from "@/features/subscription/api";
import { receiptMethodLabel, receiptPath } from "@/features/subscription/pg";
import { formatCredits, formatDate, formatWon } from "@/lib/format";
import { AccountCard, AccountCardTitle } from "@/app/(site)/my/(account)/_components/AccountCard/AccountCard";
import styles from "./PaymentHistory.module.css";

/** 구독 화면에 보이는 결제 내역 건수. 더 많으면 최근 것만 보이고 건수를 알려 준다 */
const SHOWN = 5;

/**
 * 구독 결제 내역(#249). 서버의 내 결제를 최신순으로 보여 주고, 한 건을 누르면 결제 내용(결제 완료 화면)이 열린다.
 * 목업에는 서버 결제가 없어 보이지 않는다. 결제 내역만 읽지 못해도 구독 화면은 그대로 열려서 이 칸만 빠진다
 */
export async function PaymentHistory() {
  let history;
  try {
    history = await getPaymentHistory(SHOWN);
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
  if (!history) return null;
  return (
    <AccountCard as="section" aria-labelledby="payment-history-heading">
      <AccountCardTitle id="payment-history-heading">결제 내역</AccountCardTitle>
      {history.items.length === 0 ? (
        <p className={styles.empty}>아직 결제 내역이 없어요</p>
      ) : (
        <>
          <ul className={styles.list}>
            {history.items.map((payment) => (
              <li key={payment.id}>
                <Link href={receiptPath(payment.id)} className={styles.row}>
                  <span className={styles.main}>
                    <span className={styles.plan}>{payment.plan}</span>
                    <span className={styles.meta}>
                      {formatDate(payment.paidAt)} · {receiptMethodLabel(payment)}
                    </span>
                  </span>
                  <span className={styles.amount}>
                    {payment.method === "CREDIT" ? formatCredits(payment.amount) : formatWon(payment.amount)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {history.total > history.items.length && (
            <p className={styles.more}>최근 {history.items.length}건만 보여요 (전체 {history.total}건)</p>
          )}
        </>
      )}
    </AccountCard>
  );
}
