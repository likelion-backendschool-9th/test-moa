import { expect, test } from "@playwright/test";
import { setDemo } from "./helpers";

const SCENARIOS = [
  { id: "#146-S1", path: "/my/chats/booklog-yunseul", role: "tester", heading: "북로그", footer: false },
  { id: "#146-S2", path: "/my/chats/nope", role: "tester", heading: "대화방을 찾을 수 없어요", footer: true },
  { id: "#146-S3", path: "/nope", role: "guest", heading: "찾는 페이지가 없어요", footer: true },
  { id: "#146-S4", path: "/admin/reports/nope", role: "admin", heading: "찾는 페이지가 없어요", footer: true },
];

for (const scenario of SCENARIOS) {
  test(`${scenario.id} ${scenario.path}의 본문·푸터·본문 건너뛰기가 유지된다`, async ({ context, page }) => {
    await setDemo(context, { role: scenario.role });
    await page.goto(scenario.path);
    await expect(page.getByRole("heading", { level: 1, name: scenario.heading })).toBeVisible();
    await expect(page.locator("main")).toHaveCount(1);
    const main = page.locator("main#main");
    await expect(main).toHaveCount(1);
    await expect(main).toHaveAttribute("tabindex", "-1");
    if (scenario.footer) {
      await expect(page.getByRole("contentinfo")).toBeVisible();
      await expect(page.locator("main [data-site-footer]")).toHaveCount(0);
    } else {
      await expect(page.locator("[data-site-footer]")).toBeHidden();
    }
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "본문으로 건너뛰기" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(main).toBeFocused();
  });
}
