import { expect, type Page, test } from "@playwright/test";
import { setDemo } from "./helpers";

const region = (page: Page, name: string) => page.getByRole("region", { name, exact: true });

/** 크레딧 카드의 항목 한 줄 (dt 이름, dd 값) */
const creditRow = (page: Page, label: string) => region(page, "크레딧").locator("dl > div").filter({ hasText: label });

const ACCOUNT_LINKS = [
  ["홈", "/my"],
  ["개인정보 수정", "/my/profile/edit"],
  ["크레딧", "/my/credits"],
  ["출금", "/my/credits/withdrawals"],
  ["구독", "/my/subscription"],
] as const;

test.describe("R1 접근 제어", () => {
  test("S83 비로그인은 로그인으로 보낸다", async ({ page, context }) => {
    await setDemo(context, { role: "guest" });
    await page.goto("/my");
    await expect(page).toHaveURL("/login?next=%2Fmy");
  });

  test("S84 로그인하면 마이페이지가 열리고 현재 탭이다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    const response = await page.goto("/my");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: "마이페이지" })).toBeVisible();
    /* 마이페이지는 탭이 아니라 헤더 오른쪽에 있다 (docs/2026-11-01-frontend-header.md S320) */
    await expect(page.getByRole("banner").getByRole("link", { name: "마이페이지" })).toHaveAttribute("aria-current", "page");
  });
});

test.describe("R2 마이페이지 메뉴", () => {
  test("S95 메뉴 5개와 현재 페이지", async ({ page }) => {
    await page.goto("/my");
    const links = page.getByRole("navigation", { name: "마이페이지 메뉴" }).getByRole("link");
    await expect(links).toHaveCount(5);
    for (const [index, [label, href]] of ACCOUNT_LINKS.entries()) {
      await expect(links.nth(index)).toHaveText(label);
      await expect(links.nth(index)).toHaveAttribute("href", href);
    }
    await expect(links.nth(0)).toHaveAttribute("aria-current", "page");
  });

  test("S96 가장 길게 일치하는 항목만 현재 페이지다", async ({ page }) => {
    await page.goto("/my/credits/withdrawals");
    const nav = page.getByRole("navigation", { name: "마이페이지 메뉴" });
    await expect(nav.getByRole("link", { name: "출금" })).toHaveAttribute("aria-current", "page");
    await expect(nav.getByRole("link", { name: "크레딧", exact: true })).not.toHaveAttribute("aria-current", "page");
  });

  test("S97 참여 테스트에는 메뉴가 없다", async ({ page }) => {
    await page.goto("/my/participations");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "마이페이지 메뉴" })).toHaveCount(0);
  });

  test("S108 좁은 화면에서는 본문 위 가로 메뉴다", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/my");
    const nav = page.getByRole("navigation", { name: "마이페이지 메뉴" });
    await expect(nav.getByRole("link")).toHaveCount(5);
    const navBox = await nav.boundingBox();
    const headingBox = await page.getByRole("heading", { level: 1, name: "마이페이지" }).boundingBox();
    expect(navBox!.y).toBeLessThan(headingBox!.y);
  });
});

test.describe("R3 프로필", () => {
  test("S85 이름·닉네임·이메일과 개인정보 수정, 회원 유형은 없다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/my");
    const profile = region(page, "내 정보");
    for (const [label, value] of [
      ["이름", "한서윤"],
      ["닉네임", "윤슬"],
      ["이메일", "seoyun@example.com"],
    ]) {
      await expect(profile.locator("dl > div").filter({ hasText: label })).toContainText(value);
    }
    await expect(profile.getByRole("link", { name: "개인정보 수정" })).toHaveAttribute("href", "/my/profile/edit");
    await expect(page.getByRole("main").getByText(/^(테스터|개발자)$/)).toHaveCount(0);
  });
});

test.describe("R4 지금 할 일", () => {
  test("S100 테스트 참여 할 일을 마감이 가까운 순서로", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/my");
    const todos = region(page, "지금 할 일");
    const items = todos.getByRole("region", { name: "테스트 참여" }).getByRole("link");
    await expect(items).toHaveCount(2);
    await expect(items.nth(0)).toContainText("북로그 피드백 제출");
    await expect(items.nth(0)).toContainText("D-2");
    await expect(items.nth(0)).toHaveAttribute("href", "/my/participations?tab=ongoing");
    await expect(items.nth(1)).toContainText("모아플랜 참여 확정, 테스트 시작하기");
    await expect(items.nth(1)).toContainText("D-9");
    await expect(todos).not.toContainText("크레딧");
  });

  test("S101 내 프로젝트 할 일", async ({ page, context }) => {
    await setDemo(context, { role: "developer" });
    await page.goto("/my");
    const items = region(page, "지금 할 일").getByRole("region", { name: "내 프로젝트" }).getByRole("link");
    await expect(items).toHaveCount(2);
    await expect(items.nth(0)).toContainText("가계부 노트 지원자 선정");
    await expect(items.nth(0)).toContainText("D-3");
    await expect(items.nth(1)).toContainText("회의록 정리 새 피드백 확인");
    await expect(items.nth(1)).toContainText("3건");
    await expect(items.nth(1)).toHaveAttribute("href", "/my/projects");
  });

  test("S102 할 일이 없는 묶음도 보인다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/my");
    const project = region(page, "지금 할 일").getByRole("region", { name: "내 프로젝트" });
    await expect(project.getByText("지금 할 프로젝트 일이 없어요")).toBeVisible();
    await expect(project.getByRole("link", { name: "내 프로젝트" })).toHaveAttribute("href", "/my/projects");
  });

  test("S112 둘 다 없으면 두 묶음 모두 안내한다", async ({ page, context }) => {
    await setDemo(context, { role: "admin" });
    await page.goto("/my");
    const todos = region(page, "지금 할 일");
    const participation = todos.getByRole("region", { name: "테스트 참여" });
    await expect(participation.getByText("지금 할 테스트가 없어요")).toBeVisible();
    await expect(participation.getByRole("link", { name: "테스트 둘러보기" })).toHaveAttribute("href", "/recruitments");
    await expect(todos.getByRole("region", { name: "내 프로젝트" }).getByText("지금 할 프로젝트 일이 없어요")).toBeVisible();
  });
});

test.describe("R5 크레딧", () => {
  test("S86 총 잔액과 구성, 내역·출금 링크", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/my");
    const credits = region(page, "크레딧");
    await expect(credits.getByText("12,480 크레딧", { exact: true })).toBeVisible();
    await expect(creditRow(page, "적립 크레딧")).toContainText("9,480 크레딧");
    await expect(creditRow(page, "이벤트 크레딧")).toContainText("3,000 크레딧");
    await expect(creditRow(page, "출금 처리 중")).toContainText("0 크레딧");
    await expect(credits.getByRole("link", { name: "크레딧 내역" })).toHaveAttribute("href", "/my/credits");
    await expect(credits.getByRole("link", { name: "출금 신청" })).toHaveAttribute("href", "/my/credits/withdrawals");
  });

  test("S103 승인 대기 보상은 잔액과 따로 보여 준다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/my");
    const credits = region(page, "크레딧");
    await expect(credits.getByText(/승인 대기\s*1,350 크레딧/)).toBeVisible();
    await expect(credits.getByText("12,480 크레딧", { exact: true })).toBeVisible();
  });

  test("S87 출금 처리 중인 크레딧", async ({ page, context }) => {
    await setDemo(context, { role: "developer" });
    await page.goto("/my");
    await expect(region(page, "크레딧").getByText("3,260 크레딧", { exact: true })).toBeVisible();
    await expect(creditRow(page, "출금 처리 중")).toContainText("1,000 크레딧");
  });

  test("S88 출금할 크레딧이 없으면 출금 신청이 없다", async ({ page, context }) => {
    await setDemo(context, { role: "admin" });
    await page.goto("/my");
    const credits = region(page, "크레딧");
    await expect(credits.getByText("0 크레딧").first()).toBeVisible();
    await expect(credits.getByRole("link", { name: "출금 신청" })).toHaveCount(0);
  });
});

test.describe("R6 구독", () => {
  test("S89 미구독", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/my");
    const subscription = region(page, "구독");
    await expect(subscription.getByText("구독하지 않았어요")).toBeVisible();
    await expect(subscription.getByRole("link", { name: "구독 알아보기" })).toHaveAttribute("href", "/my/subscription");
  });

  test("S90 구독 중이면 만료일", async ({ page, context }) => {
    await setDemo(context, { role: "developer" });
    await page.goto("/my");
    const subscription = region(page, "구독");
    await expect(subscription.getByText("구독 중")).toBeVisible();
    await expect(subscription.getByText(/\d+월 \d+일 만료/)).toBeVisible();
    await expect(subscription.getByRole("link", { name: "구독 관리" })).toHaveAttribute("href", "/my/subscription");
  });

  test("S91 운영자는 구독 카드가 없다", async ({ page, context }) => {
    await setDemo(context, { role: "admin" });
    await page.goto("/my");
    await expect(region(page, "크레딧")).toBeVisible();
    await expect(region(page, "구독")).toHaveCount(0);
  });
});

test.describe("R7 활동 요약", () => {
  test("S104 테스트 참여 숫자는 참여 테스트 탭으로 간다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/my");
    const activity = region(page, "활동 요약");
    await expect(activity.getByRole("link", { name: "지원 2" })).toHaveAttribute("href", "/my/participations?tab=applied");
    await expect(activity.getByRole("link", { name: "참여 중 1" })).toHaveAttribute("href", "/my/participations?tab=ongoing");
    await expect(activity.getByRole("link", { name: "완료 5" })).toHaveAttribute("href", "/my/participations?tab=history");
  });

  test("S105 프로젝트가 없으면 안내한다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/my");
    const activity = region(page, "활동 요약");
    await expect(activity.getByText("아직 등록한 프로젝트가 없어요")).toBeVisible();
    await expect(activity.getByRole("link", { name: "내 프로젝트" })).toHaveAttribute("href", "/my/projects");
  });

  test("S109 프로젝트 숫자", async ({ page, context }) => {
    await setDemo(context, { role: "developer" });
    await page.goto("/my");
    const activity = region(page, "활동 요약");
    for (const name of ["프로젝트 2", "모집 중 1", "새 피드백 3"]) {
      await expect(activity.getByRole("link", { name })).toHaveAttribute("href", "/my/projects");
    }
  });

  test("S110 운영자는 활동 요약이 없다", async ({ page, context }) => {
    await setDemo(context, { role: "admin" });
    await page.goto("/my");
    await expect(region(page, "크레딧")).toBeVisible();
    await expect(region(page, "활동 요약")).toHaveCount(0);
  });
});

test.describe("R8 최근 크레딧 내역", () => {
  test("S106 최근 5건을 최신순으로", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/my");
    const recent = region(page, "최근 크레딧 내역");
    const rows = recent.getByRole("listitem");
    await expect(rows).toHaveCount(5);
    await expect(rows.first()).toContainText("레시피핏 테스트 보상");
    await expect(rows.first()).toContainText("+1,260 크레딧");
    await expect(recent.getByRole("link", { name: "전체 보기" })).toHaveAttribute("href", "/my/credits");
  });

  test("S107 내역이 없으면 안내한다", async ({ page, context }) => {
    await setDemo(context, { role: "admin" });
    await page.goto("/my");
    await expect(region(page, "최근 크레딧 내역").getByText("아직 크레딧 내역이 없어요")).toBeVisible();
  });
});

test.describe("R11 섹션 순서", () => {
  test("S111 지금 할 일 → 활동 요약 → 크레딧 순서다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/my");
    const top = async (name: string) => (await region(page, name).boundingBox())!.y;
    expect(await top("지금 할 일")).toBeLessThan(await top("활동 요약"));
    expect(await top("활동 요약")).toBeLessThan(await top("크레딧"));
  });
});

test.describe("R12 카드 머리말", () => {
  test("S113 크레딧·구독 버튼은 제목과 같은 줄에 있다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/my");
    for (const [name, link] of [
      ["크레딧", "크레딧 내역"],
      ["구독", "구독 알아보기"],
    ]) {
      const card = region(page, name);
      const heading = (await card.getByRole("heading", { level: 2 }).boundingBox())!;
      const button = (await card.getByRole("link", { name: link }).boundingBox())!;
      expect(Math.abs(heading.y + heading.height / 2 - (button.y + button.height / 2))).toBeLessThan(8);
    }
  });
});

test.describe("R9 로딩", () => {
  test("S92 메뉴와 제목은 바로, 대시보드는 스켈레톤 먼저", async ({ page, context }) => {
    await setDemo(context, { role: "tester", data: "slow" });
    await page.goto("/my", { waitUntil: "commit" });
    await expect(page.getByRole("heading", { level: 1, name: "마이페이지" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "마이페이지 메뉴" })).toBeVisible();
    const skeleton = page.getByLabel("마이페이지 불러오는 중");
    await expect(skeleton).toBeVisible();
    await expect(region(page, "지금 할 일")).toBeVisible();
    await expect(skeleton).toHaveCount(0);
  });
});
