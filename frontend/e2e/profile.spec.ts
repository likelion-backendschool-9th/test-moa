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

test.describe("#84 회원 탈퇴", () => {
  test.beforeEach(async ({ context }) => {
    await setDemo(context, { role: "tester" });
  });

  const leaveDialog = (page: Page) => page.getByRole("dialog", { name: "회원 탈퇴할까요?" });

  test("#84-S1 마이페이지 홈 맨 아래 계정 카드에 로그인 방법과 로그아웃·회원 탈퇴가 있다", async ({ page }) => {
    await page.goto("/my");
    const card = region(page, "계정");
    await expect(card).toContainText("이메일seoyun@example.com");
    await expect(card).toContainText("로그인 방법이메일·비밀번호");
    await expect(card.getByRole("button")).toHaveText(["로그아웃", "회원 탈퇴"]);
    await expect(card.getByRole("link")).toHaveCount(0);
  });

  test("#84-S2 개인정보 수정 맨 아래 회원 탈퇴 줄에 버튼이 있다", async ({ page }) => {
    await page.goto(PATH);
    const headings = page.getByRole("main").getByRole("heading", { level: 2 });
    await expect(headings).toHaveText(["기본 정보", "비밀번호 변경", "회원 탈퇴"]);
    await expect(region(page, "회원 탈퇴").getByRole("button", { name: "회원 탈퇴" })).toBeVisible();
  });

  test("#84-S3 회원 탈퇴를 누르면 주소는 그대로이고 확인 창에 안내가 보이며 취소·Esc로 닫힌다", async ({ page }) => {
    await page.goto(PATH);
    await region(page, "회원 탈퇴").getByRole("button", { name: "회원 탈퇴" }).click();
    const dialog = leaveDialog(page);
    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL(PATH);
    for (const text of ["30일 안에", "개인정보", "남은 크레딧 12,480"]) await expect(dialog).toContainText(text);

    await dialog.getByRole("button", { name: "취소" }).click();
    await expect(dialog).toBeHidden();
    await region(page, "회원 탈퇴").getByRole("button", { name: "회원 탈퇴" }).click();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("#84-S4 비밀번호가 비거나 틀리면 창 안에 알리고 탈퇴하지 않는다", async ({ page }) => {
    await page.goto("/my");
    await region(page, "계정").getByRole("button", { name: "회원 탈퇴" }).click();
    const dialog = leaveDialog(page);
    await dialog.getByRole("button", { name: "탈퇴하기" }).click();
    await expect(dialog.getByText("비밀번호를 입력해 주세요")).toBeVisible();
    await dialog.getByLabel("비밀번호").fill("wrong-password");
    await dialog.getByRole("button", { name: "탈퇴하기" }).click();
    await expect(dialog.getByText("비밀번호가 맞지 않아요")).toBeVisible();
    await expect(dialog.getByLabel("비밀번호")).toBeFocused();
    await expect(page).toHaveURL("/my");
  });

  test("#84-S5 출금 처리 중인 크레딧이 있으면 탈퇴할 수 없다", async ({ page }) => {
    await page.goto("/my/credits/withdrawals");
    await page.getByLabel("금액(크레딧)").fill("5000");
    await page.getByLabel("은행").selectOption("토스뱅크");
    await page.getByLabel("계좌번호").fill("100012345678");
    await page.getByLabel("예금주").fill("한서윤");
    await page.getByRole("button", { name: "출금 신청" }).click();
    await expect(page.getByText("출금을 신청했어요")).toBeVisible();

    await page.goto(PATH);
    await region(page, "회원 탈퇴").getByRole("button", { name: "회원 탈퇴" }).click();
    const dialog = leaveDialog(page);
    await expect(dialog.getByText("출금 처리 중인 크레딧이 있어 지금은 탈퇴할 수 없어요")).toBeVisible();
    await expect(dialog.getByLabel("비밀번호")).toHaveCount(0);
    await expect(dialog.getByRole("button", { name: "탈퇴하기" })).toHaveCount(0);
  });

  test("#84-S6 맞는 비밀번호로 탈퇴하면 로그아웃되고 로그인 화면에 안내가 보인다", async ({ page }) => {
    await page.goto(PATH);
    await region(page, "회원 탈퇴").getByRole("button", { name: "회원 탈퇴" }).click();
    const dialog = leaveDialog(page);
    await dialog.getByLabel("비밀번호").fill("test1234");
    await dialog.getByRole("button", { name: "탈퇴하기" }).click();
    await expect(page).toHaveURL("/login?left=1");
    await expect(page.getByText("탈퇴했어요. 30일 안에 다시 로그인하면 되돌릴 수 있어요")).toBeVisible();
    await page.goto("/my");
    await expect(page).toHaveURL(/\/login\?next=%2Fmy/);
  });
});
