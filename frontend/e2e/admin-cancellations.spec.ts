import { expect, test, type Page } from "@playwright/test";
import { setDemo } from "./helpers";

const rows = (page: Page) => page.getByRole("main").locator("ul[aria-label] > li");
const statusTabs = (page: Page) => page.getByRole("navigation", { name: "모집 취소 요청 상태" });
const region = (page: Page, name: string) => page.getByRole("region", { name });

type Decision = { decision: "승인" } | { decision: "반려"; reason: string; memo?: string };

async function decide(page: Page, cancellationKey: string, choice: Decision) {
  await page.goto(`/admin/cancellations/${cancellationKey}`);
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

test.describe("R49 목록", () => {
  test("S255 처리 대기는 오래 기다린 순서다", async ({ page }) => {
    await page.goto("/admin/cancellations");
    await expect(statusTabs(page).getByRole("link", { name: "처리 대기" })).toHaveAttribute("aria-current", "page");
    await expect(rows(page)).toHaveCount(2);
    await expect(rows(page).nth(0)).toContainText("레시피핏");
    await expect(rows(page).nth(1)).toContainText("동네 러닝 크루");
    for (const text of ["박도현", "확정 테스터", "요청"]) {
      await expect(rows(page).first()).toContainText(text);
    }
  });
});

test.describe("R50 상세", () => {
  test("S261 모집 건 현황과 승인하면 함께 취소되는 것을 보여 준다", async ({ page }) => {
    await page.goto("/admin/cancellations/cancellation-1");
    const status = region(page, "모집 건 현황");
    for (const text of ["모집 중", "3명", "0건"]) {
      await expect(status).toContainText(text);
    }
    await expect(status).toContainText("승인하면 확정 테스터 3명의 참여도 함께 취소돼요. 테스트 전이라 지급할 보상은 없어요.");
  });

  test("S278 테스트가 이미 시작됐으면 알린다", async ({ page }) => {
    await page.goto("/admin/cancellations/cancellation-4");
    const status = region(page, "모집 건 현황");
    await expect(status).toContainText("이미 테스트가 시작됐어요.");
    await expect(status).toContainText("1건");
  });
});

test.describe("R51 처리", () => {
  test("S266 승인하면 처리 완료로 옮겨진다", async ({ page }) => {
    await decide(page, "cancellation-1", { decision: "승인" });
    await expect(page).toHaveURL(/\/admin\/cancellations\?processed=cancellation-1$/);
    await expect(page.getByRole("status")).toHaveText("레시피핏 모집을 취소했어요. 확정 테스터 3명의 참여도 함께 취소돼요.");
    await expect(rows(page)).toHaveCount(1);
    await statusTabs(page).getByRole("link", { name: "처리 완료" }).click();
    await expect(rows(page).first()).toContainText("레시피핏");
    await expect(rows(page).first()).toContainText("승인");
  });

  test("S268 반려하면 모집은 그대로 진행된다", async ({ page }) => {
    await decide(page, "cancellation-1", { decision: "반려", reason: "이미 테스트가 진행 중이에요" });
    await expect(page).toHaveURL(/\/admin\/cancellations\?processed=cancellation-1$/);
    await expect(page.getByRole("status")).toHaveText("취소 요청을 반려했어요. 모집은 그대로 진행돼요.");
    await statusTabs(page).getByRole("link", { name: "처리 완료" }).click();
    await expect(rows(page).filter({ hasText: "레시피핏" })).toContainText("반려");
  });

  test("S269 처리한 요청의 상세는 결과만 보여 준다", async ({ page }) => {
    await decide(page, "cancellation-1", { decision: "반려", reason: "이미 테스트가 진행 중이에요" });
    await page.goto("/admin/cancellations/cancellation-1");
    await expect(page.getByRole("button", { name: "처리하기" })).toHaveCount(0);
    const result = region(page, "처리 결과");
    for (const text of ["반려", "이미 테스트가 진행 중이에요", "처리"]) {
      await expect(result).toContainText(text);
    }
  });

  test("S270 주소를 바꿔도 처리하지 않은 요청의 결과 문구는 나오지 않는다", async ({ page }) => {
    await page.goto("/admin/cancellations?processed=cancellation-1");
    await expect(rows(page)).toHaveCount(2);
    await expect(page.getByRole("status")).toHaveCount(0);
  });
});
