import { expect, test } from "@playwright/test";

const token = (name: string) => `getComputedStyle(document.documentElement).getPropertyValue("${name}").trim()`;

test.describe("R1 테마와 글꼴", () => {
  test("S56 라이트는 교정쇄 바탕에 에메랄드 강조다", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(239, 239, 236)");
    expect(await page.evaluate(token("--accent"))).toBe("#0f7c4a");
  });

  test("S57 다크는 uibowl 바탕에 에메랄드 강조다", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(0, 0, 0)");
    expect(await page.evaluate(token("--accent"))).toBe("#129357");
  });

  test("S58 본문 글꼴은 Wanted Sans다", async ({ page }) => {
    await page.goto("/");
    const fontFamily = await page.locator("body").evaluate((body) => getComputedStyle(body).fontFamily);
    expect(fontFamily).toMatch(/^"?wanted/i);
  });
});

test.describe("R1 테마와 글꼴 · 공유 이미지", () => {
  test("S80 공유 이미지 메타 태그가 있고 이미지가 열린다", async ({ page, request }) => {
    await page.goto("/");
    const content = await page.locator('meta[property="og:image"]').getAttribute("content");
    expect(content).toBeTruthy();
    const url = new URL(content!);
    const response = await request.get(url.pathname + url.search);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/png");
  });
});
