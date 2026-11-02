import { expect, type Page, test } from "@playwright/test";
import { expectLoginRedirect, setDemo } from "./helpers";

const region = (page: Page, name: string) => page.getByRole("region", { name, exact: true });
const ledgerRows = (page: Page) => region(page, "크레딧 내역").locator(":scope > ul > li");
const historyRows = (page: Page) => region(page, "출금 내역").getByRole("listitem");
const balanceRow = (page: Page, label: string) => region(page, "잔액").locator("dl > div").filter({ hasText: label });
const filter = (page: Page, name: string) => page.getByRole("navigation", { name: "내역 필터" }).getByRole("link", { name });

test.describe("R1 접근 제어", () => {
  test("S348 비로그인은 크레딧 관리에서 로그인으로 간다", async ({ page, context }) => {
    await setDemo(context, { role: "guest" });
    await expectLoginRedirect(page, "/my/credits");
  });

  test("S349 비로그인은 출금에서 로그인으로 간다", async ({ page, context }) => {
    await setDemo(context, { role: "guest" });
    await expectLoginRedirect(page, "/my/credits/withdrawals");
  });
});

test.describe("R2 잔액", () => {
  test("S350 총 잔액과 구성, 승인 대기", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/my/credits");
    await expect(page.getByRole("heading", { level: 1, name: "크레딧" })).toBeVisible();
    const balance = region(page, "잔액");
    await expect(balance.getByText("12,480 크레딧", { exact: true })).toBeVisible();
    await expect(balanceRow(page, "현금화 가능")).toContainText("9,480 크레딧");
    await expect(balanceRow(page, "구독 결제 전용")).toContainText("3,000 크레딧");
    await expect(balanceRow(page, "출금 처리 중")).toContainText("0 크레딧");
    await expect(balance.getByText(/승인 대기\s*1,350 크레딧/)).toBeVisible();
    await expect(balance.getByRole("link", { name: "출금 신청" })).toHaveAttribute("href", "/my/credits/withdrawals");
    await expect(balance.getByRole("link", { name: "크레딧 내역" })).toHaveCount(0);
  });

  test("S351 출금할 크레딧이 없으면 출금 신청이 없다", async ({ page, context }) => {
    await setDemo(context, { role: "admin" });
    await page.goto("/my/credits");
    const balance = region(page, "잔액");
    await expect(balance.getByText("0 크레딧").first()).toBeVisible();
    await expect(balance.getByRole("link", { name: "출금 신청" })).toHaveCount(0);
  });
});

test.describe("R3 크레딧 내역", () => {
  test("S352 전체 내역을 최신순으로", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/my/credits");
    const rows = ledgerRows(page);
    await expect(rows).toHaveCount(12);
    await expect(rows.first()).toContainText("레시피핏 테스트 보상");
    await expect(rows.first()).toContainText("+1,260 크레딧");
    await expect(rows.last()).toContainText("가입 크레딧");
    await expect(rows.last()).toContainText("+3,000 크레딧");
    await expect(filter(page, "전체")).toHaveAttribute("aria-current", "page");
  });

  test("S353 받은 크레딧", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/my/credits");
    await filter(page, "받은 크레딧").click();
    await expect(page).toHaveURL("/my/credits?type=in");
    await expect(ledgerRows(page)).toHaveCount(11);
    await expect(filter(page, "받은 크레딧")).toHaveAttribute("aria-current", "page");
  });

  test("S354 쓴 크레딧", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/my/credits");
    await filter(page, "쓴 크레딧").click();
    await expect(page).toHaveURL("/my/credits?type=out");
    await expect(ledgerRows(page)).toHaveCount(1);
    await expect(ledgerRows(page).first()).toContainText("출금 지급");
    await expect(ledgerRows(page).first()).toContainText("-3,000 크레딧");
  });

  test("S355 모르는 필터는 전체로 본다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/my/credits?type=foo");
    await expect(filter(page, "전체")).toHaveAttribute("aria-current", "page");
    await expect(ledgerRows(page)).toHaveCount(12);
  });

  test("S356 내역이 없으면 안내한다", async ({ page, context }) => {
    await setDemo(context, { role: "admin" });
    await page.goto("/my/credits");
    await expect(region(page, "크레딧 내역").getByText("아직 크레딧 내역이 없어요")).toBeVisible();
  });

  test("S357 구독 결제는 쓴 크레딧이다", async ({ page, context }) => {
    await setDemo(context, { role: "developer" });
    await page.goto("/my/credits?type=out");
    await expect(ledgerRows(page)).toHaveCount(1);
    await expect(ledgerRows(page).first()).toContainText("구독 결제");
    await expect(ledgerRows(page).first()).toContainText("-2,000 크레딧");
  });
});

test.describe("R4 출금 내역", () => {
  test("S358 지급 완료와 반려 이유", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/my/credits/withdrawals");
    const rows = historyRows(page);
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText("3,000원");
    await expect(rows.nth(0)).toContainText("지급 완료");
    await expect(rows.nth(1)).toContainText("2,000원");
    await expect(rows.nth(1)).toContainText("반려");
    await expect(rows.nth(1)).toContainText("예금주 이름이 회원 정보와 달라요");
  });

  test("S359 처리 중", async ({ page, context }) => {
    await setDemo(context, { role: "developer" });
    await page.goto("/my/credits/withdrawals");
    await expect(historyRows(page).first()).toContainText("1,000원");
    await expect(historyRows(page).first()).toContainText("처리 중");
  });

  test("S360 출금 요청이 없으면 안내한다", async ({ page, context }) => {
    await setDemo(context, { role: "admin" });
    await page.goto("/my/credits/withdrawals");
    await expect(region(page, "출금 내역").getByText("아직 출금 요청이 없어요")).toBeVisible();
  });
});

test.describe("R4 출금 상태 표시", () => {
  for (const scheme of ["light", "dark"] as const) {
    test(`S370 ${scheme} 모드에서 상태는 14px 이상이고 대비가 4.5 이상이다`, async ({ page, context }) => {
      await setDemo(context, { role: "tester" });
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto("/my/credits/withdrawals");
      for (const label of ["지급 완료", "반려"]) {
        const status = historyRows(page).getByText(label, { exact: true });
        const { fontSize, ratio } = await status.evaluate((element) => {
          const style = getComputedStyle(element);
          const parse = (color: string) => color.match(/[\d.]+/g)!.slice(0, 3).map(Number);
          const luminance = (rgb: number[]) => {
            const [r, g, b] = rgb.map((value) => {
              const channel = value / 255;
              return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
            });
            return 0.2126 * r + 0.7152 * g + 0.0722 * b;
          };
          const [light, dark] = [luminance(parse(style.color)), luminance(parse(style.backgroundColor))].sort((x, y) => y - x);
          return { fontSize: parseFloat(style.fontSize), ratio: (light + 0.05) / (dark + 0.05) };
        });
        expect(fontSize, label).toBeGreaterThanOrEqual(14);
        expect(ratio, label).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});

test.describe("R5 출금 신청", () => {
  test.beforeEach(async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/my/credits/withdrawals");
  });

  async function fill(page: Page, { amount = "5000", bank = "토스뱅크", account = "100012345678", holder = "한서윤" } = {}) {
    await page.getByLabel("금액(크레딧)").fill(amount);
    await page.getByLabel("은행").selectOption(bank);
    await page.getByLabel("계좌번호").fill(account);
    await page.getByLabel("예금주").fill(holder);
  }

  test("S361 출금 가능 금액과 가입 크레딧 안내", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1, name: "출금" })).toBeVisible();
    const form = region(page, "출금 신청");
    await expect(form.getByText(/출금 가능\s*9,480 크레딧/)).toBeVisible();
    await expect(form.getByText(/가입 크레딧은 출금할 수 없어요/)).toBeVisible();
  });

  test("S371 입력·선택·전액 버튼 높이가 같다", async ({ page }) => {
    const heights = [];
    for (const label of ["금액(크레딧)", "은행", "계좌번호", "예금주"]) {
      heights.push((await page.getByLabel(label).boundingBox())!.height);
    }
    heights.push((await page.getByRole("button", { name: "전액" }).boundingBox())!.height);
    expect(new Set(heights).size).toBe(1);
  });

  test("S372 금액 폼은 12px 모서리, 폼 밖 버튼은 알약이다", async ({ page }) => {
    const radius = (locator: ReturnType<Page["getByRole"]>) => locator.evaluate((element) => getComputedStyle(element).borderRadius);
    for (const locator of [
      page.getByLabel("금액(크레딧)"),
      page.getByLabel("은행"),
      page.getByLabel("계좌번호"),
      page.getByLabel("예금주"),
      page.getByRole("button", { name: "전액" }),
      page.getByRole("button", { name: "출금 신청" }),
    ]) {
      expect(await radius(locator)).toBe("12px");
    }
    await page.goto("/my/credits");
    const outside = await radius(region(page, "잔액").getByRole("link", { name: "출금 신청" }));
    expect(parseFloat(outside)).toBeGreaterThan(1000);
  });

  test("S373 신청 버튼은 오른쪽 아래, 받을 금액은 버튼 옆이다", async ({ page }) => {
    const holder = (await page.getByLabel("예금주").boundingBox())!;
    const button = (await page.getByRole("button", { name: "출금 신청" }).boundingBox())!;
    const summary = (await page.getByText(/받을 금액/).boundingBox())!;
    expect(Math.abs(button.x + button.width - (holder.x + holder.width))).toBeLessThan(2);
    expect(button.y).toBeGreaterThan(holder.y + holder.height);
    expect(summary.x + summary.width).toBeLessThanOrEqual(button.x);
    expect(Math.abs(summary.y + summary.height / 2 - (button.y + button.height / 2))).toBeLessThan(8);
  });

  test("S374 좁은 화면에서는 신청 버튼이 칸 너비만큼 넓다", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const holder = (await page.getByLabel("예금주").boundingBox())!;
    const button = (await page.getByRole("button", { name: "출금 신청" }).boundingBox())!;
    const summary = (await page.getByText(/받을 금액/).boundingBox())!;
    expect(Math.abs(button.width - holder.width)).toBeLessThan(2);
    expect(summary.y).toBeLessThan(button.y);
  });

  for (const width of [1440, 375]) {
    test(`S375 ${width}px에서 펼친 은행 목록은 칸 바로 아래에 같은 너비로 붙는다`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      const select = page.getByLabel("은행");
      const field = (await select.boundingBox())!;
      await select.click();
      const first = page.getByRole("option", { name: "국민은행" });
      await expect(first).toBeVisible();
      const option = (await first.boundingBox())!;
      expect(option.x).toBeGreaterThanOrEqual(field.x);
      expect(option.x + option.width).toBeLessThanOrEqual(field.x + field.width);
      expect(field.width - option.width).toBeLessThan(16);
      expect(option.y).toBeGreaterThan(field.y + field.height);
      expect(option.y - (field.y + field.height)).toBeLessThan(16);
      await expect(page.getByRole("option", { name: "은행 선택" })).toBeHidden();
      await page.getByRole("option", { name: "토스뱅크" }).click();
      await expect(select).toHaveValue("토스뱅크");
    });
  }

  test("S362 전액", async ({ page }) => {
    await page.getByRole("button", { name: "전액" }).click();
    await expect(page.getByLabel("금액(크레딧)")).toHaveValue("9480");
    await expect(page.getByText(/받을 금액\s*9,480원/)).toBeVisible();
  });

  test("S363 신청하면 성공 메시지를 보여 주고 칸을 비운다", async ({ page }) => {
    await fill(page);
    await page.getByRole("button", { name: "출금 신청" }).click();
    await expect(page.getByRole("status")).toHaveText("5,000원 출금을 신청했어요. 운영자가 확인한 뒤 지급해요.");
    await expect(page.getByLabel("금액(크레딧)")).toHaveValue("");
    await expect(page.getByLabel("계좌번호")).toHaveValue("");
    await expect(page.getByLabel("예금주")).toHaveValue("");
  });

  test("S376 신청한 뒤 다시 신청해 실패해도 입력이 남는다", async ({ page }) => {
    await fill(page);
    await page.getByRole("button", { name: "출금 신청" }).click();
    await expect(page.getByRole("status")).toBeVisible();
    await fill(page, { amount: "10000" });
    await page.getByRole("button", { name: "출금 신청" }).click();
    await expect(page.getByText("출금 가능한 크레딧(4,480)보다 많아요")).toBeVisible();
    await expect(page.getByLabel("금액(크레딧)")).toHaveValue("10000");
    await expect(page.getByLabel("은행")).toHaveValue("토스뱅크");
    await expect(page.getByLabel("계좌번호")).toHaveValue("100012345678");
    await expect(page.getByLabel("예금주")).toHaveValue("한서윤");
  });

  test("S364 출금 가능 금액보다 많으면 알려 준다", async ({ page }) => {
    await fill(page, { amount: "10000" });
    await page.getByRole("button", { name: "출금 신청" }).click();
    await expect(page.getByText("출금 가능한 크레딧(9,480)보다 많아요")).toBeVisible();
    await expect(page.getByLabel("금액(크레딧)")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByLabel("예금주")).toHaveValue("한서윤");
  });

  test("S365 빈 칸과 잘못된 형식", async ({ page }) => {
    await page.getByRole("button", { name: "출금 신청" }).click();
    for (const message of ["금액을 입력해 주세요", "은행을 골라 주세요", "계좌번호를 입력해 주세요", "예금주를 입력해 주세요"]) {
      await expect(page.getByText(message)).toBeVisible();
    }
    await page.getByLabel("금액(크레딧)").fill("0");
    await page.getByLabel("계좌번호").fill("12-34");
    await page.getByRole("button", { name: "출금 신청" }).click();
    await expect(page.getByText("1 크레딧 이상 입력해 주세요")).toBeVisible();
    await expect(page.getByText("계좌번호는 숫자 10~14자리예요")).toBeVisible();
  });
});

test("S366 출금할 크레딧이 없으면 신청할 수 없다", async ({ page, context }) => {
  await setDemo(context, { role: "admin" });
  await page.goto("/my/credits/withdrawals");
  await expect(page.getByText("출금할 수 있는 크레딧이 없어요")).toBeVisible();
  await expect(page.getByRole("button", { name: "출금 신청" })).toBeDisabled();
});

test("S367 마이페이지 최근 내역은 크레딧 내역의 첫 5개와 같다", async ({ page, context }) => {
  await setDemo(context, { role: "tester" });
  await page.goto("/my/credits");
  await expect(ledgerRows(page)).toHaveCount(12);
  const full = (await ledgerRows(page).allInnerTexts()).slice(0, 5);
  await page.goto("/my");
  const recentRows = region(page, "최근 크레딧 내역").getByRole("listitem");
  await expect(recentRows).toHaveCount(5);
  expect(await recentRows.allInnerTexts()).toEqual(full);
});

test.describe("R7 신청 기록", () => {
  const PATH = "/my/credits/withdrawals";

  async function request(page: Page, amount: string) {
    await page.getByLabel("금액(크레딧)").fill(amount);
    await page.getByLabel("은행").selectOption("토스뱅크");
    await page.getByLabel("계좌번호").fill("100012345678");
    await page.getByLabel("예금주").fill("한서윤");
    await page.getByRole("button", { name: "출금 신청" }).click();
  }

  test.beforeEach(async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto(PATH);
    await request(page, "5000");
    await expect(page.getByRole("status")).toBeVisible();
  });

  test("S377 신청하면 출금 내역 맨 위에 처리 중으로 남는다", async ({ page }) => {
    const rows = historyRows(page);
    await expect(rows).toHaveCount(3);
    await expect(rows.first()).toContainText("5,000원");
    await expect(rows.first()).toContainText("처리 중");
    await expect(rows.first()).toContainText("토스뱅크 ****5678");
  });

  test("S378 출금 가능은 줄고 처리 중은 늘며 총 잔액은 그대로다", async ({ page }) => {
    await expect(region(page, "출금 신청").getByText(/출금 가능\s*4,480 크레딧/)).toBeVisible();

    await page.goto("/my/credits");
    await expect(region(page, "잔액").getByText("12,480 크레딧", { exact: true })).toBeVisible();
    await expect(balanceRow(page, "현금화 가능")).toContainText("4,480 크레딧");
    await expect(balanceRow(page, "출금 처리 중")).toContainText("5,000 크레딧");

    await page.goto("/my");
    const card = region(page, "크레딧");
    await expect(card.locator("dl > div").filter({ hasText: "현금화 가능" })).toContainText("4,480 크레딧");
    await expect(card.locator("dl > div").filter({ hasText: "출금 처리 중" })).toContainText("5,000 크레딧");
  });

  test("S379 새로고침해도 남는다", async ({ page }) => {
    await page.reload();
    await expect(historyRows(page)).toHaveCount(3);
    await expect(historyRows(page).first()).toContainText("5,000원");
  });

  test("S380 잠긴 만큼 이어서 신청할 수 없다", async ({ page }) => {
    await request(page, "5000");
    await expect(page.getByText("출금 가능한 크레딧(4,480)보다 많아요")).toBeVisible();
    await expect(historyRows(page)).toHaveCount(3);
  });

  test("S381 다른 브라우저와 다른 회원에게는 보이지 않는다", async ({ page, context, browser }) => {
    const other = await browser.newContext();
    await setDemo(other, { role: "tester" });
    const otherPage = await other.newPage();
    await otherPage.goto(PATH);
    await expect(historyRows(otherPage)).toHaveCount(2);
    await other.close();

    await setDemo(context, { role: "developer" });
    await page.goto(PATH);
    await expect(historyRows(page)).toHaveCount(1);
  });
});
