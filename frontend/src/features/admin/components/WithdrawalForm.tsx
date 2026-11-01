import { formatWon } from "@/lib/format";
import { processWithdrawal } from "../actions";
import { DEMO_ADMIN_WITHDRAWALS_COOKIE } from "../reviews";
import { REJECT_REASONS } from "../types";
import { RequestReviewForm } from "./RequestReviewForm";

/** 출금 처리 양식. 모양과 동작은 모집 취소와 같은 RequestReviewForm이고 문구만 출금에 맞춘다 */
export function WithdrawalForm({ withdrawalKey, amount }: { withdrawalKey: string; amount: number }) {
  return (
    <RequestReviewForm
      action={processWithdrawal}
      keyName="withdrawalKey"
      keyValue={withdrawalKey}
      idPrefix="withdrawal"
      accept={{ value: "paid", label: "지급 완료", detail: `${formatWon(amount)}을 계좌로 보냈어요. 잠긴 크레딧이 차감돼요.` }}
      rejectDetail="지급하지 않아요. 잠긴 크레딧이 회원에게 돌아가요."
      reasons={REJECT_REASONS}
      audience="회원"
      cookieName={DEMO_ADMIN_WITHDRAWALS_COOKIE}
    />
  );
}
