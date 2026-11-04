import { expect, type BrowserContext, type Locator, type Page } from "@playwright/test";

type DemoCookies = {
  role?: "guest" | "tester" | "developer" | "admin" | string;
  data?: "normal" | "single" | "empty" | "slow";
};

/** 시연용 쿠키(demo-role, demo-data)를 넣는다 */
export async function setDemo(context: BrowserContext, { role, data }: DemoCookies) {
  const cookies = [];
  if (role) cookies.push({ name: "demo-role", value: role, url: "http://localhost:3100" });
  if (data) cookies.push({ name: "demo-data", value: data, url: "http://localhost:3100" });
  await context.addCookies(cookies);
}

/** 헤더 로고 링크. 홈으로 가는 길은 로고뿐이다(탭에는 "홈"이 없다) */
export function homeLogo(page: Page): Locator {
  return page.getByRole("banner").getByRole("link", { name: "Test Moa" });
}

/**
 * 더보기 같은 메뉴 버튼을 눌러 메뉴를 연다. 페이지가 준비되기 전에 누르면 아무 일도 일어나지 않아서,
 * 닫혀 있을 때만 한 번 누르고 열릴 때까지 기다린다. 재시도로 다시 눌러 닫지 않도록, 클릭은
 * aria-expanded가 true가 아닐 때만 하고 열림 확인은 길게 잡는다.
 */
export async function openMoreMenu(button: Locator) {
  await expect(async () => {
    if ((await button.getAttribute("aria-expanded")) === "true") return;
    await button.click({ timeout: 2000 });
    await expect(button).toHaveAttribute("aria-expanded", "true", { timeout: 5000 });
  }).toPass({ timeout: 15000 });
}

/** 페이지가 가로로 넘치지 않는지 확인한다. 여러 페이지를 돌 때는 label로 어느 곳인지 알린다 */
export async function expectNoHorizontalOverflow(page: Page, label?: string) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, label).toBeLessThanOrEqual(0);
}

/** 비로그인으로 path에 가면 돌아올 주소(next)를 붙여 로그인으로 보낸다. 비로그인 쿠키는 호출하는 쪽에서 넣는다 */
export async function expectLoginRedirect(page: Page, path: string) {
  await page.goto(path);
  await expect(page).toHaveURL(`/login?next=${encodeURIComponent(path)}`);
}
