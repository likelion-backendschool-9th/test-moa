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

test.describe("#57-R1 피드백 이미지", () => {
  /* 1x1 PNG */
  const PIXEL = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
  const png = (name: string) => ({ name, mimeType: "image/png", buffer: PIXEL });
  const picker = (page: Page) => page.getByLabel("이미지 추가");
  const previews = (page: Page) => page.getByTestId("feedback-image");

  test("#57-S1 고른 이미지를 미리 보고 뺄 수 있다", async ({ page }) => {
    await page.goto(DETAIL);
    await expect(page.getByText("PNG, JPG, WEBP · 한 장에 5MB까지 · 5장까지")).toBeVisible();
    await expect(previews(page)).toHaveCount(0);

    await picker(page).setInputFiles([png("오류 화면.png"), png("목록.png")]);
    await expect(previews(page)).toHaveCount(2);
    await expect(page.getByText("2 / 5", { exact: true })).toBeVisible();
    const image = page.getByRole("img", { name: "오류 화면.png" });
    await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBe(1);

    await page.getByRole("button", { name: "오류 화면.png 빼기" }).click();
    await expect(previews(page)).toHaveCount(1);
    await expect(image).toHaveCount(0);
    await expect(picker(page)).toBeFocused();
  });

  test("#57-S2 5장을 넘기면 넣지 않고 이유를 알리며, 5장이 차면 추가 버튼이 사라진다", async ({ page }) => {
    await page.goto(DETAIL);
    await picker(page).setInputFiles(["1", "2", "3", "4"].map((index) => png(`${index}.png`)));
    await expect(previews(page)).toHaveCount(4);

    await picker(page).setInputFiles([png("5.png"), png("6.png")]);
    await expect(page.getByRole("alert").filter({ hasText: "이미지는 5장까지 올릴 수 있어요" })).toBeVisible();
    await expect(previews(page)).toHaveCount(4);

    await picker(page).setInputFiles([png("5.png")]);
    await expect(previews(page)).toHaveCount(5);
    await expect(picker(page)).toHaveCount(0);

    await page.getByRole("button", { name: "5.png 빼기" }).click();
    await expect(picker(page)).toBeFocused();
  });

  test("#57-S3 형식과 용량이 맞지 않으면 넣지 않고 이유를 알린다", async ({ page }) => {
    await page.goto(DETAIL);
    await picker(page).setInputFiles([{ name: "메모.gif", mimeType: "image/gif", buffer: PIXEL }]);
    await expect(page.getByRole("alert").filter({ hasText: "PNG, JPG, WEBP 이미지만 올릴 수 있어요" })).toBeVisible();

    await picker(page).setInputFiles([{ name: "큰 화면.png", mimeType: "image/png", buffer: Buffer.alloc(5 * 1024 * 1024 + 1) }]);
    await expect(page.getByRole("alert").filter({ hasText: "이미지는 한 장에 5MB까지 올릴 수 있어요" })).toBeVisible();
    await expect(previews(page)).toHaveCount(0);

    await picker(page).setInputFiles([png("괜찮은 화면.png")]);
    await expect(page.getByRole("alert").filter({ hasText: "이미지" })).toHaveCount(0);
    await expect(previews(page)).toHaveCount(1);
  });

  test("#57-S4 제출해도 파일은 보내지 않고, 제출한 피드백에 이미지 이름이 남는다", async ({ page }) => {
    await page.goto(DETAIL);
    await field(page).fill(FEEDBACK);
    await picker(page).setInputFiles([png("오류 화면.png"), png("목록.png")]);
    await expect(previews(page)).toHaveCount(2);
    const [request] = await Promise.all([
      page.waitForRequest((req) => req.method() === "POST" && req.url().includes("p-meeting-notes")),
      submit(page).click(),
    ]);
    const body = request.postDataBuffer()?.toString("latin1") ?? "";
    expect(body).not.toContain("PNG");
    expect(body).not.toContain("filename=");

    await expect(page).toHaveURL(/\?notice=submitted$/);
    await expect(page.getByRole("heading", { name: "첨부 이미지 2" })).toBeVisible();
    await expect(page.getByTestId("feedback-image-names").getByRole("listitem")).toHaveText(["오류 화면.png", "목록.png"]);
    await page.reload();
    await expect(page.getByTestId("feedback-image-names").getByRole("listitem")).toHaveCount(2);
  });

  test("#57-S5 서버도 같은 규칙으로 다시 확인하고 입력을 남긴다", async ({ page }) => {
    await page.goto(DETAIL);
    await field(page).fill(FEEDBACK);
    await picker(page).setInputFiles([png("화면.png")]);
    await expect(previews(page)).toHaveCount(1);
    await page.locator('input[name="imagesMeta"]').evaluate((element: HTMLInputElement) => {
      element.value = JSON.stringify(Array.from({ length: 6 }, (_, index) => ({ name: `${index}.png`, size: 1, type: "image/png" })));
    });
    await submit(page).click();
    await expect(page.locator("#feedback-error")).toHaveText("이미지는 5장까지 올릴 수 있어요");
    await expect(field(page)).toHaveValue(FEEDBACK);
    await expect(previews(page)).toHaveCount(1);
  });
});
