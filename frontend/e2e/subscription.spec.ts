import { expect, type Page, test } from "@playwright/test";
import { setDemo } from "./helpers";

const region = (page: Page, name: string) => page.getByRole("region", { name, exact: true });

const BENEFITS = [
  ["참여 확정 방식", "선착순 자동 확정", "지원자 중 직접 선정"],
  ["월간 모집 인원", "월 10명", "월 30명"],
  ["테스터 보상", "기본 보상", "기본 + 추가 보상"],
  ["1대1 채팅", "없음", "선정한 테스터와 가능"],
  ["모집 목록 노출", "일반 목록", "상단 구독 영역"],
];

/** 구독 결제에 쓸 수 있는 크레딧 줄. 상품 가격 줄과 구분하려고 카드 바로 아래 dl만 본다 */
const payableRow = (page: Page) => region(page, "결제 안내").locator(":scope > dl");

/** 구독 상품 한 개의 가격 줄 (dt 이름, dd 값) */
const priceRow = (page: Page, label: string) =>
  region(page, "결제 안내").getByRole("list", { name: "구독 상품" }).locator("dl > div").filter({ hasText: label });

/** 혜택 비교 표의 열 머리 (무료, 구독) */
const planHeader = (page: Page, name: string) =>
  region(page, "혜택 비교").getByRole("columnheader").filter({ hasText: name });

test.describe("R1 접근 제어", () => {
  test("S193 비로그인은 로그인으로 보낸다", async ({ page, context }) => {
    await setDemo(context, { role: "guest" });
    await page.goto("/my/subscription");
    await expect(page).toHaveURL("/login?next=%2Fmy%2Fsubscription");
  });

  test("S194 로그인하면 구독 화면이 열리고 메뉴의 현재 항목이다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    const response = await page.goto("/my/subscription");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: "구독" })).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "마이페이지 메뉴" }).getByRole("link", { name: "구독" }),
    ).toHaveAttribute("aria-current", "page");
  });
});

test.describe("R2 내 구독 상태", () => {
  test("S195 미구독", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/my/subscription");
    const status = region(page, "내 구독");
    await expect(status.getByText("구독하지 않았어요")).toBeVisible();
    await expect(status.getByText("구독 중")).toHaveCount(0);
    await expect(status.getByText(/만료/)).toHaveCount(0);
  });

  test("S196 구독 중이면 상품, 남은 기간, 만료일", async ({ page, context }) => {
    await setDemo(context, { role: "developer" });
    await page.goto("/my/subscription");
    const status = region(page, "내 구독");
    const expiresAt = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", timeZone: "Asia/Seoul" }).format(
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    );
    await expect(status.getByText("구독 중", { exact: true })).toBeVisible();
    const value = (label: string) => status.locator("dl > div").filter({ hasText: label }).locator("dd");
    await expect(value("이용 중인 상품")).toHaveText("구독");
    await expect(value("남은 기간")).toHaveText("D-30");
    await expect(value("만료일")).toHaveText(expiresAt);
  });

  test("S197 운영자는 구독 대상이 아니다", async ({ page, context }) => {
    await setDemo(context, { role: "admin" });
    await page.goto("/my/subscription");
    await expect(page.getByText("운영자 계정은 구독 대상이 아니에요")).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "마이페이지", exact: true })).toHaveAttribute("href", "/my");
    await expect(region(page, "혜택 비교")).toHaveCount(0);
    await expect(region(page, "결제 안내")).toHaveCount(0);
  });
});

/** 한국 시간 기준 다음 달 1일. "11월 1일" */
const nextMonthFirst = () => {
  const seoul = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return `${((seoul.getUTCMonth() + 1) % 12) + 1}월 1일`;
};

test.describe("R2 이번 달 모집 인원", () => {
  test("S210 구독 중이면 구독 한도로 남은 인원을 보여 준다", async ({ page, context }) => {
    await setDemo(context, { role: "developer" });
    await page.goto("/my/subscription");
    const status = region(page, "내 구독");
    const meter = status.getByRole("meter", { name: "이번 달 모집 인원" });
    await expect(status.getByText("18명 남음")).toBeVisible();
    await expect(meter).toHaveAttribute("aria-valuenow", "12");
    await expect(meter).toHaveAttribute("aria-valuemax", "30");
    await expect(status.getByText("12 / 30명")).toBeVisible();
    await expect(status.getByText(`${nextMonthFirst()}에 다시 채워져요`)).toBeVisible();
  });

  test("S211 무료면 무료 한도와 구독 한도를 보여 준다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/my/subscription");
    const status = region(page, "내 구독");
    await expect(status.getByText("10명 남음")).toBeVisible();
    await expect(status.getByText("0 / 10명")).toBeVisible();
    await expect(status.getByText("구독하면 월 30명까지 모집할 수 있어요")).toBeVisible();
  });
});

test.describe("R3 혜택 비교", () => {
  test("S198 비교표의 열과 행", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/my/subscription");
    const table = region(page, "혜택 비교").getByRole("table");
    await expect(planHeader(page, "무료")).toBeVisible();
    await expect(planHeader(page, "구독")).toBeVisible();
    const rows = table.locator("tbody tr");
    await expect(rows).toHaveCount(BENEFITS.length);
    for (const [index, cells] of BENEFITS.entries()) {
      await expect(rows.nth(index).locator("th, td")).toHaveText(cells);
    }
    await expect(planHeader(page, "무료")).toContainText("지금 이용 중");
    await expect(planHeader(page, "무료")).toContainText("0원");
    await expect(planHeader(page, "구독")).toContainText("30일 10,000원");
  });

  test("S199 구독 중이면 구독 열에 표시한다", async ({ page, context }) => {
    await setDemo(context, { role: "developer" });
    await page.goto("/my/subscription");
    await expect(planHeader(page, "구독")).toContainText("지금 이용 중");
    await expect(planHeader(page, "무료")).not.toContainText("지금 이용 중");
  });

});

test.describe("R4 결제 안내", () => {
  test("S201 상품 가격과 쓸 수 있는 크레딧", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/my/subscription");
    const payment = region(page, "결제 안내");
    const plan = payment.getByRole("list", { name: "구독 상품" }).getByRole("listitem");
    await expect(plan.getByRole("heading", { name: "구독" })).toBeVisible();
    await expect(plan.getByText("30일")).toBeVisible();
    await expect(priceRow(page, "현금")).toHaveText("현금10,000원");
    await expect(priceRow(page, "크레딧")).toHaveText("크레딧9,000 크레딧");
    await expect(payableRow(page)).toHaveText("구독 결제에 쓸 수 있는 크레딧12,480 크레딧");
    await expect(payment.getByText("가입 크레딧도 구독 결제에 쓸 수 있어요")).toBeVisible();
    await expect(payment.getByText("크레딧으로 결제하면 현금보다 우대 가격이 적용돼요")).toBeVisible();
    await expect(payment.getByRole("link", { name: "구독하기", exact: true })).toHaveAttribute("href", "/my/subscription/checkout");
  });

  test("S202 출금 처리 중인 크레딧은 빼고 보여 준다", async ({ page, context }) => {
    await setDemo(context, { role: "developer" });
    await page.goto("/my/subscription");
    const payment = region(page, "결제 안내");
    await expect(payableRow(page)).toHaveText("구독 결제에 쓸 수 있는 크레딧2,260 크레딧");
    await expect(payment.getByRole("link", { name: "크레딧 내역" })).toHaveAttribute("href", "/my/credits");
  });

  test("S209 상품 목록대로 결제 안내와 비교표 열이 생긴다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/my/subscription");
    await expect(region(page, "결제 안내").getByRole("list", { name: "구독 상품" }).getByRole("listitem")).toHaveCount(1);
    await expect(region(page, "혜택 비교").getByRole("columnheader")).toHaveCount(3);
    await expect(region(page, "혜택 비교").locator("thead th")).toContainText(["혜택", "무료", "구독"]);
  });
});

test.describe("R5 만료 뒤 바뀌는 점", () => {
  test("S203 구독 중이면 남는 것과 멈추는 것을 보여 준다", async ({ page, context }) => {
    await setDemo(context, { role: "developer" });
    await page.goto("/my/subscription");
    const expiry = region(page, "만료되면");
    await expect(expiry.getByRole("list", { name: "그대로 남아요" }).getByRole("listitem")).toHaveText([
      "받은 피드백과 채팅 기록 보기",
      "이미 참여가 확정된 테스터의 보상",
      "모집 글 등록과 지원 현황 확인",
    ]);
    await expect(expiry.getByRole("list", { name: "멈춰요" }).getByRole("listitem")).toHaveText([
      "새 테스터 직접 선정",
      "채팅 메시지 보내기",
      "상단 구독 영역 노출",
      "분석",
    ]);
  });

  test("S204 미구독이면 만료 안내가 없다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/my/subscription");
    await expect(region(page, "내 구독")).toBeVisible();
    await expect(region(page, "만료되면")).toHaveCount(0);
  });
});

test.describe("R6 로딩과 화면", () => {
  test("S205 느린 응답이면 제목과 스켈레톤이 먼저 보인다", async ({ page, context }) => {
    await setDemo(context, { role: "tester", data: "slow" });
    await page.goto("/my/subscription", { waitUntil: "commit" });
    await expect(page.getByRole("heading", { level: 1, name: "구독" })).toBeVisible();
    await expect(page.locator('[aria-busy="true"]')).toBeVisible();
    await expect(region(page, "내 구독")).toBeVisible();
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  });

  test("S206 모바일에서 가로 스크롤 없이 표가 보인다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/my/subscription");
    const rows = region(page, "혜택 비교").locator("tbody tr");
    await expect(rows).toHaveCount(BENEFITS.length);
    for (let index = 0; index < BENEFITS.length; index++) await expect(rows.nth(index)).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
