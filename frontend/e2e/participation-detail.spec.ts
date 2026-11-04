import { expect, test, type Page } from "@playwright/test";
import { setDemo } from "./helpers";

const DETAIL = "/my/participations/p-meeting-notes";
const status = (page: Page) => page.getByRole("region", { name: "진행 상황" });
const field = (page: Page) => page.getByRole("textbox", { name: "내용" });
const submit = (page: Page) => page.getByRole("button", { name: "피드백 제출" });
const FEEDBACK = "회의록을 두 번 써 봤어요. 할 일 목록은 맞게 나왔고 담당자 지정이 빠졌어요.";

test.describe("R11 상세 접근", () => {
  test("S193 비로그인은 상세 주소를 기억해 로그인으로 보낸다", async ({ page, context }) => {
    await setDemo(context, { role: "guest" });
    await page.goto(DETAIL);
    await expect(page).toHaveURL(/\/login\?next=%2Fmy%2Fparticipations%2Fp-meeting-notes$/);
  });

  for (const [role, path] of [
    ["tester", "/my/participations/nope"],
    ["developer", DETAIL],
  ]) {
    test(`S194 ${role}가 ${path}에 가면 404 화면이다`, async ({ page, context }) => {
      await setDemo(context, { role });
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: "찾는 페이지가 없어요" })).toBeVisible();
    });
  }
});

test.describe("R12 제출 전 상세와 피드백 작성", () => {
  test("S195 마감까지 남은 날과 작성 칸, 주 버튼 하나", async ({ page }) => {
    await page.goto(DETAIL);
    await expect(page.getByRole("heading", { level: 1, name: "회의록 정리" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "주요 메뉴" }).getByRole("link", { name: "참여 테스트" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.getByRole("main").getByRole("link", { name: "참여 중인 테스트" })).toHaveAttribute(
      "href",
      "/my/participations?tab=ongoing",
    );
    await expect(status(page)).toContainText("피드백을 제출해 주세요 (D-8)");
    await expect(page.getByText("피드백 제출 전", { exact: true })).toBeVisible();
    await expect(field(page)).toBeVisible();
    await expect(page.getByText("0 / 500자")).toBeVisible();
    await expect(page.getByRole("main").locator(".bg-accent")).toHaveCount(1);
    await expect(submit(page)).toHaveClass(/bg-accent/);
  });

  test("S196 비우거나 짧으면 오류를 보여 주고 입력을 남긴다", async ({ page }) => {
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

  test("S197 제출하면 지급 대기로 바뀌고 목록에도 반영된다", async ({ page }) => {
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
    await expect(page.getByRole("region", { name: /^마감 임박 테스트/ }).getByRole("heading")).toHaveText("마감 임박 테스트 3");
    await expect(page.getByTestId("participation-row").filter({ hasText: "회의록 정리" })).toContainText("지급 대기");
  });
});

test.describe("R13 상태별 상세", () => {
  test("S198 지급 대기는 지급 예정 일시와 제출한 피드백을 보여 준다", async ({ page }) => {
    await page.goto("/my/participations/p-study-match");
    await expect(status(page)).toContainText(/\d+월 \d+일 (오전|오후) \d+시에 자동으로 지급돼요/);
    await expect(page.getByText("지급 예정", { exact: true })).toBeVisible();
    await expect(page.getByText(/시간대를 여러 개 고를 때/)).toBeVisible();
    await expect(field(page)).toHaveCount(0);
  });

  test("S199 지급 완료는 받은 크레딧과 지급일을 보여 준다", async ({ page }) => {
    await page.goto("/my/participations/p-memo-garden");
    await expect(status(page)).toContainText("850 크레딧을 받았어요");
    await expect(page.getByText("지급일", { exact: true })).toBeVisible();
    await expect(page.locator('svg[aria-label="지급 완료"]')).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "참여했던 테스트" })).toHaveAttribute(
      "href",
      "/my/participations?tab=history",
    );
  });

  test("S200 선정 대기는 모집 마감 뒤 결과를 알리고 모집 글로 보낸다", async ({ page }) => {
    await page.goto("/my/participations/p-booklog");
    await expect(status(page)).toContainText("선정 결과를 기다리고 있어요");
    await expect(page.getByRole("main").getByRole("link", { name: "모집 글 보기" })).toHaveAttribute("href", "/recruitments/booklog");
    await expect(page.getByText("구독 모집", { exact: true })).toBeVisible();
    await expect(page.getByText("추가 보상", { exact: true })).toBeVisible();
    await expect(field(page)).toHaveCount(0);
  });

  test("S201 기한 내 미제출은 보상 없이 끝났다고 알린다", async ({ page }) => {
    await page.goto("/my/participations/p-cafe-map");
    await expect(status(page)).toContainText("기한 안에 제출하지 않아 보상 없이 끝났어요");
    await expect(page.getByRole("heading", { name: "제출한 피드백" })).toHaveCount(0);
  });
});

test.describe("R14 상세 반응형과 링크", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("S202 좁은 화면에서 가로 스크롤이 없고 제출 버튼이 전체 폭이며 링크는 모두 열린다", async ({ page, request }) => {
    await page.goto(DETAIL);
    await expect(field(page)).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBe(0);
    const button = await submit(page).boundingBox();
    const box = await field(page).boundingBox();
    expect(button?.width).toBe(box?.width);

    const hrefs = await page
      .getByRole("main")
      .locator('a[href^="/"]')
      .evaluateAll((links) => [...new Set(links.map((link) => link.getAttribute("href") ?? ""))]);
    for (const href of hrefs) {
      const response = await request.get(href);
      expect(response.status(), href).toBe(200);
    }
  });
});

test.describe("R14 상세 반응형 · 제출한 피드백", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("S285 긴 URL이나 공백 없는 문자열을 제출해도 좁은 화면에서 넘치지 않는다", async ({ page }) => {
    const url = `https://example.com/books/trade/requests?${"query=used-books-trade-request&".repeat(6)}end=1`;
    const error = `TypeError:${"CannotReadPropertiesOfUndefined".repeat(4)}`;
    await page.goto(DETAIL);
    await field(page).fill(`거래 요청에서 오류가 났어요. ${url} ${error}`);
    await submit(page).click();
    await expect(page.getByRole("heading", { name: "제출한 피드백" })).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBe(0);
    const card = page.getByRole("heading", { name: "제출한 피드백" }).locator("..");
    const box = await card.boundingBox();
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(375);
    const text = card.locator("p");
    expect(await text.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  });
});
