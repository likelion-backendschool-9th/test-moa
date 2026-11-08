import { expect, test, type Page } from "@playwright/test";
import { setDemo } from "./helpers";

const rows = (page: Page) => page.getByRole("main").locator("ul[aria-label] > li");
const statusTabs = (page: Page) => page.getByRole("navigation", { name: "출금 요청 상태" });
const modal = (page: Page) => page.getByRole("dialog");

async function expectNoAccountNumbersInList(page: Page) {
  for (const number of ["123456789012", "110234567890", "100012345678", "3333015678", "1002345670"]) {
    await expect(page.getByRole("main"), `출금 목록의 계좌번호 비노출: ${number}`).not.toContainText(number);
  }
}

type Decision = { decision: "지급 완료" } | { decision: "반려"; reason: string; memo?: string };

async function openWithdrawal(page: Page, withdrawalKey: string, tab?: "done") {
  const query = new URLSearchParams();
  if (tab === "done") query.set("tab", "done");
  query.set("open", withdrawalKey);
  await page.goto(`/admin/withdrawals?${query.toString()}`);
  await expect(modal(page)).toBeVisible();
}

async function decide(page: Page, withdrawalKey: string, choice: Decision) {
  await openWithdrawal(page, withdrawalKey);
  await modal(page).getByRole("group", { name: "처리 결과" }).getByRole("radio", { name: new RegExp(`^${choice.decision}`) }).check();
  if (choice.decision === "반려") {
    await modal(page).getByRole("group", { name: "반려 사유" }).getByRole("radio", { name: choice.reason }).check();
    if (choice.memo) await modal(page).getByRole("textbox", { name: "반려 메모" }).fill(choice.memo);
  }
  /* Server Action 성공 시 redirect라 navigation wait를 끄고, 결과 문구·오류로 완료를 본다 */
  await modal(page).getByRole("button", { name: "처리하기" }).click({ noWaitAfter: true });
  /* 처리되면 목록의 결과 문구(p[role=status])가 보이고, 막히면 모달 안 alert가 남는다.
   * 계좌 복사 버튼의 빈 span[role=status]는 성공 신호로 쓰지 않는다. */
  await expect(modal(page).getByRole("alert").or(page.locator("main p[role='status']"))).toBeVisible();
}

test.beforeEach(async ({ context }) => {
  await setDemo(context, { role: "admin" });
});

test.describe("R34 모달", () => {
  test("S203 처리 완료 모달은 계좌번호 끝 4자리만 보여 준다", async ({ page }) => {
    await openWithdrawal(page, "withdrawal-4", "done");
    const account = modal(page).getByRole("region", { name: "받을 계좌" });
    await expect(account).toContainText("****5678");
    await expect(account).not.toContainText("3333015678");
    await expect(modal(page).getByRole("button", { name: "계좌번호 복사" })).toHaveCount(0);
  });
});

test.describe("R35 처리", () => {
  test("S206 반려는 사유가 있어야 하고 기타는 메모가 있어야 한다", async ({ page }) => {
    await openWithdrawal(page, "withdrawal-1");
    await modal(page).getByRole("radio", { name: /^반려/ }).check();
    await modal(page).getByRole("button", { name: "처리하기" }).click({ noWaitAfter: true });
    await expect(modal(page).getByRole("alert")).toHaveText("반려 사유를 골라 주세요.");
    await decide(page, "withdrawal-1", { decision: "반려", reason: "기타" });
    await expect(modal(page).getByRole("alert")).toHaveText("회원에게 보여 줄 사유를 적어 주세요.");
    await page.goto("/admin/withdrawals");
    await expect(rows(page)).toHaveCount(3);
  });

  test("S207 지급 완료하면 처리 완료로 옮겨진다", async ({ page }) => {
    await page.goto("/admin/withdrawals");
    await expect(rows(page)).toHaveCount(3);
    await expectNoAccountNumbersInList(page);
    await decide(page, "withdrawal-1", { decision: "지급 완료" });
    await expect(page).toHaveURL(/\/admin\/withdrawals\?processed=withdrawal-1$/);
    await expect(page.getByRole("status")).toHaveText("5,000원을 지급 완료로 처리했어요.");
    await expect(rows(page)).toHaveCount(2);
    await expect(page.getByRole("main")).toContainText("2건 · 20,200원");
    await statusTabs(page).getByRole("link", { name: "처리 완료" }).click();
    await expect(rows(page).first()).toContainText("이지우");
    await expect(rows(page).first()).toContainText("지급 완료");
    await expectNoAccountNumbersInList(page);
  });


  test("#68-S11 반려 메모는 회원에게 그대로 보인다고 안내한다", async ({ page }) => {
    await openWithdrawal(page, "withdrawal-1");
    await modal(page).getByRole("radio", { name: /^반려/ }).check();
    await expect(modal(page)).toContainText("메모는 회원에게 그대로 보여요. 사유가 \u201c기타\u201d이면 꼭 적고, 다른 사유는 필요할 때만 적어요.");
    await expect(modal(page)).not.toContainText("운영자 기록");
  });

  test("#68-S12 기타가 아닌 반려의 메모도 회원에게 보이는 메모로 남는다", async ({ page }) => {
    await decide(page, "withdrawal-1", { decision: "반려", reason: "계좌번호를 확인할 수 없어요", memo: "은행 조회 결과 없음" });
    await openWithdrawal(page, "withdrawal-1", "done");
    const result = modal(page).getByRole("region", { name: "처리 결과" });
    await expect(result).toContainText("계좌번호를 확인할 수 없어요");
    await expect(result).toContainText("회원에게 보이는 메모");
    await expect(result).toContainText("은행 조회 결과 없음");
    await expect(page.getByText("운영자 메모")).toHaveCount(0);
  });

  test("#68-S13 기타 반려도 사유와 메모를 따로 보여 준다", async ({ page }) => {
    await decide(page, "withdrawal-3", { decision: "반려", reason: "기타", memo: "서류가 부족해요" });
    await openWithdrawal(page, "withdrawal-3", "done");
    const result = modal(page).getByRole("region", { name: "처리 결과" });
    await expect(result.getByText("반려 사유", { exact: true })).toBeVisible();
    await expect(result.locator("dd", { hasText: /^기타$/ })).toBeVisible();
    await expect(result.locator("dd", { hasText: "서류가 부족해요" })).toBeVisible();
  });

  test("S219 주소를 바꿔도 처리하지 않은 요청이나 틀린 금액은 문구에 나오지 않는다", async ({ page }) => {
    for (const path of ["/admin/withdrawals?processed=withdrawal-1", "/admin/withdrawals?processed=paid&amount=9999999"]) {
      await page.goto(path);
      await expect(rows(page)).toHaveCount(3);
      await expect(page.getByRole("status")).toHaveCount(0);
    }
  });
});
