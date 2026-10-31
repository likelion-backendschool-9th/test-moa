import { expect, test, type Page } from "@playwright/test";
import { setDemo } from "./helpers";

const rows = (page: Page) => page.getByRole("main").locator("ul[aria-label] > li");
const statusTabs = (page: Page) => page.getByRole("navigation", { name: "출금 요청 상태" });

type Decision = { decision: "지급 완료" } | { decision: "반려"; reason: string; memo?: string };

async function decide(page: Page, withdrawalKey: string, choice: Decision) {
  await page.goto(`/admin/withdrawals/${withdrawalKey}`);
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

test.describe("R31 테마", () => {
  for (const colorScheme of ["light", "dark"] as const) {
    test(`S191 결과 배지에는 강조색을 쓰지 않는다 (${colorScheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.goto("/admin/withdrawals?tab=done");
      const accent = await page.evaluate(() => {
        const probe = document.createElement("span");
        probe.style.color = "var(--accent)";
        document.body.append(probe);
        const color = getComputedStyle(probe).color;
        probe.remove();
        return color;
      });
      for (const label of ["지급 완료", "반려"]) {
        const badge = rows(page).getByText(label, { exact: true });
        await expect(badge).toBeVisible();
        expect(await badge.evaluate((element) => getComputedStyle(element).color)).not.toBe(accent);
      }
    });
  }

  test("S192 강조색 바탕 버튼은 처리하기 하나다", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/admin/withdrawals/withdrawal-1");
    await expect(page.getByRole("button", { name: "처리하기" })).toBeVisible();
    const accentButtons = await page.locator("main a, main button").evaluateAll((elements) =>
      elements
        .filter((element) => getComputedStyle(element).backgroundColor === "rgb(15, 124, 74)")
        .map((element) => element.textContent?.trim()),
    );
    expect(accentButtons).toEqual(["처리하기"]);
  });
});

test.describe("R32 접근 권한", () => {
  test("S193 일반 회원은 출금 요청 상세를 볼 수 없다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/admin/withdrawals/withdrawal-1");
    await expect(page.getByRole("heading", { level: 1, name: "운영자만 볼 수 있는 페이지예요" })).toBeVisible();
    await expect(page.getByText("123456789012")).toHaveCount(0);
  });

  test("S194 비로그인은 그 요청으로 돌아오게 로그인으로 간다", async ({ page, context }) => {
    await setDemo(context, { role: "guest" });
    await page.goto("/admin/withdrawals/withdrawal-1");
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin%2Fwithdrawals%2Fwithdrawal-1$/);
  });

  test("S195 없는 요청은 맞춤 404 화면을 보여 준다", async ({ page }) => {
    await page.goto("/admin/withdrawals/nope");
    await expect(page.getByRole("heading", { level: 1, name: "찾는 페이지가 없어요" })).toBeVisible();
    /* 스트리밍 순서에 따라 Next가 noindex 메타를 두 번 넣기도 해서 개수가 아니라 있는지만 본다 */
    await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
  });
});

test.describe("R33 목록", () => {
  test("S196 처리 대기는 오래 기다린 순서이고 계좌번호가 없다", async ({ page }) => {
    await page.goto("/admin/withdrawals");
    await expect(statusTabs(page).getByRole("link", { name: "처리 대기" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("main")).toContainText("3건 · 25,200원");
    const list = rows(page);
    await expect(list).toHaveCount(3);
    for (const [index, name] of ["이지우", "김민준", "한서윤"].entries()) {
      await expect(list.nth(index)).toContainText(name);
    }
    for (const text of ["5,000원", "국민", "신청"]) {
      await expect(list.first()).toContainText(text);
    }
    for (const number of ["123456789012", "110234567890", "100012345678"]) {
      await expect(page.getByRole("main")).not.toContainText(number);
    }
  });

  test("S197 예금주가 다른 요청에 확인 필요 표시가 있다", async ({ page }) => {
    await page.goto("/admin/withdrawals");
    await expect(rows(page).filter({ hasText: "김민준" })).toContainText("예금주 확인 필요");
    await expect(rows(page).filter({ hasText: "예금주 확인 필요" })).toHaveCount(1);
  });

  test("S198 처리 완료는 최근 처리 순서이고 결과와 처리 시각이 있다", async ({ page }) => {
    await page.goto("/admin/withdrawals");
    await statusTabs(page).getByRole("link", { name: "처리 완료" }).click();
    await expect(page).toHaveURL(/\/admin\/withdrawals\?tab=done$/);
    const list = rows(page);
    await expect(list).toHaveCount(2);
    await expect(list.nth(0)).toContainText("박도현");
    await expect(list.nth(0)).toContainText("지급 완료");
    await expect(list.nth(1)).toContainText("최유나");
    await expect(list.nth(1)).toContainText("반려");
    await expect(list.nth(0)).toContainText("처리");
  });

  test("S199 요청이 없으면 빈 상태 문구가 보인다", async ({ page, context }) => {
    await setDemo(context, { data: "empty" });
    await page.goto("/admin/withdrawals");
    await expect(page.getByText("처리할 출금 요청이 없어요")).toBeVisible();
  });

  test("S200 행을 누르면 상세로 간다", async ({ page }) => {
    await page.goto("/admin/withdrawals");
    await rows(page).first().getByRole("link").click();
    await expect(page).toHaveURL(/\/admin\/withdrawals\/withdrawal-1$/);
  });
});

test.describe("R34 상세", () => {
  test("S201 처리 대기 상세는 송금에 필요한 정보를 보여 준다", async ({ page }) => {
    await page.goto("/admin/withdrawals/withdrawal-1");
    const info = page.getByRole("region", { name: "신청 내용" });
    for (const text of ["이지우", "회원 이름", "5,000원", "신청"]) {
      await expect(info).toContainText(text);
    }
    const account = page.getByRole("region", { name: "받을 계좌" });
    for (const text of ["국민", "123456789012", "이지우"]) {
      await expect(account).toContainText(text);
    }
    await expect(account.getByRole("button", { name: "계좌번호 복사" })).toBeVisible();
  });

  test("S202 예금주가 회원 이름과 다르면 알린다", async ({ page }) => {
    await page.goto("/admin/withdrawals/withdrawal-2");
    await expect(page.getByRole("region", { name: "받을 계좌" })).toContainText("김민지");
    await expect(page.getByRole("region", { name: "신청 내용" })).toContainText("김민준");
    await expect(page.getByText("예금주가 회원 이름과 달라요.")).toBeVisible();
  });

  test("S203 처리 완료 상세는 계좌번호 끝 4자리만 보여 준다", async ({ page }) => {
    await page.goto("/admin/withdrawals/withdrawal-4");
    const account = page.getByRole("region", { name: "받을 계좌" });
    await expect(account).toContainText("****5678");
    await expect(account).not.toContainText("3333015678");
    await expect(page.getByRole("button", { name: "계좌번호 복사" })).toHaveCount(0);
  });

  test("S204 목록으로 링크가 있다", async ({ page }) => {
    await page.goto("/admin/withdrawals/withdrawal-1");
    await expect(page.getByRole("link", { name: "목록으로" })).toHaveAttribute("href", "/admin/withdrawals");
  });
});

test.describe("R35 처리", () => {
  test("S205 결과를 고르지 않으면 처리되지 않는다", async ({ page }) => {
    await page.goto("/admin/withdrawals/withdrawal-1");
    await page.getByRole("button", { name: "처리하기" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toHaveText("처리 결과를 골라 주세요.");
    await expect(page).toHaveURL(/\/admin\/withdrawals\/withdrawal-1$/);
    await page.goto("/admin/withdrawals");
    await expect(rows(page)).toHaveCount(3);
  });

  test("S206 반려는 사유가 있어야 하고 기타는 메모가 있어야 한다", async ({ page }) => {
    await page.goto("/admin/withdrawals/withdrawal-1");
    await page.getByRole("radio", { name: /^반려/ }).check();
    await page.getByRole("button", { name: "처리하기" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toHaveText("반려 사유를 골라 주세요.");
    await decide(page, "withdrawal-1", { decision: "반려", reason: "기타" });
    await expect(page.getByRole("main").getByRole("alert")).toHaveText("회원에게 보여 줄 사유를 적어 주세요.");
    await page.goto("/admin/withdrawals");
    await expect(rows(page)).toHaveCount(3);
  });

  test("S207 지급 완료하면 처리 완료로 옮겨진다", async ({ page }) => {
    await decide(page, "withdrawal-1", { decision: "지급 완료" });
    await expect(page).toHaveURL(/\/admin\/withdrawals\?processed=withdrawal-1$/);
    await expect(page.getByRole("status")).toHaveText("5,000원을 지급 완료로 처리했어요.");
    await expect(rows(page)).toHaveCount(2);
    await expect(page.getByRole("main")).toContainText("2건 · 20,200원");
    await statusTabs(page).getByRole("link", { name: "처리 완료" }).click();
    await expect(rows(page).first()).toContainText("이지우");
    await expect(rows(page).first()).toContainText("지급 완료");
  });

  test("S208 반려하면 크레딧이 돌아간다는 문구가 보인다", async ({ page }) => {
    await decide(page, "withdrawal-2", { decision: "반려", reason: "예금주 이름이 회원 정보와 달라요" });
    await expect(page).toHaveURL(/\/admin\/withdrawals\?processed=withdrawal-2$/);
    await expect(page.getByRole("status")).toHaveText("출금 요청을 반려했어요. 잠긴 크레딧이 회원에게 돌아가요.");
    await statusTabs(page).getByRole("link", { name: "처리 완료" }).click();
    await expect(rows(page).filter({ hasText: "김민준" })).toContainText("반려");
  });

  test("S209 처리한 요청의 상세는 결과만 보여 준다", async ({ page }) => {
    await decide(page, "withdrawal-2", { decision: "반려", reason: "예금주 이름이 회원 정보와 달라요" });
    await page.goto("/admin/withdrawals/withdrawal-2");
    await expect(page.getByRole("button", { name: "처리하기" })).toHaveCount(0);
    const result = page.getByRole("region", { name: "처리 결과" });
    await expect(result).toContainText("반려");
    await expect(result).toContainText("예금주 이름이 회원 정보와 달라요");
    await expect(result).toContainText("처리");
    await expect(page.getByRole("region", { name: "받을 계좌" })).toContainText("****7890");
  });

  test("S210 기록을 저장할 공간이 모자라면 처리하지 않고 알린다", async ({ page, context }) => {
    /* 메모가 긴 처리 기록 3건이 이미 있어서, 80자 메모를 하나 더 담으면 쿠키 한도를 넘는 상태 */
    const review = (memo: string) => ({ decision: "rejected", reason: "other", memo, processedAt: new Date().toISOString() });
    const stored = Object.fromEntries(["withdrawal-2", "withdrawal-3", "withdrawal-4"].map((key) => [key, review("가".repeat(120))]));
    await context.addCookies([
      { name: "demo-admin-withdrawals", value: encodeURIComponent(JSON.stringify(stored)), url: "http://localhost:3100" },
    ]);
    await decide(page, "withdrawal-1", { decision: "반려", reason: "기타", memo: "나".repeat(80) });
    await expect(page.getByRole("main").getByRole("alert")).toContainText("시연용 저장 공간이 모자라 처리하지 못했어요");
    await expect(page).toHaveURL(/\/admin\/withdrawals\/withdrawal-1$/);
    /* 줄이라고 안내하는 메모가 그대로 남아 있다 */
    await expect(page.getByRole("textbox", { name: "반려 메모" })).toHaveValue("나".repeat(80));
    await page.goto("/admin/withdrawals");
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first()).toContainText("이지우");
  });

  test("S217 막혀도 고른 값이 남아 있고 주소는 그대로다", async ({ page }) => {
    await decide(page, "withdrawal-1", { decision: "반려", reason: "기타" });
    await expect(page.getByRole("main").getByRole("alert")).toHaveText("회원에게 보여 줄 사유를 적어 주세요.");
    await expect(page).toHaveURL(/\/admin\/withdrawals\/withdrawal-1$/);
    await expect(page.getByRole("group", { name: "처리 결과" }).getByRole("radio", { name: /^반려/ })).toBeChecked();
    await expect(page.getByRole("group", { name: "반려 사유" }).getByRole("radio", { name: "기타" })).toBeChecked();
    /* 빠뜨린 메모만 적으면 처리된다 */
    await page.getByRole("textbox", { name: "반려 메모" }).fill("계좌가 해지됐다고 은행에서 알려 왔어요");
    await page.getByRole("button", { name: "처리하기" }).click();
    await expect(page).toHaveURL(/\/admin\/withdrawals\?processed=withdrawal-1$/);
  });

  test("S218 기타가 아닌 반려의 메모는 운영자 메모로 남는다", async ({ page }) => {
    await page.goto("/admin/withdrawals/withdrawal-1");
    await expect(page.getByText("반려할 때 운영자 기록으로 남아요.", { exact: false })).toBeVisible();
    await decide(page, "withdrawal-1", { decision: "반려", reason: "계좌번호를 확인할 수 없어요", memo: "은행 조회 결과 없음" });
    await page.goto("/admin/withdrawals/withdrawal-1");
    const result = page.getByRole("region", { name: "처리 결과" });
    await expect(result).toContainText("계좌번호를 확인할 수 없어요");
    await expect(result).toContainText("운영자 메모");
    await expect(result).toContainText("은행 조회 결과 없음");
  });

  test("S219 주소를 바꿔도 처리하지 않은 요청이나 틀린 금액은 문구에 나오지 않는다", async ({ page }) => {
    for (const path of ["/admin/withdrawals?processed=withdrawal-1", "/admin/withdrawals?processed=paid&amount=9999999"]) {
      await page.goto(path);
      await expect(rows(page)).toHaveCount(3);
      await expect(page.getByRole("status")).toHaveCount(0);
    }
  });

  test("S211 처리 결과가 운영자 홈 건수에 반영된다", async ({ page }) => {
    await decide(page, "withdrawal-1", { decision: "지급 완료" });
    await page.goto("/admin");
    const card = page.getByRole("region", { name: "처리 대기" }).getByRole("link").nth(1);
    await expect(card).toContainText("출금 요청");
    await expect(card).toContainText("2건");
  });
});

test.describe("R36 운영자 홈 연결", () => {
  test("S212 오래 기다린 요청의 출금은 상세로 간다", async ({ page }) => {
    await page.goto("/admin");
    await page.getByRole("region", { name: "오래 기다린 요청" }).getByRole("link", { name: /이지우/ }).click();
    await expect(page).toHaveURL(/\/admin\/withdrawals\/withdrawal-1$/);
  });
});

test.describe("R37 로딩과 접근성", () => {
  test("S213 응답이 늦어도 탭은 먼저 보이고 목록은 스켈레톤이다", async ({ page, context }) => {
    await setDemo(context, { data: "slow" });
    await page.goto("/admin/withdrawals", { waitUntil: "commit" });
    await expect(page.getByRole("navigation", { name: "운영자 메뉴" })).toBeVisible();
    await expect(statusTabs(page)).toBeVisible();
    await expect(page.locator('[data-skeleton="withdrawal"]').first()).toBeVisible();
    await expect(rows(page)).toHaveCount(3, { timeout: 10_000 });
    await expect(page.locator("[data-skeleton]")).toHaveCount(0);
  });

  test("S214 처리 양식은 이름 붙은 라디오 그룹과 메모 입력창이다", async ({ page }) => {
    await page.goto("/admin/withdrawals/withdrawal-1");
    const decision = page.getByRole("group", { name: "처리 결과" });
    await expect(decision.getByRole("radio")).toHaveCount(2);
    await expect(decision.getByRole("radio", { name: /^지급 완료/ })).toBeVisible();
    await expect(decision.getByRole("radio", { name: /^반려/ })).toBeVisible();
    await expect(page.getByRole("group", { name: "반려 사유" }).getByRole("radio")).toHaveCount(3);
    await expect(page.getByRole("textbox", { name: "반려 메모" })).toHaveAttribute("maxlength", "80");
  });

  test("S215 좁은 화면에서 가로로 넘치지 않는다", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    for (const path of ["/admin/withdrawals", "/admin/withdrawals/withdrawal-1"]) {
      await page.goto(path);
      await expect(page.getByRole("navigation", { name: "운영자 메뉴" })).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
    /* 계좌번호는 줄바꿈 없이 한 줄이다 */
    const number = page.getByRole("region", { name: "받을 계좌" }).getByText("123456789012");
    const { height, lineHeight } = await number.evaluate((element) => ({
      height: element.getBoundingClientRect().height,
      lineHeight: parseFloat(getComputedStyle(element).lineHeight),
    }));
    expect(height).toBeLessThanOrEqual(lineHeight * 1.5);
  });
});
