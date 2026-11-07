import { formatWon } from "@/lib/format";
import { withdrawalsHref } from "@/features/credit/paths";
import { type ListTab } from "@/features/credit/paths";
import { type WithdrawalRequest } from "@/features/credit/types";
import { WithdrawalDetail, WithdrawalResult } from "./WithdrawalDetail";
import { WithdrawalForm } from "./WithdrawalForm";
import { WithdrawalModal } from "./WithdrawalModal";

/** 목록 위에 올리는 출금 모달 본문. 계좌·처리는 상세 API(목업 getWithdrawal) 결과를 쓴다 */
export function WithdrawalModalContent({
  withdrawal,
  now,
  tab,
}: {
  withdrawal: WithdrawalRequest;
  now: Date;
  tab: ListTab;
}) {
  const closeHref = withdrawalsHref({ tab });
  return (
    <WithdrawalModal
      key={withdrawal.id}
      title={`${withdrawal.nickname} · ${formatWon(withdrawal.amount)}`}
      closeHref={closeHref}
      withdrawalKey={withdrawal.id}
    >
      <WithdrawalDetail withdrawal={withdrawal} now={now} />
      {withdrawal.review ? (
        <WithdrawalResult withdrawal={withdrawal} now={now} />
      ) : (
        <WithdrawalForm withdrawalKey={withdrawal.id} amount={withdrawal.amount} tab={tab} />
      )}
    </WithdrawalModal>
  );
}
