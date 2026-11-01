import { processCancellation } from "../actions";
import { DEMO_ADMIN_CANCELLATIONS_COOKIE } from "../reviews";
import { CANCELLATION_REJECT_REASONS } from "../types";
import { RequestReviewForm } from "./RequestReviewForm";

/** 모집 취소 처리 양식. 모양과 동작은 출금과 같은 RequestReviewForm이고 문구만 모집 취소에 맞춘다 */
export function CancellationForm({ cancellationKey, confirmedCount }: { cancellationKey: string; confirmedCount: number }) {
  return (
    <RequestReviewForm
      action={processCancellation}
      keyName="cancellationKey"
      keyValue={cancellationKey}
      idPrefix="cancellation"
      accept={{
        value: "approved",
        label: "승인",
        detail: confirmedCount > 0 ? `모집을 취소해요. 확정 테스터 ${confirmedCount}명의 참여도 함께 취소돼요.` : "모집을 취소해요.",
      }}
      rejectDetail="모집은 그대로 진행돼요."
      reasons={CANCELLATION_REJECT_REASONS}
      audience="개발자"
      cookieName={DEMO_ADMIN_CANCELLATIONS_COOKIE}
    />
  );
}
