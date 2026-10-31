import { expect, test, type Page } from "@playwright/test";
import { setDemo } from "./helpers";

const rows = (page: Page) => page.getByRole("main").locator("ul[aria-label] > li");
const statusTabs = (page: Page) => page.getByRole("navigation", { name: "모집 취소 요청 상태" });
const region = (page: Page, name: string) => page.getByRole("region", { name });

type Decision = { decision: "승인" } | { decision: "반려"; reason: string; memo?: string };

async function decide(page: Page, cancellationKey: string, choice: Decision) {
  await page.goto(`/admin/cancellations/${cancellationKey}`);
  await page.getByRole("group", { name: "처리 결과" }).getByRole("radio", { name: new RegExp(`^${choice.decision}`) }).check();
  if (choice.decision === "반려") {
    await page.getByRole("group", { name: "반려 사유" }).getByRole("radio", { name: choice.reason }).check();
    if (choice.memo) await page.getByRole("textbox", { name: "반려 메모" }).fill(choice.memo);
  }
  await page.getByRole("button", { name: "처리하기" }).click();
  /* 처리되면 목록으로 가고, 막히면 상세에 남아 오류를 보여 준다. 어느 쪽이든 서버 응답을 기다린다 */
  await expect(page.getByRole("main").getByRole("alert").or(statusTabs(page))).toBeVisible();
}

test.beforeEach(async ({ context }) => {
  await setDemo(context, { role: "admin" });
});

test.describe("R47 테마", () => {
  for (const colorScheme of ["light", "dark"] as const) {
    test(`S250 결과 배지에는 강조색을 쓰지 않는다 (${colorScheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.goto("/admin/cancellations?tab=done");
      const accent = await page.evaluate(() => {
        const probe = document.createElement("span");
        probe.style.color = "var(--accent)";
        document.body.append(probe);
        const color = getComputedStyle(probe).color;
        probe.remove();
        return color;
      });
      for (const label of ["승인", "반려"]) {
        const badge = rows(page).getByText(label, { exact: true });
        await expect(badge).toBeVisible();
        expect(await badge.evaluate((element) => getComputedStyle(element).color)).not.toBe(accent);
      }
    });
  }

  test("S251 강조색 바탕 버튼은 처리하기 하나다", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/admin/cancellations/cancellation-1");
    await expect(page.getByRole("button", { name: "처리하기" })).toBeVisible();
    const accentButtons = await page.locator("main a, main button").evaluateAll((elements) =>
      elements
        .filter((element) => getComputedStyle(element).backgroundColor === "rgb(15, 124, 74)")
        .map((element) => element.textContent?.trim()),
    );
    expect(accentButtons).toEqual(["처리하기"]);
  });
});

test.describe("R48 접근 권한", () => {
  test("S252 일반 회원은 모집 취소 요청 상세를 볼 수 없다", async ({ page, context }) => {
    await setDemo(context, { role: "developer" });
    await page.goto("/admin/cancellations/cancellation-1");
    await expect(page.getByRole("heading", { level: 1, name: "운영자만 볼 수 있는 페이지예요" })).toBeVisible();
    await expect(page.getByText("서비스 출시 일정이 미뤄져서")).toHaveCount(0);
  });

  test("S253 비로그인은 그 요청으로 돌아오게 로그인으로 간다", async ({ page, context }) => {
    await setDemo(context, { role: "guest" });
    await page.goto("/admin/cancellations/cancellation-1");
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin%2Fcancellations%2Fcancellation-1$/);
  });

  test("S254 없는 요청은 맞춤 404 화면을 보여 준다", async ({ page }) => {
    await page.goto("/admin/cancellations/nope");
    await expect(page.getByRole("heading", { level: 1, name: "찾는 페이지가 없어요" })).toBeVisible();
    /* 스트리밍 순서에 따라 Next가 noindex 메타를 두 번 넣기도 해서 개수가 아니라 있는지만 본다 */
    await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
  });
});

test.describe("R49 목록", () => {
  test("S255 처리 대기는 오래 기다린 순서다", async ({ page }) => {
    await page.goto("/admin/cancellations");
    await expect(statusTabs(page).getByRole("link", { name: "처리 대기" })).toHaveAttribute("aria-current", "page");
    await expect(rows(page)).toHaveCount(2);
    await expect(rows(page).nth(0)).toContainText("레시피핏");
    await expect(rows(page).nth(1)).toContainText("동네 러닝 크루");
    for (const text of ["박도현", "확정 테스터", "요청"]) {
      await expect(rows(page).first()).toContainText(text);
    }
  });

  test("S256 확정 테스터 수를 표시하고 없으면 따로 알린다", async ({ page }) => {
    await page.goto("/admin/cancellations");
    await expect(rows(page).filter({ hasText: "레시피핏" })).toContainText("확정 테스터 3명");
    await expect(rows(page).filter({ hasText: "동네 러닝 크루" })).toContainText("확정 테스터 없음");
  });

  test("S257 처리 완료는 최근 처리 순서이고 결과와 처리 시각이 있다", async ({ page }) => {
    await page.goto("/admin/cancellations");
    await statusTabs(page).getByRole("link", { name: "처리 완료" }).click();
    await expect(page).toHaveURL(/\/admin\/cancellations\?tab=done$/);
    await expect(rows(page)).toHaveCount(2);
    await expect(rows(page).nth(0)).toContainText("모아플랜");
    await expect(rows(page).nth(0)).toContainText("승인");
    await expect(rows(page).nth(1)).toContainText("반려식물 일지");
    await expect(rows(page).nth(1)).toContainText("반려");
    await expect(rows(page).nth(0)).toContainText("처리");
  });

  test("S258 요청이 없으면 빈 상태 문구가 보인다", async ({ page, context }) => {
    await setDemo(context, { data: "empty" });
    await page.goto("/admin/cancellations");
    await expect(page.getByText("처리할 모집 취소 요청이 없어요")).toBeVisible();
  });

  test("S259 행을 누르면 상세로 간다", async ({ page }) => {
    await page.goto("/admin/cancellations");
    await rows(page).first().getByRole("link").click();
    await expect(page).toHaveURL(/\/admin\/cancellations\/cancellation-1$/);
  });
});

test.describe("R50 상세", () => {
  test("S260 요청 내용과 모집 글 링크가 있다", async ({ page }) => {
    await page.goto("/admin/cancellations/cancellation-1");
    const info = region(page, "요청 내용");
    for (const text of ["레시피핏", "박도현", "서비스 출시 일정이 미뤄져서 테스트를 할 수 없어요", "요청"]) {
      await expect(info).toContainText(text);
    }
    await expect(info.getByRole("link", { name: "모집 글 보기" })).toHaveAttribute("href", "/recruitments/recipefit");
  });

  test("S261 모집 건 현황과 승인하면 함께 취소되는 것을 보여 준다", async ({ page }) => {
    await page.goto("/admin/cancellations/cancellation-1");
    const status = region(page, "모집 건 현황");
    for (const text of ["모집 중", "3명", "0건"]) {
      await expect(status).toContainText(text);
    }
    await expect(status).toContainText("승인하면 확정 테스터 3명의 참여도 함께 취소돼요. 테스트 전이라 지급할 보상은 없어요.");
  });

  test("S262 확정 테스터가 없으면 그렇게 알린다", async ({ page }) => {
    await page.goto("/admin/cancellations/cancellation-2");
    const status = region(page, "모집 건 현황");
    await expect(status).toContainText("확정된 테스터가 없어요.");
    await expect(status).not.toContainText("참여도 함께 취소돼요");
  });

  test("S278 테스트가 이미 시작됐으면 알린다", async ({ page }) => {
    await page.goto("/admin/cancellations/cancellation-4");
    const status = region(page, "모집 건 현황");
    await expect(status).toContainText("이미 테스트가 시작됐어요.");
    await expect(status).toContainText("1건");
  });

  test("S263 목록으로 링크가 있다", async ({ page }) => {
    await page.goto("/admin/cancellations/cancellation-1");
    await expect(page.getByRole("link", { name: "목록으로" })).toHaveAttribute("href", "/admin/cancellations");
  });
});

test.describe("R51 처리", () => {
  test("S264 결과를 고르지 않으면 처리되지 않는다", async ({ page }) => {
    await page.goto("/admin/cancellations/cancellation-1");
    await page.getByRole("button", { name: "처리하기" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toHaveText("처리 결과를 골라 주세요.");
    await expect(page).toHaveURL(/\/admin\/cancellations\/cancellation-1$/);
  });

  test("S265 반려는 사유가 있어야 하고 기타는 메모가 있어야 한다", async ({ page }) => {
    await page.goto("/admin/cancellations/cancellation-1");
    await page.getByRole("radio", { name: /^반려/ }).check();
    await page.getByRole("button", { name: "처리하기" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toHaveText("반려 사유를 골라 주세요.");
    await expect(page.getByRole("group", { name: "처리 결과" }).getByRole("radio", { name: /^반려/ })).toBeChecked();
    await decide(page, "cancellation-1", { decision: "반려", reason: "기타" });
    await expect(page.getByRole("main").getByRole("alert")).toHaveText("개발자에게 보여 줄 사유를 적어 주세요.");
  });

  test("S266 승인하면 처리 완료로 옮겨진다", async ({ page }) => {
    await decide(page, "cancellation-1", { decision: "승인" });
    await expect(page).toHaveURL(/\/admin\/cancellations\?processed=cancellation-1$/);
    await expect(page.getByRole("status")).toHaveText("레시피핏 모집을 취소했어요. 확정 테스터 3명의 참여도 함께 취소돼요.");
    await expect(rows(page)).toHaveCount(1);
    await statusTabs(page).getByRole("link", { name: "처리 완료" }).click();
    await expect(rows(page).first()).toContainText("레시피핏");
    await expect(rows(page).first()).toContainText("승인");
  });

  test("S267 확정 테스터가 없는 요청을 승인하면 테스터 문구가 없다", async ({ page }) => {
    await decide(page, "cancellation-2", { decision: "승인" });
    await expect(page.getByRole("status")).toHaveText("동네 러닝 크루 모집을 취소했어요.");
  });

  test("S268 반려하면 모집은 그대로 진행된다", async ({ page }) => {
    await decide(page, "cancellation-1", { decision: "반려", reason: "이미 테스트가 진행 중이에요" });
    await expect(page).toHaveURL(/\/admin\/cancellations\?processed=cancellation-1$/);
    await expect(page.getByRole("status")).toHaveText("취소 요청을 반려했어요. 모집은 그대로 진행돼요.");
    await statusTabs(page).getByRole("link", { name: "처리 완료" }).click();
    await expect(rows(page).filter({ hasText: "레시피핏" })).toContainText("반려");
  });

  test("S269 처리한 요청의 상세는 결과만 보여 준다", async ({ page }) => {
    await decide(page, "cancellation-1", { decision: "반려", reason: "이미 테스트가 진행 중이에요" });
    await page.goto("/admin/cancellations/cancellation-1");
    await expect(page.getByRole("button", { name: "처리하기" })).toHaveCount(0);
    const result = region(page, "처리 결과");
    for (const text of ["반려", "이미 테스트가 진행 중이에요", "처리"]) {
      await expect(result).toContainText(text);
    }
  });

  test("S270 주소를 바꿔도 처리하지 않은 요청의 결과 문구는 나오지 않는다", async ({ page }) => {
    await page.goto("/admin/cancellations?processed=cancellation-1");
    await expect(rows(page)).toHaveCount(2);
    await expect(page.getByRole("status")).toHaveCount(0);
  });

  test("S271 기록을 저장할 공간이 모자라면 처리하지 않고 알린다", async ({ page, context }) => {
    /* 메모가 긴 처리 기록 3건이 이미 있어서, 80자 메모를 하나 더 담으면 쿠키 한도를 넘는 상태 */
    const review = (memo: string) => ({ decision: "rejected", reason: "other", memo, processedAt: new Date().toISOString() });
    const stored = Object.fromEntries(["cancellation-2", "cancellation-3", "cancellation-4"].map((key) => [key, review("가".repeat(120))]));
    await context.addCookies([
      { name: "demo-admin-cancellations", value: encodeURIComponent(JSON.stringify(stored)), url: "http://localhost:3100" },
    ]);
    await decide(page, "cancellation-1", { decision: "반려", reason: "기타", memo: "나".repeat(80) });
    await expect(page.getByRole("main").getByRole("alert")).toContainText("시연용 저장 공간이 모자라 처리하지 못했어요");
    await expect(page.getByRole("textbox", { name: "반려 메모" })).toHaveValue("나".repeat(80));
    await page.goto("/admin/cancellations");
    await expect(rows(page).first()).toContainText("레시피핏");
  });

  test("S272 처리 결과가 운영자 홈 건수에 반영된다", async ({ page }) => {
    await decide(page, "cancellation-1", { decision: "승인" });
    await page.goto("/admin");
    const card = page.getByRole("region", { name: "처리 대기" }).getByRole("link").nth(2);
    await expect(card).toContainText("모집 취소 요청");
    await expect(card).toContainText("1건");
  });
});

test.describe("R52 운영자 홈 연결", () => {
  test("S273 오래 기다린 요청의 모집 취소는 상세로 간다", async ({ page }) => {
    await page.goto("/admin");
    await page.getByRole("region", { name: "오래 기다린 요청" }).getByRole("link", { name: /레시피핏/ }).click();
    await expect(page).toHaveURL(/\/admin\/cancellations\/cancellation-1$/);
  });
});

test.describe("R53 로딩과 접근성", () => {
  test("S274 응답이 늦어도 탭은 먼저 보이고 목록은 스켈레톤이다", async ({ page, context }) => {
    await setDemo(context, { data: "slow" });
    await page.goto("/admin/cancellations", { waitUntil: "commit" });
    await expect(page.getByRole("navigation", { name: "운영자 메뉴" })).toBeVisible();
    await expect(statusTabs(page)).toBeVisible();
    await expect(page.locator('[data-skeleton="cancellation"]').first()).toBeVisible();
    await expect(rows(page)).toHaveCount(2, { timeout: 10_000 });
    await expect(page.locator("[data-skeleton]")).toHaveCount(0);
  });

  test("S275 처리 양식은 이름 붙은 라디오 그룹과 메모 입력창이다", async ({ page }) => {
    await page.goto("/admin/cancellations/cancellation-1");
    const decision = page.getByRole("group", { name: "처리 결과" });
    await expect(decision.getByRole("radio")).toHaveCount(2);
    await expect(decision.getByRole("radio", { name: /^승인/ })).toBeVisible();
    await expect(decision.getByRole("radio", { name: /^반려/ })).toBeVisible();
    await decision.getByRole("radio", { name: /^반려/ }).check();
    await expect(page.getByRole("group", { name: "반려 사유" }).getByRole("radio")).toHaveCount(3);
    const memo = page.getByRole("textbox", { name: "반려 메모" });
    await expect(memo).toHaveAttribute("maxlength", "80");
    await expect(memo).toHaveAccessibleDescription(/반려할 때 운영자 기록으로 남아요/);
  });

  test("S279 반려 사유와 메모는 반려를 골라야 보인다", async ({ page }) => {
    await page.goto("/admin/cancellations/cancellation-1");
    const decision = page.getByRole("group", { name: "처리 결과" });
    const reasons = page.getByRole("group", { name: "반려 사유" });
    const memo = page.getByRole("textbox", { name: "반려 메모" });
    await expect(decision).toBeVisible();
    await expect(reasons).toBeHidden();
    await expect(memo).toBeHidden();
    await decision.getByRole("radio", { name: /^승인/ }).check();
    await expect(reasons).toBeHidden();
    await decision.getByRole("radio", { name: /^반려/ }).check();
    await expect(reasons).toBeVisible();
    await expect(memo).toBeVisible();
    /* 다시 승인으로 바꾸면 숨지만, 반려로 돌아오면 고른 사유와 메모가 남아 있다 */
    await reasons.getByRole("radio", { name: "기타" }).check();
    await memo.fill("다음 달에 다시 요청해 주세요");
    await decision.getByRole("radio", { name: /^승인/ }).check();
    await expect(reasons).toBeHidden();
    await decision.getByRole("radio", { name: /^반려/ }).check();
    await expect(reasons.getByRole("radio", { name: "기타" })).toBeChecked();
    await expect(memo).toHaveValue("다음 달에 다시 요청해 주세요");
  });

  test("S276 좁은 화면에서 가로로 넘치지 않는다", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    for (const path of ["/admin/cancellations", "/admin/cancellations/cancellation-1"]) {
      await page.goto(path);
      await expect(page.getByRole("navigation", { name: "운영자 메뉴" })).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });

  test("S283 공백 없는 긴 메모나 URL도 좁은 화면에서 넘치지 않는다", async ({ page }) => {
    const longWord = "a".repeat(80);
    const longUrl = `https://example.com/${"b".repeat(60)}`;
    await decide(page, "cancellation-1", { decision: "반려", reason: "기타", memo: longWord });
    await decide(page, "cancellation-2", { decision: "반려", reason: "취소 사유가 부족해요", memo: longUrl });
    await page.setViewportSize({ width: 375, height: 812 });
    for (const [key, text] of [
      ["cancellation-1", longWord],
      ["cancellation-2", longUrl],
    ]) {
      await page.goto(`/admin/cancellations/${key}`);
      await expect(page.getByRole("region", { name: "처리 결과" })).toContainText(text);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, key).toBeLessThanOrEqual(0);
    }
  });
});
