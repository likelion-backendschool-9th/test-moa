import type { WithdrawalRequest } from "@/features/credit/types";
import { isRejectReason, isWithdrawalDecision, type WithdrawalReview } from "@/features/credit/types";
import type { CreditBalance,CreditEntry,Withdrawal } from "@/features/credit/types";
import type { Role } from "@/features/session/session";
import { cookies } from "next/headers";
import "server-only";


/*
 * 시연용 샘플 데이터. 실제 사용자와 관계없다.
 * 내역 합계는 총 잔액과 맞추고, 총 잔액은 src/lib/session.ts의 값과 맞춘다. 금액은 기획에서 미정이라 임시값이다.
 * 날짜는 기준 시각에서 며칠 전으로 만들어 언제 시연해도 같은 상태로 보인다. 시각은 서울 시간으로 고정해,
 * 하루에 여러 건이 있으면 날짜별 묶음 안에서 시각이 다르게 보인다. 같은 날은 늦은 시각을 먼저 적는다.
 */

export type CreditData = {
  balance: CreditBalance;
  /** 최신순 */
  ledger: CreditEntry[];
  /** 최신순 */
  withdrawals: Withdrawal[];
};


const HOUR_MS = 60 * 60 * 1000;

const DAY_MS = 24 * HOUR_MS;

const SEOUL_OFFSET_MS = 9 * HOUR_MS;


/** 기준 시각에서 days일 전 날의 서울 시간 time("15:12"). days는 1 이상이라 미래 시각이 되지 않는다 */
const daysAgoAt = (now: Date, days: number, time: string) => {
  const day = new Date(now.getTime() + SEOUL_OFFSET_MS - days * DAY_MS);
  const [hour, minute] = time.split(":").map(Number);
  const utc = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), hour, minute) - SEOUL_OFFSET_MS;
  return new Date(utc).toISOString();
};


type EntrySeed = [id: string, label: string, amount: number, daysAgo: number, time: string];


const toLedger = (now: Date, seeds: EntrySeed[]): CreditEntry[] =>
  seeds.map(([id, label, amount, days, time]) => ({ id, label, amount, occurredAt: daysAgoAt(now, days, time) }));


export function buildCreditData(role: Exclude<Role, "guest">, now: Date): CreditData {
  switch (role) {
    /* 보상 10건 12,480 + 가입 3,000 − 출금 지급 3,000 = 12,480 */
    case "tester":
      return {
        balance: { earned: 9480, signup: 3000, pendingWithdrawal: 0, pendingReward: 1350 },
        ledger: toLedger(now, [
          ["t12", "레시피핏 테스트 보상", 1260, 1, "15:12"],
          ["t11", "가계부 노트 테스트 보상", 1100, 1, "09:40"],
          ["t10", "회의록 정리 테스트 보상", 980, 4, "21:05"],
          ["t9", "포트폴리오 빌더 테스트 보상", 1200, 4, "13:30"],
          ["t8", "출금 지급", -3000, 20, "10:02"],
          ["t7", "모아플랜 테스트 보상", 1450, 24, "18:44"],
          ["t6", "스터디 타이머 테스트 보상", 1300, 24, "11:20"],
          ["t5", "오늘의 식단 테스트 보상", 1290, 36, "20:15"],
          ["t4", "여행 메모 테스트 보상", 1200, 41, "16:48"],
          ["t3", "동네 책방 지도 테스트 보상", 1350, 41, "14:05"],
          ["t2", "습관 체크 테스트 보상", 1350, 52, "19:30"],
          ["t1", "가입 크레딧", 3000, 60, "10:00"],
        ]),
        withdrawals: [
          { id: "w2", amount: 3000, status: "paid", bank: "토스뱅크", accountMasked: "****5678", requestedAt: daysAgoAt(now, 22, "14:20") },
          {
            id: "w1",
            amount: 2000,
            status: "rejected",
            bank: "국민은행",
            accountMasked: "****1234",
            requestedAt: daysAgoAt(now, 35, "11:05"),
            rejectReason: "예금주 이름이 회원 정보와 달라요",
          },
        ],
      };
    /* 가입 3,000 − 구독 결제 2,000 + 보상 2건 2,260 = 3,260 */
    case "developer":
      return {
        balance: { earned: 2260, signup: 1000, pendingWithdrawal: 1000, pendingReward: 0 },
        ledger: toLedger(now, [
          ["d4", "구독 결제", -2000, 3, "12:30"],
          ["d3", "북로그 테스트 보상", 1080, 6, "19:10"],
          ["d2", "모아플랜 테스트 보상", 1180, 6, "10:45"],
          ["d1", "가입 크레딧", 3000, 40, "10:00"],
        ]),
        withdrawals: [
          { id: "w3", amount: 1000, status: "requested", bank: "카카오뱅크", accountMasked: "****4321", requestedAt: daysAgoAt(now, 2, "16:25") },
        ],
      };
    case "admin":
      return { balance: { earned: 0, signup: 0, pendingWithdrawal: 0, pendingReward: 0 }, ledger: [], withdrawals: [] };
  }
}


/*
 * 시연용 출금 신청 기록. 프로토타입에서 신청이 화면에 남도록 브라우저 쿠키에만 저장한다.
 * 쿠키라서 다른 브라우저·다른 시연 회원과 섞이지 않고, 병렬 E2E도 서로의 신청을 보지 않는다.
 * 실제 API를 붙이면 이 파일과 호출 두 곳(api.ts의 load, actions.ts의 requestWithdrawal)을 지운다.
 */

type MemberRole = Exclude<Role, "guest">;


const COOKIE_PREFIX = "demo-withdrawals-";

const MAX_REQUESTS = 10;

const WITHDRAWAL_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;


type StoredRequest = { id: string; amount: number; bank: string; last4: string; requestedAt: string };


const cookieName = (role: MemberRole) => `${COOKIE_PREFIX}${role}`;


function isStoredRequest(value: unknown): value is StoredRequest {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.amount === "number" &&
    typeof item.bank === "string" &&
    typeof item.last4 === "string" &&
    typeof item.requestedAt === "string"
  );
}


/** 쿠키 값이 깨졌거나 모양이 다르면 기록이 없는 것으로 본다 */
async function readStored(role: MemberRole): Promise<StoredRequest[]> {
  const raw = (await cookies()).get(cookieName(role))?.value;
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isStoredRequest) : [];
  } catch {
    return [];
  }
}


/** 이 브라우저에서 신청한 출금, 최신순. 운영자 처리가 없어 모두 처리 중이다 */
export async function getDemoWithdrawals(role: MemberRole): Promise<Withdrawal[]> {
  return (await readStored(role)).map(({ last4, ...item }) => ({
    ...item,
    status: "requested",
    accountMasked: `****${last4}`,
  }));
}


/** 신청을 맨 앞에 더한다. 계좌번호는 끝 4자리만 남기고, 오래된 기록부터 지워 최대 10건을 둔다 */
export async function addDemoWithdrawal(role: MemberRole, request: { amount: number; bank: string; account: string }) {
  const now = new Date();
  const next: StoredRequest = {
    id: `demo-${now.getTime()}`,
    amount: request.amount,
    bank: request.bank,
    last4: request.account.slice(-4),
    requestedAt: now.toISOString(),
  };
  const stored = [next, ...(await readStored(role))].slice(0, MAX_REQUESTS);
  (await cookies()).set(cookieName(role), JSON.stringify(stored), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: WITHDRAWAL_MAX_AGE_SECONDS,
  });
}

const hoursAgo = (now: Date, hours: number) => new Date(now.getTime() - hours * HOUR_MS).toISOString();


/** 처리 대기 3건과 이미 처리한 2건. 김민준은 예금주가 회원 이름과 다르다 */
export function buildWithdrawals(now: Date): WithdrawalRequest[] {
  return [
    {
      id: "withdrawal-1",
      nickname: "이지우",
      memberName: "이지우",
      amount: 5000,
      bank: "국민",
      accountNumber: "123456789012",
      accountHolder: "이지우",
      createdAt: hoursAgo(now, 60),
    },
    {
      id: "withdrawal-2",
      nickname: "김민준",
      memberName: "김민준",
      amount: 8200,
      bank: "신한",
      accountNumber: "110234567890",
      accountHolder: "김민지",
      createdAt: hoursAgo(now, 26),
    },
    {
      id: "withdrawal-3",
      nickname: "한서윤",
      memberName: "한서윤",
      amount: 12000,
      bank: "토스뱅크",
      accountNumber: "100012345678",
      accountHolder: "한서윤",
      createdAt: hoursAgo(now, 3),
    },
    {
      id: "withdrawal-4",
      nickname: "오태민",
      memberName: "오태민",
      amount: 3000,
      bank: "카카오뱅크",
      accountNumber: "3333015678",
      accountHolder: "오태민",
      createdAt: hoursAgo(now, 80),
      review: { decision: "paid", memo: "", processedAt: hoursAgo(now, 50) },
    },
    {
      id: "withdrawal-5",
      nickname: "윤소희",
      memberName: "윤소희",
      amount: 2000,
      bank: "우리",
      accountNumber: "1002345670",
      accountHolder: "윤소희",
      createdAt: hoursAgo(now, 120),
      review: { decision: "rejected", reason: "account", memo: "", processedAt: hoursAgo(now, 98) },
    },
  ];
}


/** 출금 요청 키 목록. 신고 키와 같은 이유로 목업에서 뽑아 둔다 */
export const WITHDRAWAL_KEYS = buildWithdrawals(new Date(0)).map((request) => request.id);

export const DEMO_ADMIN_WITHDRAWALS_COOKIE = "demo-admin-withdrawals";


const REVIEW_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/* 브라우저는 이름+값이 4096바이트를 넘는 쿠키를 알리지 않고 버린다. 속성 몫을 남겨 둔다 */
const COOKIE_MAX_BYTES = 4000;


type Validator<T> = (value: unknown) => value is T;


function isWithdrawalReview(value: unknown): value is WithdrawalReview {
  if (typeof value !== "object" || value === null) return false;
  const review = value as Record<string, unknown>;
  if (!isWithdrawalDecision(review.decision) || typeof review.memo !== "string" || typeof review.processedAt !== "string") return false;
  return review.decision === "paid" ? review.reason === undefined : isRejectReason(review.reason);
}


/** 깨진 값은 버리고 올바른 기록만 돌려준다 */
async function readStore<T>(name: string, isValid: Validator<T>): Promise<Record<string, T>> {
  const raw = (await cookies()).get(name)?.value;
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([, record]) => isValid(record)));
  } catch {
    return {};
  }
}


/**
 * Server Action에서만 부른다. 쿠키는 렌더링 중에 쓸 수 없다.
 * Next는 쿠키 값을 encodeURIComponent로 인코딩하므로 인코딩한 길이로 한도를 확인하고, 넘으면 저장하지 않고 false를 돌려준다.
 */
async function saveToStore<T>(name: string, isValid: Validator<T>, key: string, record: T): Promise<boolean> {
  const records = await readStore(name, isValid);
  const value = JSON.stringify({ ...records, [key]: record });
  if (name.length + 1 + encodeURIComponent(value).length > COOKIE_MAX_BYTES) return false;
  (await cookies()).set(name, value, {
    path: "/",
    maxAge: REVIEW_MAX_AGE_SECONDS,
    sameSite: "lax",
  });
  return true;
}


export const readWithdrawalReviews = () => readStore(DEMO_ADMIN_WITHDRAWALS_COOKIE, isWithdrawalReview);


export const saveWithdrawalReview = (withdrawalKey: string, review: WithdrawalReview) =>
  saveToStore(DEMO_ADMIN_WITHDRAWALS_COOKIE, isWithdrawalReview, withdrawalKey, review);
