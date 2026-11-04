import { expect, test } from "@playwright/test";
import { setDemo } from "./helpers";

const ROLES = ["guest", "tester", "developer", "admin"] as const;
const WIDTHS = [768, 1024, 1280, 1366, 1440];

test.describe("R180 깨지지 않는 배치", () => {
  for (const role of ROLES) {
    test(`S330 ${role}: 헤더 글자가 줄바꿈되지 않고 가로로 넘치지 않는다`, async ({ page, context }) => {
      await setDemo(context, { role });
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 800 });
        await page.goto("/");
        await expect(page.getByRole("banner").getByRole("link", { name: "Test Moa" })).toBeVisible();
        const result = await page.getByRole("banner").evaluate((header) => {
          const row = header.firstElementChild!;
          const wrapped = [...header.querySelectorAll("a, button")]
            .filter((element) => (element as HTMLElement).offsetParent !== null && element.getBoundingClientRect().height > 44)
            .map((element) => element.textContent?.trim());
          return { wrapped, overflow: row.scrollWidth > row.clientWidth };
        });
        expect(result.wrapped, `${width}px`).toEqual([]);
        expect(result.overflow, `${width}px`).toBe(false);
      }
    });
  }

  test("S331 1024px부터 로고·탭·계정 영역이 한 줄, 그보다 좁으면 탭이 아래 줄", async ({ page, context }) => {
    await setDemo(context, { role: "admin" });
    const centerY = async (name: "logo" | "nav") => {
      const locator =
        name === "logo"
          ? page.getByRole("banner").getByRole("link", { name: "Test Moa" })
          : page.getByRole("navigation", { name: "주요 메뉴" });
      const box = (await locator.boundingBox())!;
      return box.y + box.height / 2;
    };
    for (const [width, oneRow] of [
      [1024, true],
      [1440, true],
      [900, false],
    ] as const) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/");
      const gap = Math.abs((await centerY("nav")) - (await centerY("logo")));
      if (oneRow) expect(gap, `${width}px`).toBeLessThanOrEqual(4);
      else expect(gap, `${width}px`).toBeGreaterThan(4);
    }
  });
});
