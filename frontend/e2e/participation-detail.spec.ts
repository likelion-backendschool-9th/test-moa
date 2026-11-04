import { expect, test, type Page } from "@playwright/test";
import { setDemo } from "./helpers";

const DETAIL = "/my/participations/p-meeting-notes";
const status = (page: Page) => page.getByRole("region", { name: "진행 상황" });
const field = (page: Page) => page.getByRole("textbox", { name: "내용" });
const submit = (page: Page) => page.getByRole("button", { name: "피드백 제출" });
const FEEDBACK = "회의록을 두 번 써 봤어요. 할 일 목록은 맞게 나왔고 담당자 지정이 빠졌어요.";

test.describe("R192 상세 접근", () => {
  for (const [role, path] of [
    ["tester", "/my/participations/nope"],
    ["developer", DETAIL],
  ]) {
    test(`S473 ${role}가 ${path}에 가면 404 화면이다`, async ({ page, context }) => {
      await setDemo(context, { role });
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: "찾는 페이지가 없어요" })).toBeVisible();
    });
  }
});

test.describe("R193 제출 전 상세와 피드백 작성", () => {
  test("S475 비우거나 짧으면 오류를 보여 주고 입력을 남긴다", async ({ page }) => {
    await page.goto(DETAIL);
    await submit(page).click();
    await expect(page.getByText("피드백을 적어 주세요")).toBeVisible();
    await expect(field(page)).toBeFocused();
    await expect(field(page)).toHaveAttribute("aria-invalid", "true");

    await field(page).fill("짧아요");
    await submit(page).click();
    await expect(page.getByText("20자 이상 적어 주세요")).toBeVisible();
    await expect(field(page)).toHaveValue("짧아요");
  });

  test("S476 제출하면 지급 대기로 바뀌고 목록에도 반영된다", async ({ page }) => {
    await page.goto(DETAIL);
    await field(page).fill(FEEDBACK);
    await expect(page.getByText(`${FEEDBACK.length} / 500자`)).toBeVisible();
    await submit(page).click();

    await expect(page).toHaveURL(/\?notice=submitted$/);
    await expect(page.getByRole("status")).toContainText("피드백을 제출했어요");
    await expect(page.getByText("지급 대기", { exact: true })).toBeVisible();
    await expect(status(page)).toContainText("자동으로 지급돼요");
    await expect(page.getByRole("heading", { name: "제출한 피드백" })).toBeVisible();
    await expect(page.getByText(FEEDBACK)).toBeVisible();
    await expect(field(page)).toHaveCount(0);

    await page.goto("/my/participations");
    await expect(page.getByRole("region", { name: /^다음 할 일/ }).getByRole("heading")).toHaveText("다음 할 일 3");
    await expect(page.getByTestId("participation-row").filter({ hasText: "회의록 정리" })).toContainText("지급 대기");
  });
});
