import type { Role } from "@/lib/session";
import type { CreditBalance, CreditEntry, Withdrawal } from "./types";

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
