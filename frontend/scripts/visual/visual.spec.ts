import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Browser } from "@playwright/test";
import { setDemo } from "../../e2e/helpers";
import { PAGES, type Role } from "../../e2e/pages";

/*
 * 같은 화면을 기준 서버와 작업 서버에서 바로 이어 찍고 픽셀 단위로 비교한다 (#160-R2).
 * 두 장을 같은 테스트 안에서 연달아 찍어서, 서버가 그리는 날짜·시각이 두 장 사이에 바뀌지 않게 한다.
 */

const BASE_URL = process.env.VISUAL_BASE_URL;
const HEAD_URL = process.env.VISUAL_HEAD_URL;

const TARGETS: [path: string, role: Role][] = [
  ...PAGES,
  ["/nope", "guest"],
  ["/my/chats/nope", "tester"],
  ["/admin/reports/nope", "admin"],
  /* 첫 탭이 아닌 화면. PAGES는 주소마다 첫 탭만 본다 (#160: 피드백 첨부 이미지가 비교에서 빠져 있었다) */
  ["/developer/recruitments/booklog-first", "developer"],
  ["/developer/recruitments/booklog-first?tab=feedback", "developer"],
  ["/developer/recruitments/booklog-first?tab=analytics", "developer"],
  ["/developer/recruitments/folio-builder?tab=feedback", "developer"],
  ["/developer/recruitments/folio-builder?tab=analytics", "developer"],
  ["/admin/reports?tab=done", "admin"],
  ["/admin/withdrawals?tab=done", "admin"],
  ["/testers/recruitments?tab=applied", "tester"],
  ["/testers/recruitments?tab=history", "tester"],
];

const VIEWPORTS = [
  { name: "wide", width: 1440, height: 900 },
  { name: "narrow", width: 375, height: 812 },
] as const;

const SCHEMES = ["light", "dark"] as const;

async function shoot(browser: Browser, baseURL: string, target: string, role: Role, viewport: (typeof VIEWPORTS)[number], colorScheme: (typeof SCHEMES)[number]) {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: viewport.width, height: viewport.height },
    colorScheme,
    reducedMotion: "reduce",
  });
  try {
    await setDemo(context, { role });
    const page = await context.newPage();
    await page.goto(target, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    /* 애니메이션이 붙은 요소는 따로 그려지는 층이 되어 둥근 테두리의 안티에일리어싱이 실행마다 달라진다. 두 서버 모두 끄고 찍는다 */
    await page.addStyleTag({ content: "*, *::before, *::after { animation: none !important; transition: none !important; }" });
    return await page.screenshot({ fullPage: true, animations: "disabled", caret: "hide" });
  } finally {
    await context.close();
  }
}

test.beforeAll(() => {
  if (!BASE_URL || !HEAD_URL) throw new Error("VISUAL_BASE_URL·VISUAL_HEAD_URL이 없다. npm run test:visual로 실행한다");
});

for (const colorScheme of SCHEMES) {
  for (const viewport of VIEWPORTS) {
    for (const [target, role] of TARGETS) {
      test(`${colorScheme} ${viewport.name} ${role} ${target}`, async ({ browser }, testInfo) => {
        const name = `${colorScheme}-${viewport.name}-${role}-${target.replace(/[^a-z0-9]+/gi, "_")}.png`;
        const base = await shoot(browser, BASE_URL!, target, role, viewport, colorScheme);
        const head = await shoot(browser, HEAD_URL!, target, role, viewport, colorScheme);
        const basePath = testInfo.snapshotPath(name);
        mkdirSync(path.dirname(basePath), { recursive: true });
        writeFileSync(basePath, base);
        expect(head).toMatchSnapshot(name, { maxDiffPixels: 0, threshold: 0 });
      });
    }
  }
}
