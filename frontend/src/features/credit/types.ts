/*
 * 크레딧 잔액, 내역, 출금 요청 (GLOSSARY: 크레딧, 승인 대기 보상)
 * 1크레딧 = 1원. 가입 크레딧은 구독 결제 전용이고 테스트로 받은 크레딧만 현금화할 수 있다.
 */

export type CreditBalance = {
  /** 테스트로 획득한 크레딧. 구독 결제와 현금화에 쓸 수 있다 */
  earned: number;
  /** 가입 크레딧. 구독 결제 전용이다 */
  signup: number;
  /** 출금 요청 뒤 처리 중이라 잠긴 크레딧. earned에 포함된다 */
  pendingWithdrawal: number;
  /** 승인 대기 보상. 아직 지급 전이라 잔액에 포함하지 않는다 */
  pendingReward: number;
};

export function totalCredits({ earned, signup }: CreditBalance) {
  return earned + signup;
}

/** 구독 결제에 쓸 수 있는 크레딧. 가입 크레딧은 포함하고, 출금 처리 중인 크레딧과 승인 대기 보상은 뺀다 */
export function payableCredits({ earned, signup, pendingWithdrawal }: CreditBalance) {
  return earned - pendingWithdrawal + signup;
}

/** 지금 출금 신청할 수 있는 크레딧 */
export function cashableCredits({ earned, pendingWithdrawal }: CreditBalance) {
  return earned - pendingWithdrawal;
}

/** 잔액이 실제로 바뀐 기록. 출금 요청·반려는 잠금·해제라 여기에 남지 않는다 */
export type CreditEntry = {
  id: string;
  label: string;
  /** 늘어나면 양수, 줄어들면 음수 */
  amount: number;
  occurredAt: string;
};

/** 크레딧 내역 필터. URL의 type 값 */
export const LEDGER_TYPES = ["all", "in", "out"] as const;
export type LedgerType = (typeof LEDGER_TYPES)[number];

export const LEDGER_TYPE_LABEL: Record<LedgerType, string> = {
  all: "전체",
  in: "받은 크레딧",
  out: "쓴 크레딧",
};

/** 출금 요청 상태. 운영자가 지급하면 paid, 반려하면 rejected */
export type WithdrawalStatus = "requested" | "paid" | "rejected";

export const WITHDRAWAL_STATUS_LABEL: Record<WithdrawalStatus, string> = {
  requested: "처리 중",
  paid: "지급 완료",
  rejected: "반려",
};

export type Withdrawal = {
  id: string;
  /** 크레딧 = 원 */
  amount: number;
  status: WithdrawalStatus;
  bank: string;
  /** 끝 4자리만 남긴 계좌번호 */
  accountMasked: string;
  requestedAt: string;
  rejectReason?: string;
};

export const BANKS = ["국민은행", "신한은행", "우리은행", "하나은행", "농협은행", "카카오뱅크", "토스뱅크"] as const;
