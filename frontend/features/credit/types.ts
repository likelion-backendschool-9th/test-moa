

/*
 * 크레딧 잔액, 내역, 출금 요청 (GLOSSARY: 크레딧, 승인 대기 보상)
 * 1크레딧 = 1원. 화면에서는 테스트로 받은 크레딧을 "적립 크레딧", 가입 크레딧 같은 이벤트 지급분을 "이벤트 크레딧"이라 부른다.
 * 이벤트 크레딧은 구독 결제 전용이고 적립 크레딧만 현금화할 수 있다.
 */

export type CreditBalance = {
  /** 적립 크레딧. 테스트로 획득한 크레딧이고 구독 결제와 현금화에 쓸 수 있다 */
  earned: number;
  /** 이벤트 크레딧. 가입 크레딧 같은 이벤트 지급분이고 구독 결제 전용이다 */
  signup: number;
  /** 출금 요청 뒤 처리 중이라 잠긴 크레딧. earned에 포함된다 */
  pendingWithdrawal: number;
  /** 승인 대기 보상. 아직 지급 전이라 잔액에 포함하지 않는다 */
  pendingReward: number;
};

export function totalCredits({ earned, signup }: CreditBalance) {
  return earned + signup;
}

/** 구독 결제에 쓸 수 있는 크레딧. 이벤트 크레딧은 포함하고, 출금 처리 중인 크레딧과 승인 대기 보상은 뺀다 */
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

/** 서버 `GET /api/v1/my/credits` 응답 중 화면이 쓰는 값. `earnedBalance`는 출금 처리 중인 금액을 뺀 값이다 */
export type ServerCreditBalance = {
  earnedBalance: number;
  eventCredit: number;
  lockedBalance: number;
  pendingReward: number;
};

/** 서버 잔액을 화면 모양으로 바꾼다. 화면의 `earned`는 출금 처리 중인 금액을 포함해서 잠긴 금액을 더한다 */
export function balanceFromServer({ earnedBalance, eventCredit, lockedBalance, pendingReward }: ServerCreditBalance): CreditBalance {
  return { earned: earnedBalance + lockedBalance, signup: eventCredit, pendingWithdrawal: lockedBalance, pendingReward };
}

/** 서버 `GET /api/v1/my/credits/ledger` 응답의 한 줄. 시각은 오프셋이 붙은 값이다 */
export type ServerCreditLedger = {
  id: number;
  description: string;
  delta: number;
  createdAt: string;
};

/** 서버 내역 한 줄을 화면 모양으로 바꾼다. 이름은 서버의 설명을 그대로 쓴다 */
export function entryFromServer({ id, description, delta, createdAt }: ServerCreditLedger): CreditEntry {
  return { id: String(id), label: description, amount: delta, occurredAt: createdAt };
}

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

/** 서버 `GET /api/v1/my/credits/withdrawals` 응답의 한 줄. 처리 중인 요청의 계좌번호는 그대로, 끝난 요청은 가려져 온다 */
export type ServerWithdrawal = {
  id: number;
  amount: number;
  status: "REQUESTED" | "PAID" | "REJECTED";
  bank: string;
  accountNumber: string;
  rejectReason: "HOLDER" | "ACCOUNT" | "OTHER" | null;
  rejectMemo: string | null;
  requestedAt: string;
};

const SERVER_WITHDRAWAL_STATUS: Record<ServerWithdrawal["status"], WithdrawalStatus> = {
  REQUESTED: "requested",
  PAID: "paid",
  REJECTED: "rejected",
};

/**
 * 서버 출금 한 줄을 화면 값으로 바꾼다. 계좌는 처리 중이어도 끝 4자리만 보이게 가린다(이미 가려진 값도 같은 결과다).
 * 반려는 사유 문구에 운영자가 적은 메모가 있으면 괄호로 붙인다
 */
export function withdrawalFromServer(item: ServerWithdrawal): Withdrawal {
  const reason = item.rejectReason ? REJECT_REASONS[item.rejectReason.toLowerCase() as RejectReason] : undefined;
  const memo = item.rejectMemo?.trim();
  return {
    id: String(item.id),
    amount: item.amount,
    status: SERVER_WITHDRAWAL_STATUS[item.status],
    bank: item.bank,
    accountMasked: maskAccount(item.accountNumber),
    requestedAt: item.requestedAt,
    ...(reason ? { rejectReason: memo ? `${reason} (${memo})` : reason } : memo ? { rejectReason: memo } : {}),
  };
}

export const BANKS = ["국민은행", "신한은행", "우리은행", "하나은행", "농협은행", "카카오뱅크", "토스뱅크"] as const;

/**
 * 처리 메모 최대 글자 수. 시연용 기록은 쿠키에 담기는데, 한글은 인코딩하면 한 글자가 9바이트라
 * 검토 대기 4건을 모두 이 길이로 처리해도 쿠키 한도(4096바이트) 안에 들어가게 정했다.
 */
export const REVIEW_MEMO_MAX_LENGTH = 80;

/** 운영자의 출금 처리 결과. 테스터 출금 내역의 상태 이름과 맞춘다 */
export type WithdrawalDecision = "paid" | "rejected";

export const WITHDRAWAL_DECISION_LABEL: Record<WithdrawalDecision, string> = {
  paid: "지급 완료",
  rejected: "반려",
};

export function isWithdrawalDecision(value: unknown): value is WithdrawalDecision {
  return value === "paid" || value === "rejected";
}

/** 반려 사유. 문구는 테스터 출금 내역에 그대로 보인다. 메모는 사유와 상관없이 따로 보인다("기타"만 필수) */
export const REJECT_REASONS = {
  holder: "예금주 이름이 회원 정보와 달라요",
  account: "계좌번호를 확인할 수 없어요",
  other: "기타",
} as const;

export type RejectReason = keyof typeof REJECT_REASONS;

export function isRejectReason(value: unknown): value is RejectReason {
  return typeof value === "string" && Object.hasOwn(REJECT_REASONS, value);
}

/** 출금 처리 양식이 막힌 이유. 저장 공간 부족은 memo, 기타에 메모가 없으면 note */
export type RequestFormError = "decision" | "reason" | "note" | "memo" | "server";

/** 출금 처리 Server Action의 응답. 처리되면 목록으로 이동해서 오류만 돌려준다 */
export type RequestFormState = { error: RequestFormError | null };

/** 출금 처리 기록. 처리 전 요청에는 없다. 반려에만 reason이 있다 */
export type WithdrawalReview = {
  decision: WithdrawalDecision;
  reason?: RejectReason;
  /** 반려 메모. 사유와 상관없이 회원에게 그대로 보인다. "기타"만 필수다 */
  memo: string;
  processedAt: string;
};

/** 회원에게 보이는 반려 사유 */
export function rejectReasonText(review: WithdrawalReview) {
  if (!review.reason) return "";
  return REJECT_REASONS[review.reason];
}

/** 출금 요청. id가 상세 주소의 withdrawalKey다 */
export type WithdrawalRequest = {
  id: string;
  nickname: string;
  /** 가입 정보의 실명. 예금주와 비교한다 */
  memberName: string;
  /** 크레딧. 1크레딧 = 1원 */
  amount: number;
  bank: string;
  /** 숫자 10~14자리. 처리 대기 상세에서만 전체를 보여 준다 */
  accountNumber: string;
  accountHolder: string;
  createdAt: string;
  review?: WithdrawalReview;
};

/** 서버 `GET /api/v1/admin/withdrawals` 응답의 한 줄. 처리 대기는 계좌·예금주 전체, 끝난 요청은 가려져 온다 */
export type ServerAdminWithdrawal = {
  id: number;
  nickname: string;
  /** 가입 실명 */
  userName: string;
  amount: number;
  status: "REQUESTED" | "PAID" | "REJECTED";
  bank: string;
  accountNumber: string;
  accountHolder: string;
  rejectReason: "HOLDER" | "ACCOUNT" | "OTHER" | null;
  rejectMemo: string | null;
  requestedAt: string;
  processedAt: string | null;
};

/**
 * 주소의 키가 서버 출금 id(Long)가 될 수 있는지. 0으로 시작하지 않는 18자리 이하 숫자만 받는다.
 * 더 긴 숫자는 Long을 넘을 수 있고, 그러면 서버가 404가 아니라 400으로 답해 오류 화면이 된다
 */
export function isServerWithdrawalId(key: string) {
  return /^[1-9]\d{0,17}$/.test(key);
}

/** 서버 출금 요청 한 줄을 운영자 화면 값으로 바꾼다. 처리 대기는 `review`가 없다 */
export function adminWithdrawalFromServer(item: ServerAdminWithdrawal): WithdrawalRequest {
  const request: WithdrawalRequest = {
    id: String(item.id),
    nickname: item.nickname,
    memberName: item.userName,
    amount: item.amount,
    bank: item.bank,
    accountNumber: item.accountNumber,
    accountHolder: item.accountHolder,
    createdAt: item.requestedAt,
  };
  if (item.status === "REQUESTED") return request;
  const reason = item.rejectReason?.toLowerCase();
  return {
    ...request,
    review: {
      decision: item.status === "PAID" ? "paid" : "rejected",
      ...(reason && isRejectReason(reason) ? { reason } : {}),
      memo: item.rejectMemo ?? "",
      processedAt: item.processedAt ?? item.requestedAt,
    },
  };
}

/** 예금주가 회원 이름과 다른지. 알리기만 하고 처리를 막지는 않는다 */
export function isHolderMismatch(request: WithdrawalRequest) {
  return request.accountHolder !== request.memberName;
}

/** 처리가 끝난 계좌는 끝 4자리만 보여 준다 */
export function maskAccount(accountNumber: string) {
  return `****${accountNumber.slice(-4)}`;
}
