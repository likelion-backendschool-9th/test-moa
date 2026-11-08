import { expect, test } from "@playwright/test";
import { cashableCredits, payableCredits, totalCredits } from "@/features/credit/types";

test("S350 S391 잔액·결제 가능액·출금 가능액은 잠금과 이벤트·대기 보상을 구분한다", () => {
  const cases = [
    { balance: { earned: 9480, signup: 3000, pendingWithdrawal: 0, pendingReward: 1350 }, total: 12480, payable: 12480, cashable: 9480 },
    { balance: { earned: 9480, signup: 3000, pendingWithdrawal: 5000, pendingReward: 1350 }, total: 12480, payable: 7480, cashable: 4480 },
    { balance: { earned: 9480, signup: 3000, pendingWithdrawal: 9480, pendingReward: 1350 }, total: 12480, payable: 3000, cashable: 0 },
    { balance: { earned: 0, signup: 0, pendingWithdrawal: 0, pendingReward: 1350 }, total: 0, payable: 0, cashable: 0 },
  ];
  for (const { balance, total, payable, cashable } of cases) {
    expect({ total: totalCredits(balance), payable: payableCredits(balance), cashable: cashableCredits(balance) })
      .toEqual({ total, payable, cashable });
  }
});
