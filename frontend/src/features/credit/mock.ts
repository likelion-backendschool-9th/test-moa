import type { Role } from "@/lib/session";
import type { CreditBalance, CreditEntry, Withdrawal } from "./types";

/*
 * 시연용 샘플 데이터. 실제 사용자와 관계없다.
 * 내역 합계는 총 잔액과 맞추고, 총 잔액은 src/lib/session.ts의 값과 맞춘다. 금액은 기획에서 미정이라 임시값이다.
 * 날짜는 기준 시각에서 상대적으로 만들어 언제 시연해도 같은 상태로 보인다.
 */

export type CreditData = {
  balance: CreditBalance;
  /** 최신순 */
  ledger: CreditEntry[];
  /** 최신순 */
  withdrawals: Withdrawal[];
};

const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (now: Date, days: number) => new Date(now.getTime() - days * DAY_MS).toISOString();

type EntrySeed = [id: string, label: string, amount: number, daysAgo: number];

const toLedger = (now: Date, seeds: EntrySeed[]): CreditEntry[] =>
  seeds.map(([id, label, amount, days]) => ({ id, label, amount, occurredAt: daysAgo(now, days) }));

export function buildCreditData(role: Exclude<Role, "guest">, now: Date): CreditData {
  switch (role) {
    /* 보상 10건 12,480 + 가입 3,000 − 출금 지급 3,000 = 12,480 */
    case "tester":
      return {
        balance: { earned: 9480, signup: 3000, pendingWithdrawal: 0, pendingReward: 1350 },
        ledger: toLedger(now, [
          ["t12", "레시피핏 테스트 보상", 1260, 1],
          ["t11", "가계부 노트 테스트 보상", 1100, 4],
          ["t10", "회의록 정리 테스트 보상", 980, 9],
          ["t9", "포트폴리오 빌더 테스트 보상", 1200, 15],
          ["t8", "출금 지급", -3000, 20],
          ["t7", "모아플랜 테스트 보상", 1450, 24],
          ["t6", "스터디 타이머 테스트 보상", 1300, 30],
          ["t5", "오늘의 식단 테스트 보상", 1290, 36],
          ["t4", "여행 메모 테스트 보상", 1200, 41],
          ["t3", "동네 책방 지도 테스트 보상", 1350, 47],
          ["t2", "습관 체크 테스트 보상", 1350, 52],
          ["t1", "가입 크레딧", 3000, 60],
        ]),
        withdrawals: [
          { id: "w2", amount: 3000, status: "paid", bank: "토스뱅크", accountMasked: "****5678", requestedAt: daysAgo(now, 22) },
          {
            id: "w1",
            amount: 2000,
            status: "rejected",
            bank: "국민은행",
            accountMasked: "****1234",
            requestedAt: daysAgo(now, 35),
            rejectReason: "예금주 이름이 회원 정보와 달라요",
          },
        ],
      };
    /* 가입 3,000 − 구독 결제 2,000 + 보상 2건 2,260 = 3,260 */
    case "developer":
      return {
        balance: { earned: 2260, signup: 1000, pendingWithdrawal: 1000, pendingReward: 0 },
        ledger: toLedger(now, [
          ["d4", "구독 결제", -2000, 3],
          ["d3", "북로그 테스트 보상", 1080, 6],
          ["d2", "모아플랜 테스트 보상", 1180, 12],
          ["d1", "가입 크레딧", 3000, 40],
        ]),
        withdrawals: [
          { id: "w3", amount: 1000, status: "requested", bank: "카카오뱅크", accountMasked: "****4321", requestedAt: daysAgo(now, 2) },
        ],
      };
    case "admin":
      return { balance: { earned: 0, signup: 0, pendingWithdrawal: 0, pendingReward: 0 }, ledger: [], withdrawals: [] };
  }
}
