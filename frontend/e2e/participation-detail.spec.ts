import { expect, test, type Page } from "@playwright/test";
import { setDemo } from "./helpers";

const DETAIL = "/testers/recruitments/p-meeting-notes";
const status = (page: Page) => page.getByRole("region", { name: "진행 상황" });
/* 회의록 정리의 테스트 항목. 첫 두 칸이 필수다 */
const FIRST = "회의 메모로 회의록 만들기";
const SECOND = "할 일 목록 확인하기";
const OPTIONAL = "회의록 공유하기";
const field = (page: Page, name = FIRST) => page.getByRole("textbox", { name, exact: true });
const section = (page: Page, name = FIRST) => page.getByRole("region", { name: `${name} 피드백` });
const submitted = (page: Page, name: string) => page.getByRole("region", { name, exact: true });
const submit = (page: Page) => page.getByRole("button", { name: "피드백 제출" });
const FEEDBACK = "회의록을 두 번 써 봤어요. 할 일 목록은 맞게 나왔고 담당자 지정이 빠졌어요.";
const FEEDBACK_2 = "할 일은 모두 맞았지만 담당자 이름이 비어 있는 줄이 있었어요.";

/** 필수 칸을 모두 채운다 */
async function fillRequired(page: Page) {
  await field(page).fill(FEEDBACK);
  await field(page, SECOND).fill(FEEDBACK_2);
}

test.describe("R192 상세 접근", () => {
  for (const [role, path] of [
    ["tester", "/testers/recruitments/nope"],
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
  test("S475 필수 항목을 비우면 칸마다 오류를 보여 주고 입력을 남긴다", async ({ page }) => {
    await page.goto(DETAIL);
    await submit(page).click();
    await expect(section(page)).toContainText("피드백을 적어 주세요");
    await expect(section(page, SECOND)).toContainText("피드백을 적어 주세요");
    await expect(section(page, OPTIONAL).getByTestId("feedback-error")).toHaveCount(0);
    await expect(field(page)).toBeFocused();
    await expect(field(page)).toHaveAttribute("aria-invalid", "true");

    await field(page).fill("   ");
    await field(page, SECOND).fill(FEEDBACK_2);
    await submit(page).click();
    await expect(section(page).getByTestId("feedback-error")).toHaveText("피드백을 적어 주세요");
    await expect(field(page, SECOND)).toHaveValue(FEEDBACK_2);
    await expect(page).not.toHaveURL(/notice=submitted/);
  });

  test("S476 제출하면 지급 대기로 바뀌고 항목별로 보이며 목록에도 반영된다", async ({ page }) => {
    await page.goto(DETAIL);
    await fillRequired(page);
    await expect(section(page).getByText(`${FEEDBACK.length} / 500자`)).toBeVisible();
    await submit(page).click();

    await expect(page).toHaveURL(/\?notice=submitted$/);
    await expect(page.getByRole("status")).toContainText("피드백을 제출했어요");
    await expect(page.getByText("지급 대기", { exact: true })).toBeVisible();
    await expect(status(page)).toContainText("자동으로 지급돼요");
    await expect(page.getByRole("heading", { name: "제출한 피드백" })).toBeVisible();
    await expect(submitted(page, FIRST)).toContainText(FEEDBACK);
    await expect(submitted(page, SECOND)).toContainText(FEEDBACK_2);
    await expect(page.getByTestId("feedback-field")).toHaveCount(0);

    await page.goto("/testers/recruitments");
    await expect(page.getByRole("region", { name: /^마감 임박 테스트/ }).getByRole("heading")).toHaveText("마감 임박 테스트 3");
    await expect(page.getByTestId("participation-row").filter({ hasText: "회의록 정리" })).toContainText("지급 대기");
  });
});

test.describe("#57-R1 피드백 이미지", () => {
  /* 1x1 PNG */
  const PIXEL = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
  const png = (name: string) => ({ name, mimeType: "image/png", buffer: PIXEL });
  const picker = (page: Page, name = FIRST) => page.getByLabel(`${name} 이미지 추가`);
  const previews = (page: Page) => page.getByTestId("feedback-image");

  test("#57-S5 서버도 같은 규칙으로 다시 확인하고 입력을 남긴다", async ({ page }) => {
    await page.goto(DETAIL);
    await fillRequired(page);
    await picker(page).setInputFiles([png("화면.png")]);
    await expect(previews(page)).toHaveCount(1);
    await section(page).locator('input[type="hidden"]').evaluate((element: HTMLInputElement) => {
      element.value = JSON.stringify(Array.from({ length: 6 }, (_, index) => ({ name: `${index}.png`, size: 1, type: "image/png" })));
    });
    await submit(page).click();
    await expect(section(page).getByTestId("feedback-error")).toHaveText("이미지는 5장까지 올릴 수 있어요");
    await expect(field(page)).toHaveValue(FEEDBACK);
    await expect(previews(page)).toHaveCount(1);
  });
});

test.describe("#286-R2 지원 취소", () => {
  const cancelRegion = (page: Page) => page.getByRole("region", { name: "지원 취소" });
  const dialog = (page: Page) => page.getByRole("dialog", { name: "지원을 취소할까요?" });

  test("#286-S9 선정 대기인 지원을 확인 대화상자를 거쳐 취소하면 참여했던 테스트로 옮겨진다", async ({ page }) => {
    await page.goto("/testers/recruitments/p-booklog");
    await cancelRegion(page).getByRole("button", { name: "지원 취소" }).click();
    await expect(dialog(page)).toContainText("선정 대상에서 빠져요");
    await dialog(page).getByRole("button", { name: "닫기" }).click();
    await expect(dialog(page)).toBeHidden();

    await cancelRegion(page).getByRole("button", { name: "지원 취소" }).click();
    await dialog(page).getByRole("button", { name: "지원 취소하기" }).click();
    await expect(page).toHaveURL(/\?notice=cancelled$/);
    await expect(page.getByRole("status")).toHaveText("지원을 취소했어요. 시연용이라 이 브라우저에만 남아요.");
    await expect(page.getByRole("heading", { level: 1 }).locator("..").getByText("참여 취소")).toBeVisible();
    await expect(status(page)).toContainText("참여가 취소됐어요");
    await expect(cancelRegion(page)).toHaveCount(0);

    await page.goto("/testers/recruitments?tab=history");
    await expect(page.getByRole("link", { name: /북로그/ })).toBeVisible();
    await page.goto("/testers/recruitments?tab=applied");
    await expect(page.getByRole("link", { name: /북로그/ })).toHaveCount(0);
  });

  test("#286-S10 확정된 참가를 취소하면 접속 링크와 피드백 칸이 사라진다", async ({ page }) => {
    await page.goto("/testers/recruitments/p-moaplan");
    await expect(page.getByRole("link", { name: /테스트 열기/ })).toBeVisible();
    await cancelRegion(page).getByRole("button", { name: "지원 취소" }).click();
    await expect(dialog(page)).toContainText("접속 링크와 보상이 사라져요");
    await dialog(page).getByRole("button", { name: "지원 취소하기" }).click();

    await expect(page).toHaveURL(/\?notice=cancelled$/);
    await expect(page.getByRole("link", { name: /테스트 열기/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "피드백 제출" })).toHaveCount(0);
  });

  test("#286-S11 피드백을 냈거나 끝난 참가에는 지원 취소가 없다", async ({ page }) => {
    for (const key of ["p-study-match", "p-memo-garden", "p-recipefit"]) {
      await page.goto(`/testers/recruitments/${key}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(cancelRegion(page)).toHaveCount(0);
    }
  });
});
