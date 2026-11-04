import { expect, test, type Page } from "@playwright/test";
import { setDemo } from "./helpers";

const rows = (page: Page) => page.getByRole("main").locator("ul[aria-label] > li");
const statusTabs = (page: Page) => page.getByRole("navigation", { name: "출금 요청 상태" });

type Decision = { decision: "지급 완료" } | { decision: "반려"; reason: string; memo?: string };

async function decide(page: Page, withdrawalKey: string, choice: Decision) {
  await page.goto(`/admin/withdrawals/${withdrawalKey}`);
  await page.getByRole("group", { name: "처리 결과" }).getByRole("radio", { name: new RegExp(`^${choice.decision}`) }).check();
  if (choice.decision === "반려") {
    await page.getByRole("group", { name: "반려 사유" }).getByRole("radio", { name: choice.reason }).check();
    if (choice.memo) await page.getByRole("textbox", { name: "반려 메모" }).fill(choice.memo);
  }
  await page.getByRole("button", { name: "처리하기" }).click();
  /* 처리되면 목록으로 가고, 막히면 상세에 남아 오류를 보여 준다. 어느 쪽이든 서버 응답을 기다린다 */
  await expect(page.getByRole("main").getByRole("alert").or(statusTabs(page))).toBeVisible();
}

test.beforeEach(async ({ context }) => {
  await setDemo(context, { role: "admin" });
});

test.describe("R33 목록", () => {
  test("S196 처리 대기는 오래 기다린 순서이고 계좌번호가 없다", async ({ page }) => {
    await page.goto("/admin/withdrawals");
    await expect(statusTabs(page).getByRole("link", { name: "처리 대기" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("main")).toContainText("3건 · 25,200원");
    const list = rows(page);
    await expect(list).toHaveCount(3);
    for (const [index, name] of ["이지우", "김민준", "한서윤"].entries()) {
      await expect(list.nth(index)).toContainText(name);
    }
    for (const text of ["5,000원", "국민", "신청"]) {
      await expect(list.first()).toContainText(text);
    }
    for (const number of ["123456789012", "110234567890", "100012345678"]) {
      await expect(page.getByRole("main")).not.toContainText(number);
    }
  });

  test("S197 예금주가 다른 요청에 확인 필요 표시가 있다", async ({ page }) => {
    await page.goto("/admin/withdrawals");
    await expect(rows(page).filter({ hasText: "김민준" })).toContainText("예금주 확인 필요");
    await expect(rows(page).filter({ hasText: "예금주 확인 필요" })).toHaveCount(1);
  });
});

test.describe("R34 상세", () => {
  test("S203 처리 완료 상세는 계좌번호 끝 4자리만 보여 준다", async ({ page }) => {
    await page.goto("/admin/withdrawals/withdrawal-4");
    const account = page.getByRole("region", { name: "받을 계좌" });
    await expect(account).toContainText("****5678");
    await expect(account).not.toContainText("3333015678");
    await expect(page.getByRole("button", { name: "계좌번호 복사" })).toHaveCount(0);
  });
});

test.describe("R35 처리", () => {
  test("S206 반려는 사유가 있어야 하고 기타는 메모가 있어야 한다", async ({ page }) => {
    await page.goto("/admin/withdrawals/withdrawal-1");
    await page.getByRole("radio", { name: /^반려/ }).check();
    await page.getByRole("button", { name: "처리하기" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toHaveText("반려 사유를 골라 주세요.");
    await decide(page, "withdrawal-1", { decision: "반려", reason: "기타" });
    await expect(page.getByRole("main").getByRole("alert")).toHaveText("회원에게 보여 줄 사유를 적어 주세요.");
    await page.goto("/admin/withdrawals");
    await expect(rows(page)).toHaveCount(3);
  });

  test("S207 지급 완료하면 처리 완료로 옮겨진다", async ({ page }) => {
    await decide(page, "withdrawal-1", { decision: "지급 완료" });
    await expect(page).toHaveURL(/\/admin\/withdrawals\?processed=withdrawal-1$/);
    await expect(page.getByRole("status")).toHaveText("5,000원을 지급 완료로 처리했어요.");
    await expect(rows(page)).toHaveCount(2);
    await expect(page.getByRole("main")).toContainText("2건 · 20,200원");
    await statusTabs(page).getByRole("link", { name: "처리 완료" }).click();
    await expect(rows(page).first()).toContainText("이지우");
    await expect(rows(page).first()).toContainText("지급 완료");
  });

  test("S208 반려하면 크레딧이 돌아간다는 문구가 보인다", async ({ page }) => {
    await decide(page, "withdrawal-2", { decision: "반려", reason: "예금주 이름이 회원 정보와 달라요" });
    await expect(page).toHaveURL(/\/admin\/withdrawals\?processed=withdrawal-2$/);
    await expect(page.getByRole("status")).toHaveText("출금 요청을 반려했어요. 잠긴 크레딧이 회원에게 돌아가요.");
    await statusTabs(page).getByRole("link", { name: "처리 완료" }).click();
    await expect(rows(page).filter({ hasText: "김민준" })).toContainText("반려");
  });

  test("S209 처리한 요청의 상세는 결과만 보여 준다", async ({ page }) => {
    await decide(page, "withdrawal-2", { decision: "반려", reason: "예금주 이름이 회원 정보와 달라요" });
    await page.goto("/admin/withdrawals/withdrawal-2");
    await expect(page.getByRole("button", { name: "처리하기" })).toHaveCount(0);
    const result = page.getByRole("region", { name: "처리 결과" });
    await expect(result).toContainText("반려");
    await expect(result).toContainText("예금주 이름이 회원 정보와 달라요");
    await expect(result).toContainText("처리");
    await expect(page.getByRole("region", { name: "받을 계좌" })).toContainText("****7890");
  });

  test("S219 주소를 바꿔도 처리하지 않은 요청이나 틀린 금액은 문구에 나오지 않는다", async ({ page }) => {
    for (const path of ["/admin/withdrawals?processed=withdrawal-1", "/admin/withdrawals?processed=paid&amount=9999999"]) {
      await page.goto(path);
      await expect(rows(page)).toHaveCount(3);
      await expect(page.getByRole("status")).toHaveCount(0);
    }
  });
});
