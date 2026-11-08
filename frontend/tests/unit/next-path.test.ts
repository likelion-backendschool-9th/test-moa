import { expect, test } from "@playwright/test";
import { safeNextPath } from "@/lib/next-path";

test("S295 외부 주소·제어문자·정규화 우회는 홈으로 돌린다", () => {
  const unsafe: unknown[] = [
    "https://evil.com", "//evil.com", "/\\evil.com", "/\t/evil.com",
    "/a/..//evil.com", "/a/%2e%2e//evil.com", "javascript:alert(1)", "my",
    "/\u0000/evil.com", "/\n/evil.com", "/\u007f/evil.com",
    null, undefined, 123, ["/my"], { next: "/my" }, "",
  ];
  for (const value of unsafe) {
    expect(safeNextPath(value), JSON.stringify(value)).toBe("/");
  }
});

test("S316 내부 경로는 정규화하고 쿼리를 보존한다", () => {
  const cases = [
    ["/my", "/my"],
    ["/testers/recruitments?tab=ongoing&sort=recent", "/testers/recruitments?tab=ongoing&sort=recent"],
    ["/a/../my?tab=history#section", "/my?tab=history"],
    ["/my?next=https%3A%2F%2Fexample.com", "/my?next=https%3A%2F%2Fexample.com"],
  ];
  for (const [input, expected] of cases) expect(safeNextPath(input), input).toBe(expected);
});
