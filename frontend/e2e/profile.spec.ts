import { expect, type Page, test } from "@playwright/test";
import { setDemo } from "./helpers";

const PATH = "/my/profile/edit";

const region = (page: Page, name: string) => page.getByRole("region", { name, exact: true });
const profileCard = (page: Page) => region(page, "기본 정보");
const passwordCard = (page: Page) => region(page, "비밀번호 변경");

async function fillPassword(page: Page, { current, next, confirm }: { current: string; next: string; confirm: string }) {
  const card = passwordCard(page);
  await card.getByLabel("현재 비밀번호").fill(current);
  await card.getByLabel("새 비밀번호", { exact: true }).fill(next);
  await card.getByLabel("새 비밀번호 확인").fill(confirm);
  await card.getByRole("button", { name: "비밀번호 변경" }).click();
}

test.describe("R144 기본 정보 저장", () => {
  test.beforeEach(async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto(PATH);
  });

  const save = (page: Page) => profileCard(page).getByRole("button", { name: "저장" }).click();

  test("S167 저장하면 메시지가 보이고 입력이 남는다", async ({ page }) => {
    await profileCard(page).getByLabel("닉네임").fill("서윤테스트");
    await save(page);
    await expect(profileCard(page).getByRole("status")).toHaveText("개인정보를 저장했어요");
    await expect(profileCard(page).getByLabel("닉네임")).toHaveValue("서윤테스트");
  });

  test("S170 사용 중인 닉네임", async ({ page }) => {
    await profileCard(page).getByLabel("닉네임").fill("도현랩");
    await save(page);
    await expect(profileCard(page).getByText("이미 쓰고 있는 닉네임이에요")).toBeVisible();
  });
});

test.describe("R145 비밀번호 변경", () => {
  test.beforeEach(async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto(PATH);
  });

  test("S172 바꾸면 메시지가 보이고 칸이 비워진다", async ({ page }) => {
    await fillPassword(page, { current: "test1234", next: "moa2026pw", confirm: "moa2026pw" });
    const card = passwordCard(page);
    await expect(card.getByRole("status")).toHaveText("비밀번호를 바꿨어요");
    await expect(card.getByLabel("현재 비밀번호")).toHaveValue("");
    await expect(card.getByLabel("새 비밀번호", { exact: true })).toHaveValue("");
    await expect(card.getByLabel("새 비밀번호 확인")).toHaveValue("");
  });

  test("S173 현재 비밀번호 틀림", async ({ page }) => {
    await fillPassword(page, { current: "wrong123", next: "moa2026pw", confirm: "moa2026pw" });
    const current = passwordCard(page).getByLabel("현재 비밀번호");
    await expect(current).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#password-current-error")).toContainText("현재 비밀번호가 맞지 않아요");
    await expect(current).toHaveValue("wrong123");
  });
});
