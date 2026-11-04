import { expect, test } from "@playwright/test";
import { expectLoginRedirect, expectNoHorizontalOverflow, setDemo } from "./helpers";

/*
 * 페이지마다 따로 확인하던 것을 페이지 목록을 돌며 한 번에 본다.
 * 새 페이지를 만들면 이 목록에 한 줄 더한다.
 */

type Role = "guest" | "tester" | "developer" | "admin";

/** 페이지와 그 페이지를 볼 수 있는 역할 */
const PAGES: [path: string, role: Role][] = [
  ["/", "guest"],
  ["/login", "guest"],
  ["/signup", "guest"],
  ["/my", "tester"],
  ["/my/credits", "tester"],
  ["/recruitments/booklog", "guest"],
  ["/my/credits/withdrawals", "tester"],
  ["/my/profile/edit", "tester"],
  ["/my/subscription", "developer"],
  ["/my/subscription/checkout", "developer"],
  ["/my/chats", "tester"],
  ["/my/chats/booklog-yunseul", "tester"],
  ["/my/participations", "tester"],
  ["/my/participations/p-meeting-notes", "tester"],
  ["/my/projects", "developer"],
  ["/my/projects/new", "developer"],
  ["/my/projects/booklog", "developer"],
  ["/my/projects/booklog/edit", "developer"],
  ["/my/projects/booklog/recruitments/new", "developer"],
  ["/my/projects/folio-builder/recruitments/folio-builder", "developer"],
  ["/admin", "admin"],
  ["/admin/reports", "admin"],
  ["/admin/reports/report-1", "admin"],
  ["/admin/withdrawals", "admin"],
  ["/admin/withdrawals?open=withdrawal-1", "admin"],
  ["/admin/cancellations", "admin"],
  ["/admin/cancellations/cancellation-1", "admin"],
  ["/admin/users", "admin"],
  ["/admin/users/user-1", "admin"],
];

const PROTECTED = PAGES.filter(([, role]) => role !== "guest");
const ADMIN = PAGES.filter(([, role]) => role === "admin");

test.describe("R11 빈 링크와 404 · 좁은 화면", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  for (const [path, role] of PAGES) {
    test(`#56-S1 ${path}는 375px에서 가로로 넘치지 않는다`, async ({ page, context }) => {
      await setDemo(context, { role });
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expectNoHorizontalOverflow(page, path);
    });
  }
});

test.describe("R11 빈 링크와 404 · 보호 페이지", () => {
  for (const [path] of PROTECTED) {
    test(`#56-S2 비로그인은 ${path}에서 그 주소로 돌아오게 로그인으로 간다`, async ({ page, context }) => {
      await setDemo(context, { role: "guest" });
      await expectLoginRedirect(page, path);
    });
  }

  for (const [path] of ADMIN) {
    test(`#56-S3 일반 회원은 ${path}에서 운영자 안내만 본다`, async ({ page, context }) => {
      await setDemo(context, { role: "tester" });
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: "운영자만 볼 수 있는 페이지예요" })).toBeVisible();
    });
  }
});
