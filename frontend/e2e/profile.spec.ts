import { expect, type Page, test } from "@playwright/test";
import { expectLoginRedirect, setDemo } from "./helpers";

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

test.describe("R142 접근 제어", () => {
  test("S163 비로그인은 로그인으로 보낸다", async ({ page, context }) => {
    await setDemo(context, { role: "guest" });
    await expectLoginRedirect(page, PATH);
  });

  test("S164 로그인하면 열리고 메뉴의 현재 페이지다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto(PATH);
    await expect(page.getByRole("heading", { level: 1, name: "개인정보 수정" })).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "마이페이지 메뉴" }).getByRole("link", { name: "개인정보 수정" }),
    ).toHaveAttribute("aria-current", "page");
  });
});

test.describe("R143 기본 정보 보기", () => {
  test("S165 테스터의 현재 값과 고칠 수 없는 이메일", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto(PATH);
    const card = profileCard(page);
    await expect(card.getByLabel("이름")).toHaveValue("한서윤");
    await expect(card.getByLabel("닉네임")).toHaveValue("윤슬");
    const email = card.getByLabel("이메일");
    await expect(email).toHaveValue("seoyun@example.com");
    await expect(email).toHaveAttribute("readonly", "");
    await expect(card.getByText("이메일은 바꿀 수 없어요")).toBeVisible();
  });

  test("S166 개발자의 현재 값", async ({ page, context }) => {
    await setDemo(context, { role: "developer" });
    await page.goto(PATH);
    await expect(profileCard(page).getByLabel("이름")).toHaveValue("박도현");
    await expect(profileCard(page).getByLabel("닉네임")).toHaveValue("도현랩");
  });
});

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

  test("S168 빈 칸", async ({ page }) => {
    const card = profileCard(page);
    await card.getByLabel("이름").fill("");
    await card.getByLabel("닉네임").fill("");
    await save(page);
    await expect(card.getByText("이름을 입력해 주세요")).toBeVisible();
    await expect(card.getByText("닉네임을 입력해 주세요")).toBeVisible();
    await expect(card.getByLabel("이름")).toHaveAttribute("aria-invalid", "true");
    await expect(card.getByLabel("닉네임")).toHaveAttribute("aria-invalid", "true");
  });

  test("S169 형식", async ({ page }) => {
    const card = profileCard(page);
    await card.getByLabel("이름").fill("가".repeat(21));
    await card.getByLabel("닉네임").fill("a".repeat(40));
    await save(page);
    await expect(card.getByText("이름은 20자까지 쓸 수 있어요")).toBeVisible();
    await expect(card.getByText("닉네임은 한글·영문·숫자 1~39자예요")).toBeVisible();

    await card.getByLabel("이름").fill("한서윤");
    await card.getByLabel("닉네임").fill("윤슬!!");
    await save(page);
    await expect(card.getByText("닉네임은 한글·영문·숫자 1~39자예요")).toBeVisible();
    await expect(card.getByLabel("닉네임")).toHaveValue("윤슬!!");
  });

  test("S314 닉네임은 1자와 39자까지 쓸 수 있다", async ({ page }) => {
    const card = profileCard(page);
    for (const nickname of ["a", "a".repeat(39)]) {
      await card.getByLabel("닉네임").fill(nickname);
      await save(page);
      await expect(card.getByRole("status")).toHaveText("개인정보를 저장했어요");
      await expect(card.getByLabel("닉네임")).not.toHaveAttribute("aria-invalid", "true");
    }
  });

  test("S170 사용 중인 닉네임", async ({ page }) => {
    await profileCard(page).getByLabel("닉네임").fill("도현랩");
    await save(page);
    await expect(profileCard(page).getByText("이미 쓰고 있는 닉네임이에요")).toBeVisible();
  });

  test("S171 바뀐 내용 없음", async ({ page }) => {
    await save(page);
    await expect(profileCard(page).getByRole("alert")).toHaveText("바뀐 내용이 없어요");
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

  test("S183 바꾼 뒤 다시 제출해 실패해도 입력이 남는다", async ({ page }) => {
    await fillPassword(page, { current: "test1234", next: "moa2026pw", confirm: "moa2026pw" });
    const card = passwordCard(page);
    await expect(card.getByRole("status")).toHaveText("비밀번호를 바꿨어요");
    await fillPassword(page, { current: "test1234", next: "moa2026pw", confirm: "moa2026px" });
    await expect(page.locator("#password-confirm-error")).toContainText("새 비밀번호가 서로 달라요");
    await expect(card.getByLabel("현재 비밀번호")).toHaveValue("test1234");
    await expect(card.getByLabel("새 비밀번호", { exact: true })).toHaveValue("moa2026pw");
    await expect(card.getByLabel("새 비밀번호 확인")).toHaveValue("moa2026px");
  });

  test("S173 현재 비밀번호 틀림", async ({ page }) => {
    await fillPassword(page, { current: "wrong123", next: "moa2026pw", confirm: "moa2026pw" });
    const current = passwordCard(page).getByLabel("현재 비밀번호");
    await expect(current).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#password-current-error")).toContainText("현재 비밀번호가 맞지 않아요");
    await expect(current).toHaveValue("wrong123");
  });

  test("S174 새 비밀번호 규칙", async ({ page }) => {
    await fillPassword(page, { current: "test1234", next: "abc", confirm: "abc" });
    await expect(page.locator("#password-next-error")).toContainText("영문과 숫자를 섞어 8자 이상 써 주세요");
    await fillPassword(page, { current: "test1234", next: "test1234", confirm: "test1234" });
    await expect(page.locator("#password-next-error")).toContainText("지금 쓰는 비밀번호와 달라야 해요");
  });

  test("S175 확인 불일치", async ({ page }) => {
    await fillPassword(page, { current: "test1234", next: "moa2026pw", confirm: "moa2026px" });
    await expect(page.locator("#password-confirm-error")).toContainText("새 비밀번호가 서로 달라요");
  });

  test("S176 빈 칸", async ({ page }) => {
    await fillPassword(page, { current: "", next: "", confirm: "" });
    const card = passwordCard(page);
    await expect(card.getByText("현재 비밀번호를 입력해 주세요")).toBeVisible();
    await expect(card.getByText("새 비밀번호를 입력해 주세요")).toBeVisible();
    await expect(card.getByText("새 비밀번호를 한 번 더 입력해 주세요")).toBeVisible();
  });

  test("S177 입력 속성", async ({ page }) => {
    const card = passwordCard(page);
    const fields = [
      [card.getByLabel("현재 비밀번호"), "current-password"],
      [card.getByLabel("새 비밀번호", { exact: true }), "new-password"],
      [card.getByLabel("새 비밀번호 확인"), "new-password"],
    ] as const;
    for (const [field, autocomplete] of fields) {
      await expect(field).toHaveAttribute("type", "password");
      await expect(field).toHaveAttribute("autocomplete", autocomplete);
    }
  });
});

test.describe("R146 로딩과 화면", () => {
  test("S178 제목은 바로, 폼은 스켈레톤 먼저", async ({ page, context }) => {
    await setDemo(context, { role: "tester", data: "slow" });
    await page.goto(PATH, { waitUntil: "commit" });
    await expect(page.getByRole("heading", { level: 1, name: "개인정보 수정" })).toBeVisible();
    const skeleton = page.getByLabel("개인정보 불러오는 중");
    await expect(skeleton).toBeVisible();
    await expect(skeleton).toHaveAttribute("aria-busy", "true");
    await expect(profileCard(page)).toBeVisible();
    await expect(skeleton).toHaveCount(0);
  });

  test("S179 좁은 화면에서는 칸과 버튼이 카드 너비를 채운다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(PATH);
    for (const [card, button] of [
      [profileCard(page), "저장"],
      [passwordCard(page), "비밀번호 변경"],
    ] as const) {
      const width = (await card.locator("form").boundingBox())!.width;
      for (const input of await card.locator('input:not([type="hidden"])').all()) {
        expect(Math.abs((await input.boundingBox())!.width - width)).toBeLessThan(1);
      }
      expect(Math.abs((await card.getByRole("button", { name: button }).boundingBox())!.width - width)).toBeLessThan(1);
    }
  });

  test("S182 넓은 화면에서는 설명이 왼쪽, 칸이 오른쪽 한 열이다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto(PATH);
    for (const [card, title, fields] of [
      [profileCard(page), "기본 정보", ["이름", "닉네임", "이메일"]],
      [passwordCard(page), "비밀번호 변경", ["현재 비밀번호", "새 비밀번호", "새 비밀번호 확인"]],
    ] as const) {
      const heading = (await card.getByRole("heading", { name: title }).boundingBox())!;
      const boxes = await Promise.all(fields.map(async (label) => (await card.getByLabel(label, { exact: true }).boundingBox())!));
      for (const box of boxes) {
        expect(box.x).toBeGreaterThan(heading.x + heading.width);
        expect(Math.abs(box.x - boxes[0].x)).toBeLessThan(1);
        expect(Math.abs(box.width - boxes[0].width)).toBeLessThan(1);
      }
      expect(boxes[1].y).toBeGreaterThan(boxes[0].y);
      expect(boxes[2].y).toBeGreaterThan(boxes[1].y);
    }
  });

  test("S184 주 버튼은 저장 하나다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto(PATH);
    const background = (name: string) =>
      page.getByRole("button", { name, exact: true }).evaluate((element) => getComputedStyle(element).backgroundColor);
    expect(await background("저장")).not.toBe(await background("비밀번호 변경"));
    await expect(page.getByRole("button", { name: "비밀번호 변경" })).not.toHaveClass(/bg-accent/);
    await expect(page.getByRole("button", { name: "저장" })).toHaveClass(/bg-accent/);
  });
});
