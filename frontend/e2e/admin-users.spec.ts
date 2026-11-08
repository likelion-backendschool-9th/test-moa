import { expect, test, type Page } from "@playwright/test";
import { setDemo } from "./helpers";

const rows = (page: Page) => page.getByRole("main").getByRole("list", { name: "회원" }).getByRole("listitem");
const filters = (page: Page) => page.getByRole("navigation", { name: "회원 필터" });
const region = (page: Page, name: string) => page.getByRole("region", { name });

async function expectNicknames(page: Page, nicknames: string[]) {
  await expect(rows(page)).toHaveCount(nicknames.length);
  for (const [index, nickname] of nicknames.entries()) {
    await expect(rows(page).nth(index)).toContainText(nickname);
  }
}

/* 신고·제재 관리에서 신고를 처리한다. 처리 결과는 회원 관리에도 반영된다 */
async function decideReport(page: Page, reportKey: string, decision: "기각" | "인정") {
  await page.goto(`/admin/reports/${reportKey}`);
  await page.getByRole("radio", { name: new RegExp(`^${decision}`) }).check();
  await page.getByRole("button", { name: "처리하기" }).click();
  await expect(page).toHaveURL(/\/admin\/reports\?processed=/);
}

const ALL_NICKNAMES = ["강민서", "김민준", "한서윤", "윤소희", "오태민", "이지우", "서준호", "최유나", "정하린", "박도현"];

test.beforeEach(async ({ context }) => {
  await setDemo(context, { role: "admin" });
});

test.describe("R41 목록", () => {
  test("S225 전체는 최근 가입 순서이고 실명·이메일이 없다", async ({ page }) => {
    await page.goto("/admin/users");
    await expect(filters(page).getByRole("link", { name: "전체" })).toHaveAttribute("aria-current", "page");
    await expectNicknames(page, ALL_NICKNAMES);
    await expect(rows(page).first()).toContainText("가입");
    /* 한 사람이 테스터도 개발자도 되므로 목록에는 역할을 쓰지 않는다 */
    await expect(page.getByRole("main")).not.toContainText(/테스터|개발자/);
    await expect(page.getByRole("main")).not.toContainText("@example.com");
    await expect(page.getByRole("main")).not.toContainText("*");
  });
});

test.describe("R43 상세", () => {
  test("S235 기본 정보는 실명과 이메일을 가려서 보여 준다", async ({ page }) => {
    await page.goto("/admin/users/user-4");
    const info = region(page, "기본 정보");
    for (const text of ["서준호", "가입", "서*호", "me***@example.com"]) {
      await expect(info).toContainText(text);
    }
    await expect(page.locator("body")).not.toContainText("member04@example.com");
    await expect(info).not.toContainText("역할");
  });
});

test.describe("R44 신고·제재 관리와 연결", () => {
  test("S242 신고를 인정하면 제재 이력이 생긴다", async ({ page }) => {
    await decideReport(page, "report-4", "인정");
    await page.goto("/admin/users/user-10");
    await expect(region(page, "제재 이력")).toContainText("채팅에서 부적절한 표현을 썼어요");
    await expect(region(page, "받은 신고").getByRole("link")).toContainText("인정");
    await page.goto("/admin/users?filter=sanctioned");
    await expectNicknames(page, ["강민서", "서준호"]);
  });
});
