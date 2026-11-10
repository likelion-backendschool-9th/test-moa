import { expect, test } from "@playwright/test";
import { withdrawalErrorsFromServer } from "@/features/credit/withdrawal-errors";

const message = "입력값을 확인해 주세요";

test("#206-S6 서버가 준 칸별 오류는 맞는 칸 아래에만 보인다", () => {
  expect(withdrawalErrorsFromServer({ message, fields: { accountNumber: "계좌번호는 숫자 10~14자리예요", accountHolder: "예금주는 40자까지 쓸 수 있어요" } }))
    .toEqual({ account: "계좌번호는 숫자 10~14자리예요", holder: "예금주는 40자까지 쓸 수 있어요" });
});

test("#206-S6 화면 칸에 없는 서버 칸의 문구는 폼 위쪽에 보인다", () => {
  /* 칸별 오류일 때 최상위 message는 일반 안내라서, 실제 문구를 폼 위쪽에 이어 붙인다 */
  expect(withdrawalErrorsFromServer({ message, fields: { memo: "메모는 20자까지예요", note: "참고를 입력해 주세요" } }))
    .toEqual({ form: "메모는 20자까지예요 참고를 입력해 주세요" });
  expect(withdrawalErrorsFromServer({ message, fields: { amount: "1 크레딧 이상 입력해 주세요", memo: "메모는 20자까지예요" } }))
    .toEqual({ amount: "1 크레딧 이상 입력해 주세요", form: "메모는 20자까지예요" });
});

test("#206-S6 객체 기본 키 이름의 서버 칸은 화면 칸으로 잘못 맞지 않는다", () => {
  for (const name of ["toString", "constructor", "hasOwnProperty", "__proto__"]) {
    const fields = JSON.parse(`{"${name}": "이상한 칸이에요"}`) as Record<string, string>;
    expect(withdrawalErrorsFromServer({ message, fields }), name).toEqual({ form: "이상한 칸이에요" });
  }
});

test("#206-S6 칸별 오류가 없으면 서비스 문구를 폼 위쪽에 보인다", () => {
  expect(withdrawalErrorsFromServer({ message: "출금 가능한 크레딧(0)보다 많아요" })).toEqual({ form: "출금 가능한 크레딧(0)보다 많아요" });
  expect(withdrawalErrorsFromServer({ message: "출금할 수 있는 크레딧이 없어요", fields: {} })).toEqual({ form: "출금할 수 있는 크레딧이 없어요" });
  /* 맞지 않는 칸의 문구가 비어 있으면 일반 안내라도 보인다 */
  expect(withdrawalErrorsFromServer({ message, fields: { memo: "" } })).toEqual({ form: message });
});
