import { expect, type Locator, type Page, test } from "@playwright/test";
import { setDemo } from "./helpers";

/*
 * 같은 준비(역할·페이지)를 쓰는 시나리오는 테스트 하나로 묶는다. 테스트 이름에 묶은 시나리오 번호를 모두 적는다.
 * 실패하면 expect 메시지나 줄 번호로 어느 시나리오인지 찾는다.
 */

const region = (page: Page, name: string) => page.getByRole("region", { name, exact: true });
/* 날짜 묶음마다 목록이 하나씩 있고, 목록 이름은 그 날짜 소제목이다 */
const dayRows = (section: Locator) => section.locator("ul[aria-labelledby] > li");
const ledgerRows = (page: Page) => dayRows(region(page, "크레딧 내역"));
const historyRows = (page: Page) => dayRows(region(page, "출금 내역"));
const balanceRow = (page: Page, label: string) => region(page, "잔액").locator("dl > div").filter({ hasText: label });
const filter = (page: Page, name: string) => page.getByRole("navigation", { name: "내역 필터" }).getByRole("link", { name });

const DAY_HEADING = /^(오늘|어제|\d{1,2}월 \d{1,2}일)$/;
const CLOCK = /^오[전후] \d{1,2}:\d{2}$/;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

/** 날짜는 묶음 소제목(오늘·어제·날짜)에, 각 행에는 시각만 있다 */
async function expectDayGroups(section: Locator, rowCount: number) {
  const rows = dayRows(section);
  await expect(rows).toHaveCount(rowCount);
  for (let index = 0; index < rowCount; index++) {
    const time = rows.nth(index).locator("time");
    await expect(time).toHaveText(CLOCK);
    await expect(time).toHaveAttribute("datetime", ISO);
  }
  const lists = section.locator("ul[aria-labelledby]");
  const headings = section.getByRole("heading", { level: 3 });
  await expect(headings).toHaveCount(await lists.count());
  for (const heading of await headings.all()) await expect(heading).toHaveText(DAY_HEADING);
  await expect(lists.first()).toHaveAccessibleName(DAY_HEADING);
}

async function fill(page: Page, { amount = "5000", bank = "토스뱅크", account = "100012345678", holder = "한서윤" } = {}) {
  await page.getByLabel("금액(크레딧)").fill(amount);
  await page.getByLabel("은행").selectOption(bank);
  await page.getByLabel("계좌번호").fill(account);
  await page.getByLabel("예금주").fill(holder);
}

async function request(page: Page, amount = "5000") {
  await fill(page, { amount });
  await page.getByRole("button", { name: "출금 신청" }).click();
}

test("S348·S349 비로그인은 크레딧 관리와 출금에서 로그인으로 간다", async ({ page, context }) => {
  await setDemo(context, { role: "guest" });
  await page.goto("/my/credits");
  await expect(page).toHaveURL("/login?next=%2Fmy%2Fcredits");
  await page.goto("/my/credits/withdrawals");
  await expect(page).toHaveURL("/login?next=%2Fmy%2Fcredits%2Fwithdrawals");
});

test.describe("tester 크레딧 관리", () => {
  test.beforeEach(async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/my/credits");
  });

  test("S350 총 잔액과 구성, 승인 대기", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1, name: "크레딧" })).toBeVisible();
    const balance = region(page, "잔액");
    await expect(balance.getByText("12,480 크레딧", { exact: true })).toBeVisible();
    await expect(balanceRow(page, "적립 크레딧")).toContainText("9,480 크레딧");
    await expect(balanceRow(page, "이벤트 크레딧")).toContainText("3,000 크레딧");
    await expect(balanceRow(page, "출금 처리 중")).toContainText("0 크레딧");
    await expect(balance.getByText(/승인 대기\s*1,350 크레딧/)).toBeVisible();
    await expect(balance.getByRole("link", { name: "출금 신청" })).toHaveAttribute("href", "/my/credits/withdrawals");
    await expect(balance.getByRole("link", { name: "크레딧 내역" })).toHaveCount(0);
  });

  test("S352~S355 전체 내역과 받은·쓴·모르는 필터", async ({ page }) => {
    const rows = ledgerRows(page);
    await expect(rows).toHaveCount(12);
    await expect(rows.first()).toContainText("레시피핏 테스트 보상");
    await expect(rows.first()).toContainText("+1,260 크레딧");
    await expect(rows.last()).toContainText("가입 크레딧");
    await expect(rows.last()).toContainText("+3,000 크레딧");
    await expect(filter(page, "전체")).toHaveAttribute("aria-current", "page");

    await filter(page, "받은 크레딧").click();
    await expect(page).toHaveURL("/my/credits?type=in");
    await expect(rows).toHaveCount(11);
    await expect(filter(page, "받은 크레딧")).toHaveAttribute("aria-current", "page");

    await filter(page, "쓴 크레딧").click();
    await expect(page).toHaveURL("/my/credits?type=out");
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("출금 지급");
    await expect(rows.first()).toContainText("-3,000 크레딧");

    await page.goto("/my/credits?type=foo");
    await expect(filter(page, "전체")).toHaveAttribute("aria-current", "page");
    await expect(rows).toHaveCount(12);
  });

  test("S544·S548 날짜별 묶음과 시각, 좁은 화면에서도 이름이 다 보인다", async ({ page }) => {
    await expectDayGroups(region(page, "크레딧 내역"), 12);
    await expect(region(page, "크레딧 내역").getByRole("heading", { level: 3 }).first()).toHaveText("어제");

    await page.setViewportSize({ width: 375, height: 800 });
    const label = ledgerRows(page).first().getByText("레시피핏 테스트 보상", { exact: true });
    expect(await label.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  });

  test("S367·S545 마이페이지 최근 내역은 크레딧 내역의 첫 5개와 같고 모양도 같다", async ({ page }) => {
    await expect(ledgerRows(page)).toHaveCount(12);
    const full = (await ledgerRows(page).allInnerTexts()).slice(0, 5);
    await page.goto("/my");
    const recent = region(page, "최근 크레딧 내역");
    await expectDayGroups(recent, 5);
    expect(await dayRows(recent).allInnerTexts()).toEqual(full);
  });
});

test("S351·S356·S360·S366 내역과 출금할 크레딧이 없으면 안내하고 신청할 수 없다", async ({ page, context }) => {
  await setDemo(context, { role: "admin" });
  await page.goto("/my/credits");
  await expect(region(page, "크레딧 내역").getByText("아직 크레딧 내역이 없어요")).toBeVisible();
  const balance = region(page, "잔액");
  await expect(balance.getByText("0 크레딧").first()).toBeVisible();
  await expect(balance.getByRole("link", { name: "출금 신청" }), "S351").toHaveCount(0);

  await page.goto("/my/credits/withdrawals");
  await expect(region(page, "출금 내역").getByText("아직 출금 요청이 없어요")).toBeVisible();
  await expect(page.getByText("출금할 수 있는 크레딧이 없어요")).toBeVisible();
  await expect(page.getByRole("button", { name: "출금 신청" })).toBeDisabled();
});

test("S357·S359 developer의 구독 결제는 쓴 크레딧이고 출금은 처리 중이다", async ({ page, context }) => {
  await setDemo(context, { role: "developer" });
  await page.goto("/my/credits?type=out");
  await expect(ledgerRows(page)).toHaveCount(1);
  await expect(ledgerRows(page).first()).toContainText("구독 결제");
  await expect(ledgerRows(page).first()).toContainText("-2,000 크레딧");

  await page.goto("/my/credits/withdrawals");
  await expect(historyRows(page).first()).toContainText("1,000원");
  await expect(historyRows(page).first()).toContainText("처리 중");
});

test.describe("tester 출금", () => {
  test.beforeEach(async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/my/credits/withdrawals");
  });

  test("S358·S546 출금 내역은 날짜별로 묶이고 반려는 이유를 보여 준다", async ({ page }) => {
    await expectDayGroups(region(page, "출금 내역"), 2);
    const rows = historyRows(page);
    await expect(rows.nth(0)).toContainText("3,000원");
    await expect(rows.nth(0)).toContainText("지급 완료");
    await expect(rows.nth(1)).toContainText("2,000원");
    await expect(rows.nth(1)).toContainText("반려");
    await expect(rows.nth(1)).toContainText("예금주 이름이 회원 정보와 달라요");
  });

  test("S370 라이트·다크 모두 상태는 14px 이상이고 대비가 4.5 이상이다", async ({ page }) => {
    for (const scheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: scheme });
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
        expect(fontSize, `${scheme} ${label}`).toBeGreaterThanOrEqual(14);
        expect(ratio, `${scheme} ${label}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  test("S361·S362 출금 가능 금액, 이벤트 크레딧 안내, 전액", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1, name: "출금" })).toBeVisible();
    const form = region(page, "출금 신청");
    await expect(form.getByText(/출금 가능\s*9,480 크레딧/)).toBeVisible();
    await expect(form.getByText(/이벤트 크레딧은 출금할 수 없어요/)).toBeVisible();
    await page.getByRole("button", { name: "전액" }).click();
    await expect(page.getByLabel("금액(크레딧)")).toHaveValue("9480");
    await expect(page.getByText(/받을 금액\s*9,480원/)).toBeVisible();
  });

  test("S371~S373 칸 높이와 모서리, 신청 버튼 위치", async ({ page }) => {
    const fields = [page.getByLabel("금액(크레딧)"), page.getByLabel("은행"), page.getByLabel("계좌번호"), page.getByLabel("예금주")];
    const allButton = page.getByRole("button", { name: "전액" });
    const submit = page.getByRole("button", { name: "출금 신청" });

    const heights = await Promise.all([...fields, allButton].map(async (locator) => (await locator.boundingBox())!.height));
    expect(new Set(heights).size, "S371").toBe(1);

    const radius = (locator: Locator) => locator.evaluate((element) => getComputedStyle(element).borderRadius);
    for (const locator of [...fields, allButton, submit]) expect(await radius(locator), "S372").toBe("12px");

    const holder = (await fields[3].boundingBox())!;
    const button = (await submit.boundingBox())!;
    const summary = (await page.getByText(/받을 금액/).boundingBox())!;
    expect(Math.abs(button.x + button.width - (holder.x + holder.width)), "S373").toBeLessThan(2);
    expect(button.y, "S373").toBeGreaterThan(holder.y + holder.height);
    expect(summary.x + summary.width, "S373").toBeLessThanOrEqual(button.x);
    expect(Math.abs(summary.y + summary.height / 2 - (button.y + button.height / 2)), "S373").toBeLessThan(8);

    await page.goto("/my/credits");
    const outside = await radius(region(page, "잔액").getByRole("link", { name: "출금 신청" }));
    expect(parseFloat(outside), "S372 폼 밖 버튼은 알약").toBeGreaterThan(1000);
  });

  test("S374·S375 좁은 화면 신청 버튼, 펼친 은행 목록", async ({ page }) => {
    const select = page.getByLabel("은행");
    for (const width of [1440, 375]) {
      await page.setViewportSize({ width, height: 1000 });
      const field = (await select.boundingBox())!;
      await select.click();
      const first = page.getByRole("option", { name: "국민은행" });
      await expect(first).toBeVisible();
      const option = (await first.boundingBox())!;
      expect(option.x, `S375 ${width}`).toBeGreaterThanOrEqual(field.x);
      expect(option.x + option.width, `S375 ${width}`).toBeLessThanOrEqual(field.x + field.width);
      expect(field.width - option.width, `S375 ${width}`).toBeLessThan(16);
      expect(option.y - (field.y + field.height), `S375 ${width}`).toBeGreaterThan(0);
      expect(option.y - (field.y + field.height), `S375 ${width}`).toBeLessThan(16);
      await expect(page.getByRole("option", { name: "은행 선택" })).toBeHidden();
      await page.getByRole("option", { name: "토스뱅크" }).click();
      await expect(select).toHaveValue("토스뱅크");
    }

    const holder = (await page.getByLabel("예금주").boundingBox())!;
    const button = (await page.getByRole("button", { name: "출금 신청" }).boundingBox())!;
    const summary = (await page.getByText(/받을 금액/).boundingBox())!;
    expect(Math.abs(button.width - holder.width), "S374").toBeLessThan(2);
    expect(summary.y, "S374").toBeLessThan(button.y);
  });

  test("S364·S365 금액 초과, 빈 칸, 잘못된 형식", async ({ page }) => {
    await page.getByRole("button", { name: "출금 신청" }).click();
    for (const message of ["금액을 입력해 주세요", "은행을 골라 주세요", "계좌번호를 입력해 주세요", "예금주를 입력해 주세요"]) {
      await expect(page.getByText(message)).toBeVisible();
    }
    await page.getByLabel("금액(크레딧)").fill("0");
    await page.getByLabel("계좌번호").fill("12-34");
    await page.getByRole("button", { name: "출금 신청" }).click();
    await expect(page.getByText("1 크레딧 이상 입력해 주세요")).toBeVisible();
    await expect(page.getByText("계좌번호는 숫자 10~14자리예요")).toBeVisible();

    await request(page, "10000");
    await expect(page.getByText("출금 가능한 크레딧(9,480)보다 많아요")).toBeVisible();
    await expect(page.getByLabel("금액(크레딧)")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByLabel("예금주")).toHaveValue("한서윤");
  });

  test("S363·S376·S377·S379·S380·S547 신청하면 오늘 묶음 맨 위에 남고, 이어서 넘치게 신청하면 입력이 남는다", async ({ page }) => {
    await request(page);
    await expect(page.getByRole("status")).toHaveText("5,000원 출금을 신청했어요. 운영자가 확인한 뒤 지급해요.");
    for (const label of ["금액(크레딧)", "계좌번호", "예금주"]) await expect(page.getByLabel(label), "S363").toHaveValue("");

    const rows = historyRows(page);
    await expectDayGroups(region(page, "출금 내역"), 3);
    await expect(region(page, "출금 내역").getByRole("heading", { level: 3 }).first(), "S547").toHaveText("오늘");
    await expect(rows.first(), "S377").toContainText("5,000원");
    await expect(rows.first(), "S377").toContainText("처리 중");
    await expect(rows.first(), "S377").toContainText("토스뱅크 ****5678");

    await request(page, "10000");
    await expect(page.getByText("출금 가능한 크레딧(4,480)보다 많아요"), "S380").toBeVisible();
    await expect(rows, "S380").toHaveCount(3);
    await expect(page.getByLabel("금액(크레딧)"), "S376").toHaveValue("10000");
    await expect(page.getByLabel("은행"), "S376").toHaveValue("토스뱅크");
    await expect(page.getByLabel("계좌번호"), "S376").toHaveValue("100012345678");
    await expect(page.getByLabel("예금주"), "S376").toHaveValue("한서윤");

    await page.reload();
    await expect(rows, "S379").toHaveCount(3);
    await expect(rows.first(), "S379").toContainText("5,000원");
  });

  test("S378·S381 신청은 잔액에 반영되고 다른 브라우저와 다른 회원에게는 보이지 않는다", async ({ page, context, browser }) => {
    await request(page);
    await expect(page.getByRole("status")).toBeVisible();
    await expect(region(page, "출금 신청").getByText(/출금 가능\s*4,480 크레딧/)).toBeVisible();

    await page.goto("/my/credits");
    await expect(region(page, "잔액").getByText("12,480 크레딧", { exact: true })).toBeVisible();
    await expect(balanceRow(page, "적립 크레딧")).toContainText("4,480 크레딧");
    await expect(balanceRow(page, "출금 처리 중")).toContainText("5,000 크레딧");

    await page.goto("/my");
    const card = region(page, "크레딧");
    await expect(card.locator("dl > div").filter({ hasText: "적립 크레딧" })).toContainText("4,480 크레딧");
    await expect(card.locator("dl > div").filter({ hasText: "출금 처리 중" })).toContainText("5,000 크레딧");

    const other = await browser.newContext();
    await setDemo(other, { role: "tester" });
    const otherPage = await other.newPage();
    await otherPage.goto("/my/credits/withdrawals");
    await expect(historyRows(otherPage), "S381 다른 브라우저").toHaveCount(2);
    await other.close();

    await setDemo(context, { role: "developer" });
    await page.goto("/my/credits/withdrawals");
    await expect(historyRows(page), "S381 다른 회원").toHaveCount(1);
  });
});
