import { expect, test } from "@playwright/test";
import { balanceFromServer, cashableCredits, entryFromServer, payableCredits, totalCredits, withdrawalFromServer } from "@/features/credit/types";

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

test("#205-S2 서버 잔액을 화면 값으로 바꿔도 총 잔액·결제 가능액·출금 가능액이 서버 값과 같다", () => {
  const balance = balanceFromServer({ earnedBalance: 12000, eventCredit: 3000, lockedBalance: 2000, pendingReward: 1350 });
  expect(balance).toEqual({ earned: 14000, signup: 3000, pendingWithdrawal: 2000, pendingReward: 1350 });
  /* 서버 응답의 totalCredits(12000+3000+2000), payableCredits(12000+3000), cashableCredits(12000) */
  expect({ total: totalCredits(balance), payable: payableCredits(balance), cashable: cashableCredits(balance) })
    .toEqual({ total: 17000, payable: 15000, cashable: 12000 });
});

test("#205-S2 지갑이 없는 회원은 모두 0이고 승인 대기만 서버 값이다", () => {
  const balance = balanceFromServer({ earnedBalance: 0, eventCredit: 0, lockedBalance: 0, pendingReward: 1350 });
  expect({ total: totalCredits(balance), payable: payableCredits(balance), cashable: cashableCredits(balance) })
    .toEqual({ total: 0, payable: 0, cashable: 0 });
  expect(balance.pendingReward).toBe(1350);
});

test("#205-S3 서버 내역 한 줄은 설명을 이름으로, 증감을 금액으로, 시각을 그대로 옮긴다", () => {
  expect(entryFromServer({ id: 7, description: "구독 결제(이벤트 크레딧)", delta: -3000, createdAt: "2026-11-09T05:12:00Z" }))
    .toEqual({ id: "7", label: "구독 결제(이벤트 크레딧)", amount: -3000, occurredAt: "2026-11-09T05:12:00Z" });
});

test("#206-S4 서버 출금 응답을 화면 값으로 바꾼다: 상태 이름, 끝 4자리 계좌, 사유와 메모, 시각", () => {
  const base = { id: 3, amount: 2000, bank: "토스뱅크", requestedAt: "2026-11-09T05:12:00Z" };
  expect(withdrawalFromServer({ ...base, status: "REQUESTED", accountNumber: "100012345678", rejectReason: null, rejectMemo: null }))
    .toEqual({ id: "3", amount: 2000, status: "requested", bank: "토스뱅크", accountMasked: "****5678", requestedAt: "2026-11-09T05:12:00Z" });
  /* 끝난 요청은 서버가 이미 가려서 준다. 같은 결과가 나온다 */
  expect(withdrawalFromServer({ ...base, status: "PAID", accountNumber: "****5678", rejectReason: null, rejectMemo: null }).accountMasked).toBe("****5678");
  expect(withdrawalFromServer({ ...base, status: "REJECTED", accountNumber: "****5678", rejectReason: "HOLDER", rejectMemo: null }))
    .toMatchObject({ status: "rejected", rejectReason: "예금주 이름이 회원 정보와 달라요" });
  expect(withdrawalFromServer({ ...base, status: "REJECTED", accountNumber: "****5678", rejectReason: "OTHER", rejectMemo: " 본인 계좌가 아니에요 " }))
    .toMatchObject({ rejectReason: "기타 (본인 계좌가 아니에요)" });
  /* 사유가 없는 반려도 오류 없이 변환된다 */
  expect(withdrawalFromServer({ ...base, status: "REJECTED", accountNumber: "****5678", rejectReason: null, rejectMemo: null }).rejectReason).toBeUndefined();
});
