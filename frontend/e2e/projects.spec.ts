import { expect, test } from "@playwright/test";
import { setDemo } from "./helpers";

/* docs/frontend/projects.md의 R101~R110 시나리오. S번호는 문서와 1:1로 맞춘다 */

const BOOKLOG = "/my/projects/booklog";
const BOOKLOG_MANAGE = `${BOOKLOG}/recruitments/booklog`;
/* 모집이 끝나고 테스트 중인 지난 모집. 피드백·AI 분석이 있다 */
const FIRST_MANAGE = `${BOOKLOG}/recruitments/booklog-first`;
const FOLIO_MANAGE = "/my/projects/folio-builder/recruitments/folio-builder";

test.describe("R101 접근", () => {
  for (const path of ["/my/projects/nope", `${BOOKLOG}/recruitments/nope`]) {
    test(`S485 ${path}는 404 화면이다`, async ({ page, context }) => {
      await setDemo(context, { role: "developer" });
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: "찾는 페이지가 없어요" })).toBeVisible();
    });
  }

  test("S485 다른 회원의 프로젝트도 404 화면이다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto(BOOKLOG);
    await expect(page.getByRole("heading", { level: 1, name: "찾는 페이지가 없어요" })).toBeVisible();
  });
});

test.describe("R103 프로젝트 등록·수정", () => {
  test.beforeEach(async ({ context }) => {
    await setDemo(context, { role: "developer" });
  });

  test("S490 잘못 입력하면 오류를 보여 주고 첫 오류 칸으로 포커스가 간다", async ({ page }) => {
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

  test("S491 등록하면 목록으로 가고 시연 안내가 보인다", async ({ page }) => {
    await page.goto("/my/projects/new");
    await page.getByLabel("프로젝트 이름").fill("새 서비스");
    await page.getByLabel("한 줄 소개").fill("새로 만든 서비스예요");
    await page.getByLabel("접속 링크").fill("https://new.example.com");
    await page.getByRole("button", { name: "등록" }).click();
    await expect(page).toHaveURL("/my/projects?notice=saved");
    await expect(page.getByText("시연용이라 실제로 저장되지는 않아요")).toBeVisible();
  });

  test("S493 수정하면 상세로 가고 저장 안내가 보인다", async ({ page }) => {
    await page.goto(`${BOOKLOG}/edit`);
    await page.getByLabel("한 줄 소개").fill("바꾼 소개");
    await page.getByRole("button", { name: "저장" }).click();
    await expect(page).toHaveURL(`${BOOKLOG}?notice=saved`);
    await expect(page.getByText("시연용이라 실제로 저장되지는 않아요")).toBeVisible();
  });
});

test.describe("R105 테스트 모집 작성", () => {
  const NEW = `${BOOKLOG}/recruitments/new`;

  test.beforeEach(async ({ context }) => {
    await setDemo(context, { role: "developer" });
  });

  test("S498 일정이 맞지 않으면 오류가 보인다", async ({ page }) => {
    await page.goto(NEW);
    await page.getByLabel("모집 마감일").fill("2000-01-10");
    await page.getByLabel("피드백 제출 마감일").fill("2000-01-05");
    await page.getByRole("button", { name: "모집 등록" }).click();
    await expect(page.getByText("모집 마감일은 오늘 이후로 골라 주세요")).toBeVisible();
    await expect(page.getByText("제출 마감일은 모집 마감일보다 뒤여야 해요")).toBeVisible();
    await expect(page).toHaveURL(NEW);
  });

  test("S500 작성하면 프로젝트로 가고 시연 안내가 보인다", async ({ page }) => {
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

test.describe("R107 테스터 관리 탭", () => {
  test.beforeEach(async ({ context }) => {
    await setDemo(context, { role: "developer" });
  });

  test("S503 지원자가 지원 순서대로 보이고 개인정보는 없다", async ({ page }) => {
    await page.goto(BOOKLOG_MANAGE);
    const rows = page.getByTestId("applicant");
    await expect(rows).toHaveCount(22);
    await expect(rows.nth(0)).toContainText("김하늘");
    await expect(rows.nth(0)).toContainText("확정");
    await expect(page.getByText("@")).toHaveCount(0);
  });

  test("S504 S515 구독 모집은 지원자를 확정할 수 있고 결과를 알린다", async ({ page }) => {
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

  test("S521 여러 명을 골라 한 번에 확정한다", async ({ page }) => {
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

  test("S521 모집이 끝난 모집에는 대기 지원자가 있어도 일괄 확정이 없다", async ({ page }) => {
    await page.goto(FIRST_MANAGE);
    /* 대기 지원자가 없으면 조건과 관계없이 체크박스가 숨으므로, 대기 지원자가 있는 것부터 확인한다 */
    await expect(page.getByTestId("applicant").filter({ hasText: "조하은" }).getByText("지원", { exact: true })).toBeVisible();
    await expect(page.getByRole("checkbox")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^(확정|거절)$/ })).toHaveCount(0);
  });

  test("S505 정원이 차면 확정 버튼이 비활성이다", async ({ page }) => {
    await page.goto(BOOKLOG_MANAGE);
    await page.getByRole("checkbox", { name: "전체 선택" }).check();
    await page.getByRole("checkbox", { name: /선택$/ }).last().uncheck();
    await page.getByRole("button", { name: "선택한 7명 확정" }).click();
    await expect(page.getByText("정원이 다 찼어요")).toBeVisible();
    await expect(page.getByRole("button", { name: "확정", exact: true })).toBeDisabled();
  });

  test("S526 확정 요청이 끊기면 안내를 보여 주고 서버 목록으로 화면을 맞춘다", async ({ page }) => {
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

  test("S526 다른 탭에서 정원이 차 서버가 거절하면, 안내와 함께 최신 목록으로 맞춘다", async ({ page, context }) => {
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

  test("S525 모집이 끝난 모집은 서버도 확정·거절을 저장하지 않는다", async ({ page }) => {
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

  test("S525 확정 결과는 요약·분석·내 프로젝트에도 반영되고 새로고침해도 남는다", async ({ page }) => {
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

  test("S506 무료 모집은 직접 선정하지 않는다", async ({ page }) => {
    await page.goto(FOLIO_MANAGE);
    await expect(page.getByText("선착순 모집이라 지원 순서대로 자동 확정돼요")).toBeVisible();
    await expect(page.getByRole("button", { name: /확정|거절/ })).toHaveCount(0);
  });
});

test.describe("R108 피드백 탭", () => {
  test.beforeEach(async ({ context }) => {
    await setDemo(context, { role: "developer" });
  });

  test("S508 S510 피드백이 최신순이고 신고 대기만 신고할 수 있다", async ({ page }) => {
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

  test("S509 사유를 적어 신고하고, Esc로 닫으면 포커스가 돌아온다", async ({ page }) => {
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
});

test.describe("R109 분석 탭", () => {
  test.beforeEach(async ({ context }) => {
    await setDemo(context, { role: "developer" });
  });

  test("S513 S520 무료 모집은 구독 안내만 보여 주고 AI 분석이 없다", async ({ page }) => {
    await page.goto(`${FOLIO_MANAGE}?tab=analytics`);
    await expect(page.getByText("구독 모집에서 분석을 볼 수 있어요")).toBeVisible();
    await expect(page.getByRole("link", { name: "구독 알아보기" })).toHaveAttribute("href", "/my/subscription");
    await expect(page.getByRole("heading", { name: "AI 분석" })).toHaveCount(0);
  });
});
