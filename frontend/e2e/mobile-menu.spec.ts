import { expect, type Page, test } from "@playwright/test";
import { setDemo } from "./helpers";

test.use({ viewport: { width: 375, height: 812 } });

const panel = (page: Page) => page.getByTestId("mobile-menu");
const openMenu = (page: Page) => page.getByRole("button", { name: "메뉴 열기" }).click();

test.describe("R4 모바일 메뉴", () => {
  test.beforeEach(async ({ context }) => {
    await setDemo(context, { role: "tester" });
  });

  test("S10 좁은 화면에서는 탭 대신 메뉴 버튼이 보인다", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("navigation", { name: "주요 메뉴" })).toBeHidden();
    await expect(page.getByRole("button", { name: "메뉴 열기" })).toBeVisible();
  });

  test("S11 메뉴를 열면 전체 높이 패널이 나오고 Esc로 닫힌다", async ({ page }) => {
    await page.goto("/");
    await openMenu(page);
    await expect(panel(page)).toBeVisible();
    const box = await panel(page).boundingBox();
    expect(box?.height).toBe(812);
    await expect(page.getByRole("button", { name: "메뉴 닫기" })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(panel(page)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "메뉴 열기" })).toBeFocused();
  });

  test("S12 메뉴에서 링크를 누르면 이동하고 패널이 닫힌다", async ({ page }) => {
    await page.goto("/");
    await openMenu(page);
    await panel(page).getByRole("link", { name: "참여 테스트" }).click();
    await expect(page).toHaveURL("/my/participations");
    await expect(panel(page)).toHaveCount(0);
  });
});

test.describe("R179 모바일 메뉴의 계정 영역", () => {
  test("S327 로그인 상태는 마이페이지·로그아웃을 패널로 옮기고 크레딧은 헤더에 남긴다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/");
    const banner = page.getByRole("banner");
    await expect(banner.getByRole("link", { name: "마이페이지" })).toBeHidden();
    await expect(banner.getByRole("button", { name: "로그아웃" })).toBeHidden();
    await expect(banner.getByRole("link", { name: "보유 크레딧 12,480" })).toBeVisible();

    await openMenu(page);
    const links = panel(page).getByRole("link");
    await expect(links).toHaveText(["참여 테스트", "내 프로젝트", "채팅", "마이페이지"]);
    await expect(panel(page).getByRole("link", { name: "마이페이지" })).toHaveAttribute("href", "/my");
    await expect(panel(page).getByRole("button", { name: "로그아웃" })).toBeVisible();
    await expect(panel(page).getByRole("searchbox")).toHaveCount(0);
  });

  test("S327 패널이 열려 있어도 로고를 누르면 홈으로 가고 패널이 닫힌다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/my/projects");
    await openMenu(page);
    await page.getByRole("banner").getByRole("link", { name: "Test Moa" }).click();
    await expect(page).toHaveURL("/");
    await expect(panel(page)).toHaveCount(0);

    await openMenu(page);
    await page.getByRole("banner").getByRole("link", { name: "Test Moa" }).click();
    await expect(panel(page)).toHaveCount(0);
  });

  test("S328 패널에서 로그아웃하면 홈으로 가고 패널이 닫힌다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/my/projects");
    await openMenu(page);
    await panel(page).getByRole("button", { name: "로그아웃" }).click();
    await expect(page).toHaveURL("/");
    await expect(panel(page)).toHaveCount(0);
    await expect(page.getByRole("banner").getByRole("link", { name: "로그인" })).toBeVisible();
  });

  test("S329 비로그인 패널에는 탭만 있다", async ({ page, context }) => {
    await setDemo(context, { role: "guest" });
    await page.goto("/");
    await openMenu(page);
    await expect(panel(page).getByRole("link")).toHaveText(["참여 테스트", "내 프로젝트", "채팅"]);
    await expect(panel(page).getByRole("button", { name: "로그아웃" })).toHaveCount(0);
  });
});
