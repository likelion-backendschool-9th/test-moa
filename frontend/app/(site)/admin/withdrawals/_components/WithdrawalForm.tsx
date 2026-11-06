import { formatWon } from "@/lib/format";
import { processWithdrawal } from "../../../../../features/admin/actions";
import { DEMO_ADMIN_WITHDRAWALS_COOKIE } from "../../../../../features/admin/reviews";
import { REJECT_REASONS } from "../../../../../features/admin/types";
import { RequestReviewForm } from "./RequestReviewForm";

/** 출금 처리 양식. RequestReviewForm에 출금 문구·사유·서버 함수를 넘긴다 */
export function WithdrawalForm({
  withdrawalKey,
  amount,
  tab,
}: {
  withdrawalKey: string;
  amount: number;
  tab: "pending" | "done";
}) {
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
      extraFields={<input type="hidden" name="tab" value={tab} />}
    />
  );
}
