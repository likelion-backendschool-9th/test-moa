import { expect, test } from "@playwright/test";
import { validateNickname } from "@/features/member/validation";

test("S314 닉네임은 한글·영문·숫자 1~39자만 허용한다", () => {
  for (const nickname of ["가", "a", "1", "가a1", "가".repeat(39)]) {
    expect(validateNickname(nickname), nickname).toBeUndefined();
  }
  for (const nickname of ["", "가".repeat(40), "모아 닉네임", "moa_name", "😀"]) {
    expect(validateNickname(nickname), nickname).toBeDefined();
  }
});
