import { expect, test, type Page } from "@playwright/test";
import { expectNoHorizontalOverflow, setDemo } from "./helpers";

const rows = (page: Page) => page.getByRole("main").getByRole("list", { name: "회원" }).getByRole("listitem");
const filters = (page: Page) => page.getByRole("navigation", { name: "회원 필터" });
const region = (page: Page, name: string) => page.getByRole("region", { name });

async function expectNicknames(page: Page, nicknames: string[]) {
  await expect(rows(page)).toHaveCount(nicknames.length);
  for (const [index, nickname] of nicknames.entries()) {
    await expect(rows(page).nth(index)).toContainText(nickname);
  }
}

/* 신고·제재 관리에서 신고를 처리한다. 처리 결과는 회원 관리에도 반영된다 */
async function decideReport(page: Page, reportKey: string, decision: "기각" | "인정") {
  await page.goto(`/admin/reports/${reportKey}`);
  await page.getByRole("radio", { name: new RegExp(`^${decision}`) }).check();
  await page.getByRole("button", { name: "처리하기" }).click();
  await expect(page).toHaveURL(/\/admin\/reports\?processed=/);
}

const ALL_NICKNAMES = ["강민서", "김민준", "한서윤", "윤소희", "오태민", "이지우", "서준호", "최유나", "정하린", "박도현"];

test.beforeEach(async ({ context }) => {
  await setDemo(context, { role: "admin" });
});

test.describe("R39 테마", () => {
  for (const colorScheme of ["light", "dark"] as const) {
    test(`S220 제재 이력 배지에는 강조색을 쓰지 않는다 (${colorScheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.goto("/admin/users?filter=sanctioned");
      const accent = await page.evaluate(() => {
        const probe = document.createElement("span");
        probe.style.color = "var(--accent)";
        document.body.append(probe);
        const color = getComputedStyle(probe).color;
        probe.remove();
        return color;
      });
      const badge = rows(page).getByText("제재 이력 1건", { exact: true });
      await expect(badge).toBeVisible();
      expect(await badge.evaluate((element) => getComputedStyle(element).color)).not.toBe(accent);
    });
  }

  test("S221 본문에 강조색 바탕 버튼이 없다", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    for (const path of ["/admin/users", "/admin/users/user-4"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: "회원 관리" })).toBeVisible();
      const accentButtons = await page.locator("main a, main button").evaluateAll((elements) =>
        elements.filter((element) => getComputedStyle(element).backgroundColor === "rgb(15, 124, 74)").length,
      );
      expect(accentButtons, path).toBe(0);
    }
  });
});

test.describe("R40 접근 권한", () => {
  test("S222 일반 회원은 회원 상세를 볼 수 없다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/admin/users/user-4");
    await expect(page.getByRole("heading", { level: 1, name: "운영자만 볼 수 있는 페이지예요" })).toBeVisible();
    await expect(page.getByText("me***@example.com")).toHaveCount(0);
  });

  test("S223 비로그인은 그 회원으로 돌아오게 로그인으로 간다", async ({ page, context }) => {
    await setDemo(context, { role: "guest" });
    await page.goto("/admin/users/user-4");
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin%2Fusers%2Fuser-4$/);
  });

  test("S224 없는 회원은 맞춤 404 화면을 보여 준다", async ({ page }) => {
    await page.goto("/admin/users/nope");
    await expect(page.getByRole("heading", { level: 1, name: "찾는 페이지가 없어요" })).toBeVisible();
    /* 스트리밍 순서에 따라 Next가 noindex 메타를 두 번 넣기도 해서 개수가 아니라 있는지만 본다 */
    await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
  });
});

test.describe("R41 목록", () => {
  test("S225 전체는 최근 가입 순서이고 실명·이메일이 없다", async ({ page }) => {
    await page.goto("/admin/users");
    await expect(filters(page).getByRole("link", { name: "전체" })).toHaveAttribute("aria-current", "page");
    await expectNicknames(page, ALL_NICKNAMES);
    await expect(rows(page).first()).toContainText("테스터");
    await expect(rows(page).first()).toContainText("가입");
    await expect(rows(page).last()).toContainText("개발자");
    await expect(page.getByRole("main")).not.toContainText("@example.com");
    await expect(page.getByRole("main")).not.toContainText("*");
  });

  test("S226 제재 이력과 검토 대기 신고를 표시한다", async ({ page }) => {
    await page.goto("/admin/users");
    await expect(rows(page).filter({ hasText: "서준호" })).toContainText("제재 이력 1건");
    for (const nickname of ["오태민", "윤소희", "강민서"]) {
      await expect(rows(page).filter({ hasText: nickname })).toContainText("검토 대기 신고 1건");
    }
    await expect(rows(page).filter({ hasText: /제재 이력|검토 대기 신고/ })).toHaveCount(4);
  });

  test("S227 행을 누르면 상세로 간다", async ({ page }) => {
    await page.goto("/admin/users");
    await rows(page).filter({ hasText: "서준호" }).getByRole("link").click();
    await expect(page).toHaveURL(/\/admin\/users\/user-4$/);
  });

  test("S228 회원이 없으면 빈 상태 문구가 보인다", async ({ page, context }) => {
    await setDemo(context, { data: "empty" });
    await page.goto("/admin/users");
    await expect(page.getByText("회원이 없어요")).toBeVisible();
  });
});

test.describe("R42 검색과 필터", () => {
  test("S229 닉네임 일부로 찾는다", async ({ page }) => {
    await page.goto("/admin/users");
    const search = page.getByRole("searchbox", { name: "닉네임 검색" });
    await search.fill("민");
    await search.press("Enter");
    await expect(page).toHaveURL(/\/admin\/users\?q=%EB%AF%BC$/);
    await expectNicknames(page, ["강민서", "김민준", "오태민"]);
  });

  test("S230 검색 결과가 없으면 검색어와 함께 알린다", async ({ page }) => {
    await page.goto(`/admin/users?q=${encodeURIComponent("없는회원")}`);
    await expect(page.getByText("'없는회원'에 맞는 회원이 없어요")).toBeVisible();
    await expect(page.getByRole("searchbox", { name: "닉네임 검색" })).toHaveValue("없는회원");
  });

  test("S231 제재 이력 있는 회원만 본다", async ({ page }) => {
    await page.goto("/admin/users");
    await filters(page).getByRole("link", { name: "제재 이력 있음" }).click();
    await expect(page).toHaveURL(/\/admin\/users\?filter=sanctioned$/);
    await expectNicknames(page, ["서준호"]);
  });

  test("S232 검토 대기 신고가 있는 회원만 본다", async ({ page }) => {
    await page.goto("/admin/users");
    await filters(page).getByRole("link", { name: "검토 대기 신고 있음" }).click();
    await expect(page).toHaveURL(/\/admin\/users\?filter=reported$/);
    await expectNicknames(page, ["강민서", "윤소희", "오태민"]);
  });

  test("S233 검색과 필터를 함께 쓰고, 필터를 바꿔도 검색어는 남는다", async ({ page }) => {
    await page.goto(`/admin/users?filter=reported&q=${encodeURIComponent("민")}`);
    await expectNicknames(page, ["강민서", "오태민"]);
    await filters(page).getByRole("link", { name: "전체" }).click();
    await expect(page).toHaveURL(/\/admin\/users\?q=%EB%AF%BC$/);
    await expectNicknames(page, ["강민서", "김민준", "오태민"]);
  });

  test("S280 뒤로 가면 검색창도 주소의 검색어로 돌아온다", async ({ page }) => {
    await page.goto("/admin/users");
    const search = page.getByRole("searchbox", { name: "닉네임 검색" });
    await search.fill("민");
    await search.press("Enter");
    await expect(page).toHaveURL(/\/admin\/users\?q=%EB%AF%BC$/);
    await search.fill("준");
    await search.press("Enter");
    await expect(page).toHaveURL(/\/admin\/users\?q=%EC%A4%80$/);
    await expectNicknames(page, ["김민준", "서준호"]);
    await page.goBack();
    await expect(page).toHaveURL(/\/admin\/users\?q=%EB%AF%BC$/);
    await expectNicknames(page, ["강민서", "김민준", "오태민"]);
    await expect(search).toHaveValue("민");
  });

  test("S249 검색과 필터를 함께 써서 결과가 없으면 둘 다 말해 준다", async ({ page }) => {
    await page.goto(`/admin/users?filter=sanctioned&q=${encodeURIComponent("민")}`);
    await expect(page.getByText("'민' 검색과 '제재 이력 있음' 필터에 함께 맞는 회원이 없어요")).toBeVisible();
  });

  test("S234 모르는 필터는 전체로 본다", async ({ page }) => {
    await page.goto("/admin/users?filter=foo");
    await expect(filters(page).getByRole("link", { name: "전체" })).toHaveAttribute("aria-current", "page");
    await expect(rows(page)).toHaveCount(10);
  });
});

test.describe("R43 상세", () => {
  test("S235 기본 정보는 실명과 이메일을 가려서 보여 준다", async ({ page }) => {
    await page.goto("/admin/users/user-4");
    const info = region(page, "기본 정보");
    for (const text of ["서준호", "테스터", "가입", "서*호", "me***@example.com"]) {
      await expect(info).toContainText(text);
    }
    await expect(page.locator("body")).not.toContainText("member04@example.com");
  });

  test("S236 테스터는 참여 기록을 보여 준다", async ({ page }) => {
    await page.goto("/admin/users/user-4");
    const activity = region(page, "활동");
    for (const text of ["참여 확정", "7회", "피드백 제출", "5회", "미완료", "2회"]) {
      await expect(activity).toContainText(text);
    }
  });

  test("S237 개발자는 프로젝트와 구독을 보여 준다", async ({ page }) => {
    await page.goto("/admin/users/user-1");
    const activity = region(page, "활동");
    for (const text of ["프로젝트", "3개", "모집 건", "5개", "구독 중"]) {
      await expect(activity).toContainText(text);
    }
    await expect(activity).not.toContainText("미완료");
  });

  test("S238 제재 이력은 인정된 신고이고 신고 상세로 간다", async ({ page }) => {
    await page.goto("/admin/users/user-4");
    const sanctions = region(page, "제재 이력");
    await expect(sanctions.getByRole("link")).toHaveCount(1);
    const link = sanctions.getByRole("link");
    for (const text of ["다른 모집 건의 피드백을 그대로 붙여 넣었어요", "스터디 매칭", "처리"]) {
      await expect(link).toContainText(text);
    }
    await expect(link).toHaveAttribute("href", "/admin/reports/report-6");
  });

  test("S239 받은 신고는 검토 대기도 보여 준다", async ({ page }) => {
    await page.goto("/admin/users/user-6");
    const received = region(page, "받은 신고").getByRole("link");
    await expect(received).toHaveCount(1);
    await expect(received).toContainText("회의록 정리");
    await expect(received).toContainText("검토 대기");
    await expect(received).toHaveAttribute("href", "/admin/reports/report-1");
    await expect(region(page, "제재 이력")).toContainText("제재 이력이 없어요");
  });

  test("S240 기각된 신고는 제재 이력이 되지 않는다", async ({ page }) => {
    await page.goto("/admin/users/user-5");
    await expect(region(page, "받은 신고").getByRole("link")).toContainText("레시피핏");
    await expect(region(page, "받은 신고").getByRole("link")).toContainText("기각");
    await expect(region(page, "제재 이력")).toContainText("제재 이력이 없어요");
  });

  test("S241 목록으로 링크가 있다", async ({ page }) => {
    await page.goto("/admin/users/user-4");
    await expect(page.getByRole("link", { name: "목록으로" })).toHaveAttribute("href", "/admin/users");
  });
});

test.describe("R44 신고·제재 관리와 연결", () => {
  test("S242 신고를 인정하면 제재 이력이 생긴다", async ({ page }) => {
    await decideReport(page, "report-4", "인정");
    await page.goto("/admin/users/user-10");
    await expect(region(page, "제재 이력")).toContainText("채팅에서 부적절한 표현을 썼어요");
    await expect(region(page, "받은 신고").getByRole("link")).toContainText("인정");
    await page.goto("/admin/users?filter=sanctioned");
    await expectNicknames(page, ["강민서", "서준호"]);
  });

  test("S243 신고를 기각하면 제재 이력은 그대로다", async ({ page }) => {
    await decideReport(page, "report-1", "기각");
    await page.goto("/admin/users/user-6");
    await expect(region(page, "받은 신고").getByRole("link")).toContainText("기각");
    await expect(region(page, "제재 이력")).toContainText("제재 이력이 없어요");
    await page.goto("/admin/users?filter=reported");
    await expectNicknames(page, ["강민서", "윤소희"]);
  });

  test("S244 신고 상세의 대상은 회원 상세로 간다", async ({ page }) => {
    await page.goto("/admin/reports/report-1");
    await expect(page.getByRole("link", { name: "오태민" })).toHaveAttribute("href", "/admin/users/user-6");
    await page.goto("/admin/reports/report-4");
    await expect(page.getByRole("link", { name: "강민서" })).toHaveAttribute("href", "/admin/users/user-10");
  });
});

test.describe("R45 로딩과 접근성", () => {
  test("S245 응답이 늦어도 검색창과 필터는 먼저 보이고 목록은 스켈레톤이다", async ({ page, context }) => {
    await setDemo(context, { data: "slow" });
    await page.goto("/admin/users", { waitUntil: "commit" });
    await expect(page.getByRole("navigation", { name: "운영자 메뉴" })).toBeVisible();
    await expect(page.getByRole("searchbox", { name: "닉네임 검색" })).toBeVisible();
    await expect(filters(page)).toBeVisible();
    await expect(page.locator('[data-skeleton="user"]').first()).toBeVisible();
    await expect(rows(page)).toHaveCount(10, { timeout: 10_000 });
    await expect(page.locator("[data-skeleton]")).toHaveCount(0);
  });

  test("S246 검색창과 필터는 이름이 붙어 있다", async ({ page }) => {
    await page.goto("/admin/users");
    await expect(page.getByRole("search").getByRole("searchbox", { name: "닉네임 검색" })).toBeVisible();
    await expect(filters(page).getByRole("link")).toHaveCount(3);
  });

  test("S247 좁은 화면에서 가로로 넘치지 않는다", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    for (const path of ["/admin/users", "/admin/users/user-4"]) {
      await page.goto(path);
      await expect(page.getByRole("navigation", { name: "운영자 메뉴" })).toBeVisible();
      await expectNoHorizontalOverflow(page, path);
    }
  });
});
