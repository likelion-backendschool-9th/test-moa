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

  test("#57-S1 고른 이미지를 미리 보고 뺄 수 있다", async ({ page }) => {
    await page.goto(DETAIL);
    await expect(section(page).getByText("PNG, JPG, WEBP · 한 장에 5MB까지 · 5장까지")).toBeVisible();
    await expect(previews(page)).toHaveCount(0);

    await picker(page).setInputFiles([png("오류 화면.png"), png("목록.png")]);
    await expect(previews(page)).toHaveCount(2);
    await expect(section(page).getByText("2 / 5", { exact: true })).toBeVisible();
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
    await fillRequired(page);
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
    await expect(submitted(page, FIRST).getByRole("heading", { name: "첨부 이미지 2" })).toBeVisible();
    await expect(submitted(page, FIRST).getByTestId("feedback-image-names").getByRole("listitem")).toHaveText(["오류 화면.png", "목록.png"]);
    await expect(submitted(page, SECOND).getByTestId("feedback-image-names")).toHaveCount(0);
    await page.reload();
    await expect(page.getByTestId("feedback-image-names").getByRole("listitem")).toHaveCount(2);
  });

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

test.describe("#90-R1 테스트 항목별 피드백", () => {
  const PIXEL = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
  const png = (name: string) => ({ name, mimeType: "image/png", buffer: PIXEL });
  const picker = (page: Page, name: string) => page.getByLabel(`${name} 이미지 추가`);
  const MOAPLAN = "/testers/recruitments/p-moaplan";
  const OTHER = "기타 의견";

  test("#90-S1 테스트 항목마다 이름, 설명, 필수 여부, 칸이 있고 기타 의견 칸이 있다", async ({ page }) => {
    await page.goto(DETAIL);
    await expect(page.getByTestId("feedback-field")).toHaveCount(4);
    await expect(section(page)).toContainText("메모를 붙여 넣고 회의록을 만들어 보세요.");
    await expect(section(page).getByText("필수", { exact: true })).toBeVisible();
    await expect(section(page, SECOND).getByText("필수", { exact: true })).toBeVisible();
    await expect(section(page, OPTIONAL).getByText("선택", { exact: true })).toBeVisible();
    await expect(section(page, OTHER).getByText("선택", { exact: true })).toBeVisible();
    await expect(field(page)).toBeVisible();
    await expect(field(page, OTHER)).toBeVisible();
    await expect(page.getByTestId("feedback-field").last()).toContainText(OTHER);
    await expect(page.getByTestId("feedback-number")).toHaveText(["1", "2", "3"]);
  });

  test("#90-S2 기타 의견은 비워도 제출되고, 적으면 제출한 피드백에 보인다", async ({ page }) => {
    await page.goto(DETAIL);
    await fillRequired(page);
    await submit(page).click();
    await expect(page).toHaveURL(/\?notice=submitted$/);
    await expect(submitted(page, OTHER)).toHaveCount(0);

    await page.goto(MOAPLAN);
    await field(page, "일정 만들기").fill(FEEDBACK);
    await field(page, "팀원 초대하기").fill(FEEDBACK_2);
    await field(page, OTHER).fill("전체적으로 화면이 깔끔해서 쓰기 편했어요.");
    await submit(page).click();
    await expect(page).toHaveURL(/\?notice=submitted$/);
    await expect(submitted(page, OTHER)).toContainText("전체적으로 화면이 깔끔해서 쓰기 편했어요.");
  });

  test("#90-S3 선택 항목은 비우면 제출한 피드백에 없고, 짧게 적어도 제출된다", async ({ page }) => {
    await page.goto(DETAIL);
    await fillRequired(page);
    await submit(page).click();
    await expect(page).toHaveURL(/\?notice=submitted$/);
    await expect(submitted(page, OPTIONAL)).toHaveCount(0);
    await expect(submitted(page, FIRST)).toBeVisible();

    await page.goto("/testers/recruitments/p-used-books");
    await field(page, "책 등록하기").fill("좋아요");
    await field(page, "거래 요청 보내기").fill("됨");
    await submit(page).click();
    await expect(page).toHaveURL(/\?notice=submitted$/);
    await expect(submitted(page, "책 등록하기")).toContainText("좋아요");
    await expect(submitted(page, "거래 요청 보내기")).toContainText("됨");
  });

  test("#90-S4 서버도 최대 글자 수를 확인하고 입력을 남긴다", async ({ page }) => {
    await page.goto(DETAIL);
    await fillRequired(page);
    const long = "가".repeat(501);
    await field(page).evaluate((element: HTMLTextAreaElement) => element.removeAttribute("maxlength"));
    await field(page).fill(long);
    await submit(page).click();
    await expect(section(page).getByTestId("feedback-error")).toHaveText("500자까지 적을 수 있어요");
    await expect(field(page)).toHaveValue(long);
  });

  test("#90-S5 이미지는 칸마다 따로 세고 각자의 피드백 아래에 남는다", async ({ page }) => {
    await page.goto(DETAIL);
    await fillRequired(page);
    await picker(page, FIRST).setInputFiles(["1", "2", "3", "4", "5"].map((index) => png(`${index}.png`)));
    await expect(section(page).getByTestId("feedback-image")).toHaveCount(5);
    await expect(picker(page, FIRST)).toHaveCount(0);

    await expect(section(page, SECOND).getByText("0 / 5", { exact: true })).toBeVisible();
    await picker(page, SECOND).setInputFiles([png("둘째 칸.png")]);
    await expect(section(page, SECOND).getByTestId("feedback-image")).toHaveCount(1);

    await submit(page).click();
    await expect(page).toHaveURL(/\?notice=submitted$/);
    await expect(submitted(page, FIRST).getByTestId("feedback-image-names").getByRole("listitem")).toHaveCount(5);
    await expect(submitted(page, SECOND).getByTestId("feedback-image-names").getByRole("listitem")).toHaveText(["둘째 칸.png"]);
  });

  test("#90-S6 내용을 적지 않은 칸의 이미지는 제출되지 않고 미리 보기가 남는다", async ({ page }) => {
    await page.goto(DETAIL);
    await fillRequired(page);
    await picker(page, OPTIONAL).setInputFiles([png("공유 화면.png")]);
    await expect(section(page, OPTIONAL).getByTestId("feedback-image")).toHaveCount(1);
    await submit(page).click();
    await expect(section(page, OPTIONAL).getByTestId("feedback-error")).toHaveText("내용을 적어야 이미지를 넣을 수 있어요");
    await expect(section(page, OPTIONAL).getByTestId("feedback-image")).toHaveCount(1);
    await expect(page).not.toHaveURL(/notice=submitted/);
  });

  test("#90-S7 모두 선택 항목이어도 아무것도 적지 않으면 제출되지 않는다", async ({ page }) => {
    await page.goto("/testers/recruitments/p-ledger-note");
    await submit(page).click();
    await expect(section(page, "영수증 올리기").getByTestId("feedback-error")).toHaveText("피드백을 적어 주세요");
    await expect(field(page, "영수증 올리기")).toBeFocused();
    await expect(page).not.toHaveURL(/notice=submitted/);
  });

  test("#90-S8 시연용 저장 한도를 넘으면 안내하고 입력을 남긴다", async ({ page }) => {
    await page.goto(DETAIL);
    const long = "가".repeat(500);
    for (const name of [FIRST, SECOND, OPTIONAL, OTHER]) await field(page, name).fill(long);
    await submit(page).click();
    await expect(page.getByRole("alert").filter({ hasText: "시연용 저장 한도를 넘어" })).toBeVisible();
    await expect(field(page)).toHaveValue(long);
    await expect(page).not.toHaveURL(/notice=submitted/);
  });
});
