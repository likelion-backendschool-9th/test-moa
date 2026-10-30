import { expect, test } from "@playwright/test";
import { setDemo } from "./helpers";

const BASE_TABS = [
  ["홈", "/"],
  ["테스트 모집", "/recruitments"],
  ["참여 테스트", "/my/participations"],
  ["내 프로젝트", "/my/projects"],
  ["채팅", "/my/chats"],
  ["마이페이지", "/my"],
] as const;

test.describe("R3 카테고리 탭", () => {
  test("S6 일반 사용자는 탭 6개를 보고 홈이 현재 탭이다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/");
    const links = page.getByRole("navigation", { name: "주요 메뉴" }).getByRole("link");
    await expect(links).toHaveCount(6);
    for (const [index, [label, href]] of BASE_TABS.entries()) {
      await expect(links.nth(index)).toHaveText(label);
      await expect(links.nth(index)).toHaveAttribute("href", href);
    }
    await expect(page.getByRole("link", { name: "운영자 페이지" })).toHaveCount(0);
    await expect(links.nth(0)).toHaveAttribute("aria-current", "page");
  });

  test("S7 운영자는 운영자 페이지 탭을 본다", async ({ page, context }) => {
    await setDemo(context, { role: "admin" });
    await page.goto("/");
    const links = page.getByRole("navigation", { name: "주요 메뉴" }).getByRole("link");
    await expect(links).toHaveCount(7);
    await expect(links.nth(6)).toHaveText("운영자 페이지");
    await expect(links.nth(6)).toHaveAttribute("href", "/admin");
  });

  test("S8 탭을 누르면 이동하고 그 탭이 현재 탭이 된다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "주요 메뉴" });
    await nav.getByRole("link", { name: "테스트 모집" }).click();
    await expect(page).toHaveURL("/recruitments");
    await expect(nav.getByRole("link", { name: "테스트 모집" })).toHaveAttribute("aria-current", "page");
  });

  test("S9 비로그인이 보호 탭을 누르면 로그인으로 간다", async ({ page, context }) => {
    await setDemo(context, { role: "guest" });
    await page.goto("/");
    await page.getByRole("navigation", { name: "주요 메뉴" }).getByRole("link", { name: "참여 테스트" }).click();
    await expect(page).toHaveURL("/login?next=%2Fmy%2Fparticipations");
  });
});
