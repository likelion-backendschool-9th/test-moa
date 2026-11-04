import { expect, test } from "@playwright/test";
import { setDemo } from "./helpers";

/*
 * 화면은 보이지만 JS 번들이 아직 받아지지 않은 상태의 제출. 폼에 서버 액션이 없으면 브라우저가 GET으로 보내
 * 비밀번호가 주소에 남는다. 스트리밍을 채우는 HTML 안 인라인 스크립트는 돌고, 번들(_next/static)만 막아 재현한다.
 * 시나리오 번호는 같은 폼의 입력 속성 시나리오(S288, S300, S177)에 붙인다. 문서의 그 시나리오에 이 확인이 적혀 있다.
 */
test.beforeEach(async ({ page }) => {
  await page.route("**/_next/static/**/*.js", (route) => route.abort());
});

test("S288 JS 없이 로그인해도 POST로 제출되고 비밀번호가 주소에 남지 않는다", async ({ page, context }) => {
  await setDemo(context, { role: "guest" });
  await page.goto("/login?next=%2Fmy");
  await page.getByRole("main").getByLabel("이메일").fill("seoyun@example.com");
  await page.getByRole("main").getByLabel("비밀번호").fill("test1234");
  const [request] = await Promise.all([
    page.waitForRequest((req) => req.url().includes("/login") && req.isNavigationRequest()),
    page.getByRole("main").getByRole("button", { name: "로그인", exact: true }).click(),
  ]);
  expect(request.method()).toBe("POST");
  await page.waitForLoadState();
  expect(page.url()).not.toContain("test1234");
  expect(page.url()).not.toContain("password");
});

test("S300 JS 없이 가입해도 POST로 제출되고 비밀번호가 주소에 남지 않는다", async ({ page, context }) => {
  await setDemo(context, { role: "guest" });
  await page.goto("/signup");
  const form = page.getByRole("main");
  await form.getByLabel("이름").fill("김모아");
  await form.getByLabel("닉네임").fill("모아");
  await form.getByLabel("이메일").fill("moa@example.com");
  await form.getByLabel("비밀번호", { exact: true }).fill("moa2026pw");
  await form.getByLabel("비밀번호 확인").fill("moa2026pw");
  const [request] = await Promise.all([
    page.waitForRequest((req) => req.url().includes("/signup") && req.isNavigationRequest()),
    form.getByRole("button", { name: "가입하기" }).click(),
  ]);
  expect(request.method()).toBe("POST");
  await page.waitForLoadState();
  expect(page.url()).not.toContain("moa2026pw");
});

test("S177 JS 없이 비밀번호를 바꿔도 POST로 제출되고 비밀번호가 주소에 남지 않는다", async ({ page, context }) => {
  await setDemo(context, { role: "tester" });
  await page.goto("/my/profile/edit");
  const card = page.getByRole("region", { name: "비밀번호 변경", exact: true });
  await card.getByLabel("현재 비밀번호").fill("test1234");
  await card.getByLabel("새 비밀번호", { exact: true }).fill("moa2026pw");
  await card.getByLabel("새 비밀번호 확인").fill("moa2026pw");
  const [request] = await Promise.all([
    page.waitForRequest((req) => req.url().includes("/my/profile/edit") && req.isNavigationRequest()),
    card.getByRole("button", { name: "비밀번호 변경" }).click(),
  ]);
  expect(request.method()).toBe("POST");
  await page.waitForLoadState();
  expect(page.url()).not.toContain("test1234");
  expect(page.url()).not.toContain("moa2026pw");
});
