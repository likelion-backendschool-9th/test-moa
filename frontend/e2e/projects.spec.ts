import { expect, test } from "@playwright/test";
import { expectLoginRedirect, setDemo } from "./helpers";

/* docs/frontend-projects.md의 R101~R110 시나리오. S번호는 문서와 1:1로 맞춘다 */

const BOOKLOG = "/my/projects/booklog";
const BOOKLOG_MANAGE = `${BOOKLOG}/recruitments/booklog`;
/* 모집이 끝나고 테스트 중인 지난 모집. 피드백·AI 분석이 있다 */
const FIRST_MANAGE = `${BOOKLOG}/recruitments/booklog-first`;
const FOLIO_MANAGE = "/my/projects/folio-builder/recruitments/folio-builder";
const UNCERTAIN_ERROR = "연결이 불안정해 결과를 확인하지 못했어요. 지원자 목록을 다시 불러왔으니 상태를 확인해 주세요";
const DISCONNECTED_ERROR = "서버에 연결되지 않아 결과를 확인하지 못했어요. 연결되면 지원자 목록을 다시 불러올게요";

test.describe("R101 접근", () => {
  for (const path of ["/my/projects", "/my/projects/new", BOOKLOG, `${BOOKLOG}/edit`, `${BOOKLOG}/recruitments/new`, BOOKLOG_MANAGE]) {
    test(`S101 비로그인은 ${path}에서 로그인으로 간다`, async ({ page, context }) => {
      await setDemo(context, { role: "guest" });
      await expectLoginRedirect(page, path);
    });
  }

  test("S102 하위 페이지에서도 내 프로젝트 탭이 현재 탭이다", async ({ page, context }) => {
    await setDemo(context, { role: "developer" });
    await page.goto(BOOKLOG_MANAGE);
    const tab = page.getByRole("navigation", { name: "주요 메뉴" }).getByRole("link", { name: "내 프로젝트" });
    await expect(tab).toHaveAttribute("aria-current", "page");
  });

  for (const path of ["/my/projects/nope", `${BOOKLOG}/recruitments/nope`]) {
    test(`S103 ${path}는 404 화면이다`, async ({ page, context }) => {
      await setDemo(context, { role: "developer" });
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: "찾는 페이지가 없어요" })).toBeVisible();
    });
  }

  test("S103 다른 회원의 프로젝트도 404 화면이다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto(BOOKLOG);
    await expect(page.getByRole("heading", { level: 1, name: "찾는 페이지가 없어요" })).toBeVisible();
  });
});

test.describe("R102 내 프로젝트 목록", () => {
  test("S104 내 프로젝트가 최신순 카드로 보인다", async ({ page, context }) => {
    await setDemo(context, { role: "developer" });
    await page.goto("/my/projects");
    await expect(page.getByRole("heading", { level: 1, name: "내 프로젝트" })).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "프로젝트 등록" })).toHaveAttribute("href", "/my/projects/new");
    const cards = page.getByRole("region", { name: "프로젝트 3개" }).getByRole("listitem");
    await expect(cards).toHaveCount(3);
    await expect(cards.nth(0)).toContainText("할 일 메모");
    await expect(cards.nth(1)).toContainText("포트폴리오 빌더");
    await expect(cards.nth(2)).toContainText("북로그");
    await expect(cards.nth(2)).toContainText("웹서비스");
    await expect(cards.nth(2)).toContainText("모집 2건 · 모집 중 1건");
    await expect(cards.nth(2).getByRole("link")).toHaveAttribute("href", BOOKLOG);
  });

  for (const demo of [{ role: "tester" }, { role: "developer", data: "empty" as const }]) {
    test(`S105 프로젝트가 없으면 빈 상태다 (${JSON.stringify(demo)})`, async ({ page, context }) => {
      await setDemo(context, demo);
      await page.goto("/my/projects");
      await expect(page.getByText("아직 등록한 프로젝트가 없어요")).toBeVisible();
      /* 프로젝트가 없으면 할 일과 전체 현황도 없다 */
      await expect(page.getByRole("heading", { name: /지금 확인할 일|전체 현황/ })).toHaveCount(0);
    });
  }

  test("S140 지금 확인할 일이 맨 위에 있고 해당 탭으로 보낸다", async ({ page, context }) => {
    await setDemo(context, { role: "developer" });
    await page.goto("/my/projects");
    await expect(page.getByRole("heading", { name: "지금 확인할 일 2건" })).toBeVisible();
    const todos = page.getByTestId("todo");
    await expect(todos).toHaveCount(2);
    await expect(todos.nth(0)).toContainText("북로그");
    await expect(todos.nth(0)).toContainText("지원자 8명이 확정을 기다려요 · 남은 자리 7명");
    await expect(todos.nth(0)).toHaveAttribute("href", `${BOOKLOG_MANAGE}?tab=testers`);
    /* 피드백은 테스트 중인 1차 모집에만 있다 */
    await expect(todos.nth(1)).toContainText("북로그");
    await expect(todos.nth(1)).toContainText(/신고 대기 피드백 1건 · \d+시간 뒤 자동 지급/);
    await expect(todos.nth(1)).toHaveAttribute("href", `${FIRST_MANAGE}?tab=feedback`);
    /* 선착순 무료 모집은 할 일이 아니다 */
    await expect(page.locator(`main a[href^="${FOLIO_MANAGE}"]`)).toHaveCount(0);

    /* 탭 이름은 일반 링크라 프로젝트 이름과 같은 보조 글씨색이다 */
    const [label, name] = await Promise.all(
      [todos.nth(0).getByText("테스터 관리"), todos.nth(0).getByText("북로그")].map((el) => el.evaluate((node) => getComputedStyle(node).color)),
    );
    expect(label).toBe(name);

    await todos.nth(0).click();
    await expect(page).toHaveURL(`${BOOKLOG_MANAGE}?tab=testers`);
  });

  test("S141 전체 현황은 모든 프로젝트를 합친 숫자다", async ({ page, context }) => {
    await setDemo(context, { role: "developer" });
    await page.goto("/my/projects");
    const overview = page.getByRole("region", { name: "전체 현황" });
    for (const [term, value] of [["모집 중", "1건"], ["모집 완료", "1건"], ["테스트 중", "1건"], ["신고 대기", "1건"]]) {
      const tile = overview.locator("div").filter({ has: page.getByRole("term").filter({ hasText: new RegExp(`^${term}$`) }) });
      await expect(tile.getByRole("definition")).toHaveText(value);
    }
  });

  test("S142 할 일 → 전체 현황 → 프로젝트 순서다", async ({ page, context }) => {
    await setDemo(context, { role: "developer" });
    await page.goto("/my/projects");
    await expect(page.getByRole("main").getByRole("heading", { level: 2 })).toHaveText(["지금 확인할 일 2건", "전체 현황", "프로젝트 3개"]);
  });

  test("S106 느린 응답에서는 스켈레톤이 먼저 보인다", async ({ page, context }) => {
    await setDemo(context, { role: "developer", data: "slow" });
    await page.goto("/my/projects", { waitUntil: "commit" });
    await expect(page.getByTestId("project-skeleton")).toBeVisible();
    await expect(page.getByRole("region", { name: "프로젝트 3개" }).getByRole("listitem")).toHaveCount(3);
    await expect(page.getByTestId("project-skeleton")).toHaveCount(0);
  });
});

test.describe("R103 프로젝트 등록·수정", () => {
  test.beforeEach(async ({ context }) => {
    await setDemo(context, { role: "developer" });
  });

  test("S107 등록 폼에 입력란이 있고 유형은 웹서비스만 고를 수 있다", async ({ page }) => {
    await page.goto("/my/projects/new");
    for (const label of ["프로젝트 이름", "한 줄 소개", "접속 링크"]) {
      await expect(page.getByLabel(label)).toBeVisible();
    }
    await expect(page.getByRole("radio", { name: /웹서비스/ })).toBeEnabled();
    for (const label of ["모바일앱", "게임", "API·라이브러리"]) {
      await expect(page.getByRole("radio", { name: new RegExp(label) })).toBeDisabled();
    }
  });

  test("S108 잘못 입력하면 오류를 보여 주고 첫 오류 칸으로 포커스가 간다", async ({ page }) => {
    await page.goto("/my/projects/new");
    await page.getByLabel("접속 링크").fill("abc");
    await page.getByRole("button", { name: "등록" }).click();
    await expect(page.getByText("프로젝트 이름을 적어 주세요")).toBeVisible();
    await expect(page.getByText("http:// 또는 https://로 시작하는 주소를 적어 주세요")).toBeVisible();
    const name = page.getByLabel("프로젝트 이름");
    await expect(name).toBeFocused();
    await expect(name).toHaveAttribute("aria-describedby", /field-name-error/);
    await expect(page).toHaveURL("/my/projects/new");

    await name.fill("가".repeat(51));
    await page.getByRole("button", { name: "등록" }).click();
    await expect(page.getByText("이름은 50자까지 적을 수 있어요")).toBeVisible();
  });

  test("S109 등록하면 목록으로 가고 시연 안내가 보인다", async ({ page }) => {
    await page.goto("/my/projects/new");
    await page.getByLabel("프로젝트 이름").fill("새 서비스");
    await page.getByLabel("한 줄 소개").fill("새로 만든 서비스예요");
    await page.getByLabel("접속 링크").fill("https://new.example.com");
    await page.getByRole("button", { name: "등록" }).click();
    await expect(page).toHaveURL("/my/projects?notice=saved");
    await expect(page.getByText("시연용이라 실제로 저장되지는 않아요")).toBeVisible();
  });

  test("S110 수정 폼에 기존 값이 채워져 있다", async ({ page }) => {
    await page.goto(`${BOOKLOG}/edit`);
    await expect(page.getByLabel("프로젝트 이름")).toHaveValue("북로그");
    await expect(page.getByRole("button", { name: "저장" })).toBeVisible();
    await expect(page.getByRole("link", { name: "취소" })).toHaveAttribute("href", BOOKLOG);
  });

  test("S111 수정하면 상세로 가고 저장 안내가 보인다", async ({ page }) => {
    await page.goto(`${BOOKLOG}/edit`);
    await page.getByLabel("한 줄 소개").fill("바꾼 소개");
    await page.getByRole("button", { name: "저장" }).click();
    await expect(page).toHaveURL(`${BOOKLOG}?notice=saved`);
    await expect(page.getByText("시연용이라 실제로 저장되지는 않아요")).toBeVisible();
  });
});

test.describe("R104 프로젝트 상세", () => {
  test.beforeEach(async ({ context }) => {
    await setDemo(context, { role: "developer" });
  });

  test("S112 프로젝트 정보와 버튼이 있다", async ({ page }) => {
    await page.goto(BOOKLOG);
    await expect(page.getByRole("heading", { level: 1, name: "북로그" })).toBeVisible();
    await expect(page.getByRole("link", { name: "내 프로젝트로 돌아가기" })).toHaveAttribute("href", "/my/projects");
    const access = page.getByRole("link", { name: /booklog\.example\.com/ });
    await expect(access).toHaveAttribute("target", "_blank");
    await expect(access).toHaveAttribute("rel", "noopener noreferrer");
    await expect(page.getByRole("link", { name: "수정" })).toHaveAttribute("href", `${BOOKLOG}/edit`);
    await expect(page.getByRole("link", { name: "테스트 모집 작성" })).toHaveAttribute("href", `${BOOKLOG}/recruitments/new`);
  });

  test("S113 모집 건이 최신순으로 보이고 관리 화면으로 간다", async ({ page }) => {
    await page.goto(BOOKLOG);
    const items = page.getByRole("main").getByRole("listitem");
    await expect(items).toHaveCount(2);
    await expect(items.nth(0)).toContainText("모집 중");
    await expect(items.nth(0)).toContainText("구독 모집");
    await expect(items.nth(0)).toContainText("확정 13명 · 정원 20명");
    await expect(items.nth(1)).toContainText("테스트 중");
    await expect(items.nth(1)).toContainText("확정 5명 · 정원 5명");
    await expect(items.nth(0).getByRole("link", { name: "공개 페이지 보기" })).toHaveAttribute("href", "/recruitments/booklog");
    await items.nth(0).getByRole("link").first().click();
    await expect(page).toHaveURL(BOOKLOG_MANAGE);
  });

  test("S114 모집 건이 없으면 빈 상태다", async ({ page }) => {
    await page.goto("/my/projects/todo-memo");
    await expect(page.getByText("아직 테스트 모집이 없어요")).toBeVisible();
  });
});

test.describe("R105 테스트 모집 작성", () => {
  const NEW = `${BOOKLOG}/recruitments/new`;

  test.beforeEach(async ({ context }) => {
    await setDemo(context, { role: "developer" });
  });

  test("S115 작성 폼과 보상 안내가 있다", async ({ page }) => {
    await page.goto(NEW);
    for (const label of ["요청 내용", "모집 마감일", "피드백 제출 마감일", "모집 인원"]) {
      await expect(page.getByLabel(label)).toBeVisible();
    }
    await expect(page.getByText(/기본 보상 [\d,]+ 크레딧/)).toBeVisible();
    await expect(page.getByText(/구독 모집이라 추가 보상 [\d,]+ 크레딧이 붙고, 지원자를 직접 선정해요/)).toBeVisible();
  });

  test("S116 일정이 맞지 않으면 오류가 보인다", async ({ page }) => {
    await page.goto(NEW);
    await page.getByLabel("모집 마감일").fill("2000-01-10");
    await page.getByLabel("피드백 제출 마감일").fill("2000-01-05");
    await page.getByRole("button", { name: "모집 등록" }).click();
    await expect(page.getByText("모집 마감일은 오늘 이후로 골라 주세요")).toBeVisible();
    await expect(page.getByText("제출 마감일은 모집 마감일보다 뒤여야 해요")).toBeVisible();
    await expect(page).toHaveURL(NEW);
  });

  test("S117 인원이 한도를 넘으면 오류가 보인다", async ({ page }) => {
    await page.goto(NEW);
    await page.getByLabel("모집 인원").fill("31");
    await page.getByRole("button", { name: "모집 등록" }).click();
    await expect(page.getByText("1~30명까지 모집할 수 있어요")).toBeVisible();
  });

  test("S118 작성하면 프로젝트로 가고 시연 안내가 보인다", async ({ page }) => {
    await page.goto(NEW);
    await page.getByLabel("요청 내용").fill("회원가입부터 첫 기록까지 해 보기");
    await page.getByLabel("모집 마감일").fill("2099-01-10");
    await page.getByLabel("피드백 제출 마감일").fill("2099-01-20");
    await page.getByLabel("모집 인원").fill("10");
    await page.getByRole("button", { name: "모집 등록" }).click();
    await expect(page).toHaveURL(`${BOOKLOG}?notice=saved`);
    await expect(page.getByText("시연용이라 실제로 저장되지는 않아요")).toBeVisible();
  });
});

test.describe("R106 테스트 모집 관리와 탭", () => {
  test.beforeEach(async ({ context }) => {
    await setDemo(context, { role: "developer" });
  });

  test("S119 요약이 보인다", async ({ page }) => {
    await page.goto(BOOKLOG_MANAGE);
    await expect(page.getByRole("heading", { level: 1, name: "책 등록부터 독서 기록 작성까지 한 번 써 보기" })).toBeVisible();
    const summary = page.getByRole("definition");
    await expect(page.getByRole("term").filter({ hasText: /^확정 인원$/ })).toBeVisible();
    await expect(summary.filter({ hasText: /^13명$/ })).toBeVisible();
    await expect(summary.filter({ hasText: /^20명$/ })).toBeVisible();
    await expect(page.getByText(/\d+ \/ /)).toHaveCount(0);
    const trail = page.getByRole("navigation", { name: "현재 위치" });
    await expect(trail.getByRole("link", { name: "내 프로젝트" })).toHaveAttribute("href", "/my/projects");
    await expect(trail.getByRole("link", { name: "북로그" })).toHaveAttribute("href", BOOKLOG);
  });

  test("S120 탭은 URL을 따르고 기본은 테스터 관리다", async ({ page }) => {
    await page.goto(`${BOOKLOG_MANAGE}?tab=nope`);
    const tabs = page.getByRole("navigation", { name: "모집 관리 탭" }).getByRole("link");
    await expect(tabs).toHaveText(["테스터 관리", "피드백", "분석"]);
    await expect(tabs.nth(0)).toHaveAttribute("aria-current", "page");
    await tabs.nth(1).click();
    await expect(page).toHaveURL(`${BOOKLOG_MANAGE}?tab=feedback`);
    await expect(tabs.nth(1)).toHaveAttribute("aria-current", "page");
  });
});

test.describe("R107 테스터 관리 탭", () => {
  test.beforeEach(async ({ context }) => {
    await setDemo(context, { role: "developer" });
  });

  test("S121 지원자가 지원 순서대로 보이고 개인정보는 없다", async ({ page }) => {
    await page.goto(BOOKLOG_MANAGE);
    const rows = page.getByTestId("applicant");
    await expect(rows).toHaveCount(22);
    await expect(rows.nth(0)).toContainText("김하늘");
    await expect(rows.nth(0)).toContainText("확정");
    await expect(page.getByText("@")).toHaveCount(0);
  });

  test("S122 S133 구독 모집은 지원자를 확정할 수 있고 결과를 알린다", async ({ page }) => {
    await page.goto(BOOKLOG_MANAGE);
    const pending = page.getByTestId("applicant").filter({ has: page.getByRole("button", { name: "확정" }) });
    await expect(pending).toHaveCount(8);
    const first = pending.first();
    const nickname = (await first.locator("span").first().textContent()) ?? "";
    await first.getByRole("button", { name: "확정", exact: true }).click();
    await expect(page.getByTestId("confirmed-count")).toHaveText("확정 14명 · 정원 20명");
    await expect(pending).toHaveCount(7);
    await expect(page.locator('[aria-live="polite"]').filter({ hasText: `${nickname}님을 확정했어요` })).toHaveCount(1);
  });

  test("S139 여러 명을 골라 한 번에 확정한다", async ({ page }) => {
    await page.goto(BOOKLOG_MANAGE);
    const bulkButton = page.getByRole("button", { name: /^선택한 \d+명 확정$/ });
    await expect(bulkButton).toHaveText("선택한 0명 확정");
    await expect(bulkButton).toBeDisabled();

    await page.getByRole("checkbox", { name: "전체 선택" }).check();
    await expect(bulkButton).toHaveText("선택한 8명 확정");
    await expect(bulkButton).toBeDisabled();
    await expect(page.getByText("남은 자리는 7명이에요")).toBeVisible();

    await page.getByRole("checkbox", { name: /선택$/ }).last().uncheck();
    await expect(bulkButton).toHaveText("선택한 7명 확정");
    await bulkButton.click();

    await expect(page.getByTestId("confirmed-count")).toHaveText("확정 20명 · 정원 20명");
    await expect(page.locator('[aria-live="polite"]').filter({ hasText: "7명을 확정했어요" })).toHaveCount(1);
    await expect(page.getByText("정원이 다 찼어요")).toBeVisible();
    await expect(page.getByRole("checkbox")).toHaveCount(0);
  });

  test("S139 모집이 끝난 모집에는 대기 지원자가 있어도 일괄 확정이 없다", async ({ page }) => {
    await page.goto(FIRST_MANAGE);
    /* 대기 지원자가 없으면 조건과 관계없이 체크박스가 숨으므로, 대기 지원자가 있는 것부터 확인한다 */
    await expect(page.getByTestId("applicant").filter({ hasText: "조하은" }).getByText("지원", { exact: true })).toBeVisible();
    await expect(page.getByRole("checkbox")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^(확정|거절)$/ })).toHaveCount(0);
  });

  test("S123 정원이 차면 확정 버튼이 비활성이다", async ({ page }) => {
    await page.goto(BOOKLOG_MANAGE);
    await page.getByRole("checkbox", { name: "전체 선택" }).check();
    await page.getByRole("checkbox", { name: /선택$/ }).last().uncheck();
    await page.getByRole("button", { name: "선택한 7명 확정" }).click();
    await expect(page.getByText("정원이 다 찼어요")).toBeVisible();
    await expect(page.getByRole("button", { name: "확정", exact: true })).toBeDisabled();
  });

  test("S144 확정 요청이 끊기면 안내를 보여 주고 서버 목록으로 화면을 맞춘다", async ({ page }) => {
    await page.goto(BOOKLOG_MANAGE);
    /* 확정 요청(서버 액션 POST)만 끊는다. 화면을 다시 불러오는 GET은 통과한다 */
    await page.route(`**${BOOKLOG_MANAGE}`, (route) => (route.request().method() === "POST" ? route.abort() : route.fallback()));
    const refetch = page.waitForRequest((request) => request.method() === "GET" && request.headers()["rsc"] === "1" && !request.headers()["next-router-prefetch"]);
    await page.getByTestId("applicant").filter({ hasText: "권나연" }).getByRole("button", { name: "확정", exact: true }).click();

    await expect(page.getByRole("main").getByRole("alert")).toHaveText("연결이 불안정해 결과를 확인하지 못했어요. 지원자 목록을 다시 불러왔으니 상태를 확인해 주세요");
    await refetch;
    /* 오류 화면 없이 그대로이고, 먼저 바꾼 표시는 서버 상태(저장 안 됨)로 돌아온다 */
    await expect(page.getByTestId("confirmed-count")).toHaveText("확정 13명 · 정원 20명");
    await expect(page.getByTestId("applicant").filter({ hasText: "권나연" })).toContainText("지원");
    await expect(page.getByTestId("applicant").filter({ hasText: "권나연" }).getByRole("button", { name: "확정", exact: true })).toBeVisible();
  });

  test("S144 오프라인이면 화면과 안내를 유지하고, 연결되면 서버 목록으로 맞춘다", async ({ page, context }) => {
    await page.goto(BOOKLOG_MANAGE);
    const row = page.getByTestId("applicant").filter({ hasText: "권나연" });
    /* 확정 요청뿐 아니라 목록 재조회까지 모두 끊긴 실제 오프라인 상태 */
    await context.setOffline(true);
    await row.getByRole("button", { name: "확정", exact: true }).click();

    const alert = page.getByRole("main").getByRole("alert");
    await expect(alert).toHaveText(DISCONNECTED_ERROR);
    /* 잠시 기다려도 오류 화면으로 넘어가지 않고 목록과 안내가 그대로 남는다 */
    await page.waitForTimeout(1_000);
    await expect(alert).toBeVisible();
    await expect(page.getByTestId("confirmed-count")).toHaveText("확정 13명 · 정원 20명");
    await expect(row).toContainText("지원");

    const refetch = page.waitForRequest((request) => request.method() === "GET" && request.headers()["rsc"] === "1" && !request.headers()["next-router-prefetch"]);
    await context.setOffline(false);
    await refetch;
    await expect(alert).toHaveText("연결이 불안정해 결과를 확인하지 못했어요. 지원자 목록을 다시 불러왔으니 상태를 확인해 주세요");
    await expect(page.getByTestId("confirmed-count")).toHaveText("확정 13명 · 정원 20명");
    await expect(row.getByRole("button", { name: "확정", exact: true })).toBeVisible();
  });

  test("S144 온라인이지만 서버에 닿지 않으면 화면과 안내를 유지하고, 닿으면 서버 목록으로 맞춘다", async ({ page }) => {
    await page.goto(BOOKLOG_MANAGE);
    const row = page.getByTestId("applicant").filter({ hasText: "권나연" });
    /* 브라우저는 온라인인 채로, 이 페이지로 가는 요청(확정 POST, 연결 확인 HEAD, 재조회 GET)을 모두 끊는다. 서버가 내려간 경우와 같다 */
    const blocked = (url: URL) => url.pathname === BOOKLOG_MANAGE;
    await page.route(blocked, (route) => route.abort());
    await row.getByRole("button", { name: "확정", exact: true }).click();

    const alert = page.getByRole("main").getByRole("alert");
    await expect(alert).toHaveText(DISCONNECTED_ERROR);
    /* 다시 확인하는 간격(3초)이 지나도 오류 화면으로 넘어가지 않고 목록과 안내가 그대로 남는다 */
    await page.waitForTimeout(3_500);
    await expect(alert).toHaveText(DISCONNECTED_ERROR);
    await expect(page.getByTestId("confirmed-count")).toHaveText("확정 13명 · 정원 20명");
    await expect(row.getByRole("button", { name: "확정", exact: true })).toBeVisible();

    /* 서버에 다시 닿으면 online 이벤트가 없어도 다음 확인 때 목록을 다시 받는다 */
    await page.unroute(blocked);
    await expect(alert).toHaveText(UNCERTAIN_ERROR, { timeout: 10_000 });
    await expect(page.getByTestId("confirmed-count")).toHaveText("확정 13명 · 정원 20명");
  });

  test("S144 다른 탭에서 정원이 차 서버가 거절하면, 안내와 함께 최신 목록으로 맞춘다", async ({ page, context }) => {
    await page.goto(BOOKLOG_MANAGE);
    /* 같은 브라우저의 다른 탭에서 7명을 확정해 정원을 채운다 */
    const other = await context.newPage();
    await other.goto(BOOKLOG_MANAGE);
    await other.getByRole("checkbox", { name: "전체 선택" }).check();
    await other.getByRole("checkbox", { name: /선택$/ }).last().uncheck();
    const saved = other.waitForResponse((response) => response.request().method() === "POST");
    await other.getByRole("button", { name: "선택한 7명 확정" }).click();
    await saved;

    /* 이 탭은 아직 13명이라 확정 버튼이 눌린다. 서버는 정원 초과로 거절한다 */
    await expect(page.getByTestId("confirmed-count")).toHaveText("확정 13명 · 정원 20명");
    await page.getByTestId("applicant").filter({ hasText: "배하린" }).getByRole("button", { name: "확정", exact: true }).click();
    await expect(page.getByRole("main").getByRole("alert")).toHaveText("확정하지 못했어요. 그사이 정원이 찼거나 모집이 끝났을 수 있어 지원자 목록을 다시 불러왔어요");
    await expect(page.getByTestId("confirmed-count")).toHaveText("확정 20명 · 정원 20명");
    await expect(page.getByText("정원이 다 찼어요")).toBeVisible();
    await expect(page.getByRole("button", { name: "확정", exact: true })).toBeDisabled();
  });

  test("S144 확정 중 로그아웃됐으면 연결 안내 없이 로그인으로 간다", async ({ page, context }) => {
    await page.goto(BOOKLOG_MANAGE);
    /* 다른 탭에서 시연 역할을 비로그인으로 바꾼 것과 같다 */
    await setDemo(context, { role: "guest" });
    await page.getByTestId("applicant").filter({ hasText: "권나연" }).getByRole("button", { name: "확정", exact: true }).click();
    await expect(page).toHaveURL(`/login?next=${encodeURIComponent(BOOKLOG_MANAGE)}`);
    await expect(page.getByText(UNCERTAIN_ERROR)).toHaveCount(0);
  });

  test("S143 모집이 끝난 모집은 서버도 확정·거절을 저장하지 않는다", async ({ page }) => {
    await page.goto(BOOKLOG_MANAGE);
    /*
     * 화면으로는 보낼 수 없는 요청을 만든다: 북로그 확정 요청을 모집이 끝난 1차 모집의 대기 지원자(조하은) 거절로 바꾼다.
     * 1차 모집은 정원이 차 있어 확정은 정원 검사에도 걸리므로, 정원 검사가 없는 거절로 마감 검사만 확인한다.
     */
    await page.route(`**${BOOKLOG_MANAGE}`, async (route) => {
      const request = route.request();
      if (request.method() !== "POST") return route.fallback();
      const body = request.postData() ?? "";
      const forged = body.replace('"booklog",["booklog-a15"],"confirmed"', '"booklog-first",["booklog-first-a7"],"rejected"');
      expect(forged).not.toBe(body);
      await route.continue({ postData: forged });
    });
    await page.getByTestId("applicant").filter({ hasText: "권나연" }).getByRole("button", { name: "확정", exact: true }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText("확정하지 못했어요");

    await page.goto(FIRST_MANAGE);
    await expect(page.getByTestId("applicant").filter({ hasText: "조하은" }).getByText("지원", { exact: true })).toBeVisible();
    await expect(page.getByTestId("confirmed-count")).toHaveText("확정 5명 · 정원 5명");
  });

  test("S143 확정 결과는 요약·분석·내 프로젝트에도 반영되고 새로고침해도 남는다", async ({ page }) => {
    await page.goto(BOOKLOG_MANAGE);
    await page.getByRole("checkbox", { name: "전체 선택" }).check();
    await page.getByRole("checkbox", { name: /선택$/ }).last().uncheck();
    await page.getByRole("button", { name: "선택한 7명 확정" }).click();
    const summaryValue = (term: string) =>
      page.locator("dl div").filter({ has: page.getByRole("term").filter({ hasText: new RegExp(`^${term}$`) }) }).getByRole("definition");
    await expect(summaryValue("확정 인원")).toHaveText("20명");
    await expect(page.getByRole("main").getByText("모집 완료", { exact: true })).toBeVisible();

    await page.reload();
    await expect(page.getByTestId("confirmed-count")).toHaveText("확정 20명 · 정원 20명");

    await page.goto(`${BOOKLOG_MANAGE}?tab=analytics`);
    await expect(summaryValue("확정 수")).toHaveText("20명");

    await page.goto("/my/projects");
    await expect(page.getByTestId("todo").filter({ hasText: "확정을 기다려요" })).toHaveCount(0);
    const overview = page.getByRole("region", { name: "전체 현황" });
    const tile = overview.locator("div").filter({ has: page.getByRole("term").filter({ hasText: /^모집 완료$/ }) });
    await expect(tile.getByRole("definition")).toHaveText("2건");
  });

  test("S124 무료 모집은 직접 선정하지 않는다", async ({ page }) => {
    await page.goto(FOLIO_MANAGE);
    await expect(page.getByText("선착순 모집이라 지원 순서대로 자동 확정돼요")).toBeVisible();
    await expect(page.getByRole("button", { name: /확정|거절/ })).toHaveCount(0);
  });
});

test.describe("R108 피드백 탭", () => {
  test.beforeEach(async ({ context }) => {
    await setDemo(context, { role: "developer" });
  });

  test("S126 S128 피드백이 최신순이고 신고 대기만 신고할 수 있다", async ({ page }) => {
    await page.goto(`${FIRST_MANAGE}?tab=feedback`);
    const rows = page.getByTestId("feedback");
    await expect(rows).toHaveCount(4);
    await expect(rows.nth(0)).toContainText("신고 대기");
    await expect(rows.nth(0)).toContainText(/\d+시간 뒤 자동 지급/);
    await expect(rows.nth(1)).toContainText("신고됨");
    await expect(rows.nth(2)).toContainText("지급 완료");
    await expect(rows.nth(3)).toContainText("지급 완료");
    await expect(rows.nth(0).getByRole("button", { name: "신고" })).toBeVisible();
    await expect(rows.nth(1).getByRole("button", { name: "신고" })).toHaveCount(0);
    await expect(rows.nth(2).getByRole("button", { name: "신고" })).toHaveCount(0);
  });

  test("S127 사유를 적어 신고하고, Esc로 닫으면 포커스가 돌아온다", async ({ page }) => {
    await page.goto(`${FIRST_MANAGE}?tab=feedback`);
    const row = page.getByTestId("feedback").first();
    const reportButton = row.getByRole("button", { name: "신고" });

    await reportButton.click();
    const dialog = page.getByRole("dialog", { name: "피드백 신고" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel("신고 사유")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(reportButton).toBeFocused();

    await reportButton.click();
    await dialog.getByRole("button", { name: "신고하기" }).click();
    await expect(dialog.getByText("신고 사유를 적어 주세요")).toBeVisible();
    await dialog.getByLabel("신고 사유").fill("내용이 너무 짧아요");
    await dialog.getByRole("button", { name: "신고하기" }).click();
    await expect(dialog).toBeHidden();
    await expect(row).toContainText("신고됨");
    await expect(row.getByRole("button", { name: "신고" })).toHaveCount(0);
  });

  test("S129 피드백이 없으면 빈 상태다", async ({ page }) => {
    /* 아직 모집 중이라 테스트 전이다 */
    await page.goto(`${BOOKLOG_MANAGE}?tab=feedback`);
    await expect(page.getByText("아직 제출된 피드백이 없어요")).toBeVisible();
  });
});

test.describe("R109 분석 탭", () => {
  test.beforeEach(async ({ context }) => {
    await setDemo(context, { role: "developer" });
  });

  test("S130 구독 모집은 숫자 카드를 보여 준다", async ({ page }) => {
    await page.goto(`${FIRST_MANAGE}?tab=analytics`);
    for (const term of ["지원 수", "확정 수", "피드백 제출 수", "제출률", "신고 수"]) {
      await expect(page.getByRole("term").filter({ hasText: new RegExp(`^${term}$`) })).toBeVisible();
    }
    /* 피드백 4건 ÷ 확정 5명 = 80%. 제출률은 신고된 피드백도 센다 */
    await expect(page.getByText("80%")).toBeVisible();
  });

  test("S131 S138 무료 모집은 구독 안내만 보여 주고 AI 분석이 없다", async ({ page }) => {
    await page.goto(`${FOLIO_MANAGE}?tab=analytics`);
    await expect(page.getByText("구독 모집에서 분석을 볼 수 있어요")).toBeVisible();
    await expect(page.getByRole("link", { name: "구독 알아보기" })).toHaveAttribute("href", "/my/subscription");
    await expect(page.getByRole("heading", { name: "AI 분석" })).toHaveCount(0);
  });
});

test.describe("R112 AI 분석", () => {
  test("S135 피드백을 정리한 결과와 근거 수를 보여 준다", async ({ page, context }) => {
    await setDemo(context, { role: "developer" });
    await page.goto(`${FIRST_MANAGE}?tab=analytics`);
    const ai = page.getByRole("region", { name: "AI 분석" });
    await expect(ai).toBeVisible();
    await expect(ai.getByText("시연용 샘플")).toBeVisible();
    await expect(ai.getByRole("heading", { name: "고칠 점 2" })).toBeVisible();
    await expect(ai.getByRole("heading", { name: "좋았던 점 1" })).toBeVisible();
    /* 문제마다 근거 수와 해결 제안이 같은 항목 안에 붙어 있다 */
    const issue = ai.getByRole("listitem").filter({ hasText: "표지가 늦게 떠서" });
    await expect(issue.getByText("피드백 2건")).toBeVisible();
    await expect(issue).toContainText("제안 검색 결과에서 표지를 불러오는 동안 자리 표시를 보여 주기");
    await expect(ai.getByText(/AI가 정리한 내용이라 틀릴 수 있어요 · .+ 정리/)).toBeVisible();
  });

  test("S136 피드백이 부족하면 안내를 보여 준다", async ({ page, context }) => {
    await setDemo(context, { role: "developer" });
    await page.goto(`${BOOKLOG_MANAGE}?tab=analytics`);
    const ai = page.getByRole("region", { name: "AI 분석" });
    await expect(ai.getByText("피드백이 3건 이상 모이면 AI가 정리해 드려요")).toBeVisible();
    await expect(ai.getByText("지금 피드백 0건")).toBeVisible();
  });

  test("S137 분석을 기다리는 동안 스켈레톤이 먼저 보인다", async ({ page, context }) => {
    await setDemo(context, { role: "developer", data: "slow" });
    await page.goto(`${FIRST_MANAGE}?tab=analytics`, { waitUntil: "commit" });
    await expect(page.getByRole("term").filter({ hasText: /^제출률$/ })).toBeVisible();
    await expect(page.getByTestId("ai-skeleton")).toBeVisible();
    await expect(page.getByRole("heading", { name: "고칠 점 2" })).toBeVisible();
    await expect(page.getByTestId("ai-skeleton")).toHaveCount(0);
  });
});
