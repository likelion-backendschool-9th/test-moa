import { expect, test } from "@playwright/test";
import { setDemo } from "./helpers";

const BASE_TABS = [
  ["참여 테스트", "/my/participations"],
  ["내 프로젝트", "/my/projects"],
  ["채팅", "/my/chats"],
] as const;

test.describe("R3 카테고리 탭", () => {
  test("S323 일반 사용자는 탭 3개를 보고, 홈은 로고로 간다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/");
    const links = page.getByRole("navigation", { name: "주요 메뉴" }).getByRole("link");
    await expect(links).toHaveCount(3);
    for (const [index, [label, href]] of BASE_TABS.entries()) {
      await expect(links.nth(index)).toHaveText(label);
      await expect(links.nth(index)).toHaveAttribute("href", href);
    }
    for (const name of ["홈", "테스트 모집", "마이페이지", "운영자 페이지"]) {
      await expect(page.getByRole("navigation", { name: "주요 메뉴" }).getByRole("link", { name })).toHaveCount(0);
    }
    await expect(page.getByRole("banner").getByRole("link", { name: "Test Moa" })).toHaveAttribute("href", "/");
  });

  test("S324 운영자는 운영자 페이지 탭을 본다", async ({ page, context }) => {
    await setDemo(context, { role: "admin" });
    await page.goto("/");
    const links = page.getByRole("navigation", { name: "주요 메뉴" }).getByRole("link");
    await expect(links).toHaveCount(4);
    await expect(links.nth(3)).toHaveText("운영자 페이지");
    await expect(links.nth(3)).toHaveAttribute("href", "/admin");
  });

  test("S334 홈에서는 현재 탭이 없고, 탭을 누르면 그 탭이 현재 탭이 된다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "주요 메뉴" });
    await expect(nav.locator('[aria-current="page"]')).toHaveCount(0);
    await nav.getByRole("link", { name: "내 프로젝트" }).click();
    await expect(page).toHaveURL("/my/projects");
    await expect(nav.getByRole("link", { name: "내 프로젝트" })).toHaveAttribute("aria-current", "page");
  });

  test("S325 비로그인이 보호 탭을 누르면 로그인으로 간다", async ({ page, context }) => {
    await setDemo(context, { role: "guest" });
    await page.goto("/");
    await page.getByRole("navigation", { name: "주요 메뉴" }).getByRole("link", { name: "참여 테스트" }).click();
    await expect(page).toHaveURL("/login?next=%2Fmy%2Fparticipations");
  });
});
