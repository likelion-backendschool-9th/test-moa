import { expect, test } from "@playwright/test";
import { setDemo } from "./helpers";

/* docs/frontend/project/projects.md에서 자동 검사로 남긴 시나리오. 기존 S번호를 유지한다 */

const BOOKLOG = "/developer/projects/booklog";
const BOOKLOG_MANAGE = "/developer/recruitments/booklog";
/* 모집이 끝나고 테스트 중인 지난 모집. 피드백·AI 분석이 있다 */
const FIRST_MANAGE = "/developer/recruitments/booklog-first";
const FOLIO_MANAGE = "/developer/recruitments/folio-builder";
/* 개발자가 취소한 지난 무료 모집 */
const FOLIO_OLD_MANAGE = "/developer/recruitments/folio-builder-old";
/* 확정 테스터가 아직 없는 무료 모집 */
const FOLIO_NEXT_MANAGE = "/developer/recruitments/folio-builder-next";

test.describe("R101 접근", () => {
  test("#101-S6 모집 작성은 프로젝트 키가 유효하고 내 프로젝트일 때만 열린다", async ({ page, context }) => {
    await setDemo(context, { role: "developer" });
    for (const path of [
      "/developer/recruitments/new",
      "/developer/recruitments/new?project=nope",
      "/developer/recruitments/new?project=booklog&project=folio-builder",
    ]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: "찾는 페이지가 없어요" })).toBeVisible();
      await expect(page.getByRole("button", { name: "모집 등록", exact: true })).toHaveCount(0);
    }

    await setDemo(context, { role: "tester" });
    await page.goto("/developer/recruitments/new?project=booklog");
    await expect(page.getByRole("heading", { name: "찾는 페이지가 없어요" })).toBeVisible();
    await expect(page.getByRole("button", { name: "모집 등록", exact: true })).toHaveCount(0);
  });

  for (const path of ["/developer/projects/nope", "/developer/recruitments/nope"]) {
    test(`S485 ${path}는 404 화면이다`, async ({ page, context }) => {
      await setDemo(context, { role: "developer" });
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: "찾는 페이지가 없어요" })).toBeVisible();
    });
  }

  test("S485 다른 회원의 프로젝트도 404 화면이다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    for (const path of [BOOKLOG, BOOKLOG_MANAGE]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: "찾는 페이지가 없어요" })).toBeVisible();
    }
  });
});

test.describe("R103 프로젝트 등록·수정", () => {
  test.beforeEach(async ({ context }) => {
    await setDemo(context, { role: "developer" });
  });

  test("S490 잘못 입력하면 오류를 보여 주고 첫 오류 칸으로 포커스가 간다", async ({ page }) => {
    await page.goto("/developer/projects/new");
    await page.getByRole("button", { name: "등록" }).click();
    await expect(page.getByText("프로젝트 이름을 적어 주세요")).toBeVisible();
    const name = page.getByLabel("프로젝트 이름");
    await expect(name).toBeFocused();
    await expect(name).toHaveAttribute("aria-describedby", /field-name-error/);
    await expect(page).toHaveURL("/developer/projects/new");

    await name.fill("가".repeat(51));
    await page.getByRole("button", { name: "등록" }).click();
    await expect(page.getByText("이름은 50자까지 적을 수 있어요")).toBeVisible();

    await name.fill("새 서비스");

    /* 상세 설명은 2000자까지다 */
    await page.getByLabel("상세 설명 (선택)").fill("가".repeat(2001));
    await page.getByRole("button", { name: "등록" }).click();
    await expect(page.getByText("상세 설명은 2000자까지 적을 수 있어요")).toBeVisible();
    /* 줄바꿈도 한 글자로 센다 */
    await page.getByLabel("상세 설명 (선택)").fill(`${"가".repeat(1000)}\n${"나".repeat(999)}`);
    await page.getByRole("button", { name: "등록" }).click();
    await expect(page).toHaveURL("/developer/projects?notice=saved");
  });

  test("S491 등록하면 목록으로 가고 시연 안내가 보인다", async ({ page }) => {
    await page.goto("/developer/projects/new");
    await page.getByLabel("프로젝트 이름").fill("새 서비스");
    await page.getByRole("button", { name: "등록" }).click();
    await expect(page).toHaveURL("/developer/projects?notice=saved");
    await expect(page.getByText("시연용이라 실제로 저장되지는 않아요")).toBeVisible();
  });

  test("S493 수정하면 상세로 가고 저장 안내가 보인다", async ({ page }) => {
    await page.goto(`${BOOKLOG}/edit`);
    await page.getByLabel("상세 설명 (선택)").fill("바꾼 설명");
    await page.getByRole("button", { name: "저장" }).click();
    await expect(page).toHaveURL(`${BOOKLOG}?notice=saved`);
    await expect(page.getByText("시연용이라 실제로 저장되지는 않아요")).toBeVisible();
  });
});

test.describe("R105 테스트 모집 작성", () => {
  const NEW = "/developer/recruitments/new?project=booklog";

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
    await page.getByLabel("모집글 제목").fill("북로그 3차 테스터 모집");
    await page.getByLabel("모집 설명").fill("회원가입부터 첫 기록까지 해 보기");
    await page.getByLabel("접속 링크").fill("https://booklog.example.com");
    await page.getByLabel("모집 마감일").fill("2099-01-10");
    await page.getByLabel("피드백 제출 마감일").fill("2099-01-20");
    await page.getByLabel("항목 1 이름").fill("회원가입하기");
    await page.getByRole("button", { name: "모집 등록" }).click();
    await expect(page).toHaveURL(`${BOOKLOG}?notice=saved`);
    await expect(page.getByText("시연용이라 실제로 저장되지는 않아요")).toBeVisible();
  });
});

test.describe("R107 테스터 관리 탭", () => {
  test.beforeEach(async ({ context }) => {
    await setDemo(context, { role: "developer" });
  });

  test("S521 여러 명을 골라 한 번에 확정한다", async ({ page }) => {
    await page.goto(BOOKLOG_MANAGE);
    const bulkButton = page.getByRole("button", { name: /^선택한 \d+명 확정$/ });
    await expect(bulkButton).toHaveText("선택한 0명 확정");
    await expect(bulkButton).toBeDisabled();

    await page.getByRole("checkbox", { name: "전체 선택" }).check();
    await expect(bulkButton).toHaveText("선택한 8명 확정");
    await expect(bulkButton).toBeEnabled();

    await page.getByRole("checkbox", { name: /선택$/ }).last().uncheck();
    await expect(bulkButton).toHaveText("선택한 7명 확정");
    await bulkButton.click();

    await expect(page.getByTestId("confirmed-count")).toHaveText("확정 20명");
    await expect(page.locator('[aria-live="polite"]').filter({ hasText: "7명을 확정했어요" })).toHaveCount(1);
    /* 인원 제한이 없어 남은 지원자도 확정할 수 있다 */
    await expect(page.getByRole("checkbox", { name: "전체 선택" })).toBeVisible();
    await expect(page.getByRole("button", { name: "확정", exact: true })).toBeEnabled();
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
    await expect(page.getByTestId("confirmed-count")).toHaveText("확정 13명");
    await expect(page.getByTestId("applicant").filter({ hasText: "권나연" })).toContainText("지원");
    await expect(page.getByTestId("applicant").filter({ hasText: "권나연" }).getByRole("button", { name: "확정", exact: true })).toBeVisible();
  });

  test("S525 모집이 끝난 모집은 서버도 확정·거절을 저장하지 않는다", async ({ page }) => {
    await page.goto(BOOKLOG_MANAGE);
    /*
     * 화면으로는 보낼 수 없는 요청을 만든다: 북로그 확정 요청을 모집이 끝난 1차 모집의 대기 지원자(조하은) 거절로 바꾼다.
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
    await expect(page.getByTestId("confirmed-count")).toHaveText("확정 5명");
  });

  test("S525 확정 결과는 요약·분석·내 프로젝트에도 반영되고 새로고침해도 남는다", async ({ page }) => {
    await page.goto(BOOKLOG_MANAGE);
    await page.getByRole("checkbox", { name: "전체 선택" }).check();
    await page.getByRole("checkbox", { name: /선택$/ }).last().uncheck();
    await page.getByRole("button", { name: "선택한 7명 확정" }).click();
    const summaryValue = (term: string) =>
      page.locator("dl div").filter({ has: page.getByRole("term").filter({ hasText: new RegExp(`^${term}$`) }) }).getByRole("definition");
    await expect(summaryValue("확정 인원")).toHaveText("20명");
    await expect(page.getByRole("main").getByText("모집 중", { exact: true })).toBeVisible();

    await page.reload();
    await expect(page.getByTestId("confirmed-count")).toHaveText("확정 20명");

    await page.goto(`${BOOKLOG_MANAGE}?tab=analytics`);
    await expect(summaryValue("확정 수")).toHaveText("20명");

    await page.goto("/developer/projects");
    await expect(page.getByTestId("todo").filter({ hasText: "지원자 1명이 확정을 기다려요" })).toHaveCount(1);
    const overview = page.getByRole("region", { name: "전체 현황" });
    await expect(overview.getByRole("term")).toHaveText(["모집 중", "테스트 중", "신고 대기"]);
  });
});

test.describe("R108 피드백 탭", () => {
  test.beforeEach(async ({ context }) => {
    await setDemo(context, { role: "developer" });
  });

  test("S509 사유를 적어 신고하고, Esc로 닫으면 포커스가 돌아온다", async ({ page }) => {
    await page.goto(`${FIRST_MANAGE}?tab=feedback`);
    const row = page.getByTestId("feedback").first();
    const reportButton = row.getByRole("button", { name: "신고하기" });

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
    await expect(row.getByRole("button", { name: "신고 정보" })).toBeVisible();
    await expect(reportButton).toHaveCount(0);
  });
});

test.describe("#62-R3 모집 취소", () => {
  test.beforeEach(async ({ context }) => {
    await setDemo(context, { role: "developer" });
  });

  test("#62-S16 확정 테스터가 없는 테스트 전 모집은 확인만 받고 바로 취소한다", async ({ page }) => {
    await page.goto(FOLIO_NEXT_MANAGE);
    await page.getByRole("button", { name: "모집 취소", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "모집을 취소할까요?" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel("취소 사유")).toHaveCount(0);
    await dialog.getByRole("button", { name: "닫기" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByTestId("cancel-status")).toHaveCount(0);

    await page.getByRole("button", { name: "모집 취소", exact: true }).click();
    await dialog.getByRole("button", { name: "모집 취소하기" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByTestId("cancel-status")).toContainText("모집을 취소했어요");
    await expect(page.getByRole("main").getByText("취소", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "모집 취소", exact: true })).toHaveCount(0);

    await page.reload();
    await expect(page.getByTestId("cancel-status")).toContainText("모집을 취소했어요");

    /* 공개 페이지는 없어지고, 전체 현황의 모집 중 숫자에서 빠진다 */
    await page.goto("/recruitments/folio-builder-next");
    await expect(page.getByText("찾는 페이지가 없어요")).toBeVisible();
    await page.goto("/developer/projects");
    const overview = page.getByRole("region", { name: "전체 현황" });
    const tile = overview.locator("div").filter({ has: page.getByRole("term").filter({ hasText: /^모집 중$/ }) });
    await expect(tile.getByRole("definition")).toHaveText("2건");
  });

  test("#62-S17 확정 테스터가 있는 테스트 전 모집과 이미 취소한 모집은 취소할 수 없다", async ({ page }) => {
    for (const manage of [BOOKLOG_MANAGE, FOLIO_MANAGE]) {
      await page.goto(manage);
      await expect(page.getByText("확정된 테스터가 있어 취소할 수 없어요")).toBeVisible();
      await expect(page.getByRole("button", { name: "모집 취소", exact: true })).toHaveCount(0);
    }
    await page.goto(FOLIO_OLD_MANAGE);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: "모집 취소", exact: true })).toHaveCount(0);
  });

  test("#74-S1 테스트 중에는 사유를 적어야 취소하고, 낸 피드백의 보상은 유지한다", async ({ page }) => {
    await page.goto(FIRST_MANAGE);
    await page.getByRole("button", { name: "모집 취소", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "모집을 취소할까요?" });
    await dialog.getByRole("button", { name: "모집 취소하기" }).click();
    await expect(dialog.getByText("취소 사유를 적어 주세요")).toBeVisible();
    await expect(dialog.getByLabel("취소 사유")).toBeFocused();

    await dialog.getByLabel("취소 사유").fill("심각한 장애로 테스트를 이어갈 수 없어요");
    await dialog.getByRole("button", { name: "모집 취소하기" }).click();
    await expect(dialog).toBeHidden();
    const status = page.getByTestId("cancel-status");
    await expect(status).toContainText("이미 낸 피드백의 보상은 그대로 지급돼요");
    await expect(status).toContainText("취소 사유: 심각한 장애로 테스트를 이어갈 수 없어요");

    /* 피드백을 낸 4명은 확정으로 남고, 안 낸 윤슬과 대기 지원자는 참여 취소다 */
    await expect(page.getByTestId("applicant").filter({ hasText: "김하늘" })).toContainText("확정");
    await expect(page.getByTestId("applicant").filter({ hasText: "윤슬" })).toContainText("참여 취소");
    await expect(page.getByTestId("applicant").filter({ hasText: "참여 취소" })).toHaveCount(3);
    await expect(page.getByTestId("confirmed-count")).toContainText("확정 4명");
  });
});

test.describe("#134-R2 유료 기능 버튼", () => {
  test("#134-S5 AI 질문 받기를 누르면 질문 3개가 보이고, 누른 질문이 복사된다", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await setDemo(context, { role: "developer" });
    await page.goto(`${FIRST_MANAGE}?tab=feedback`);
    const open = page.getByRole("button", { name: "김하늘님 피드백으로 AI 질문 받기" });
    await open.click();

    const dialog = page.getByRole("dialog", { name: "AI 추천 질문" });
    const questions = dialog.getByRole("listitem");
    await expect(questions).toHaveCount(3);
    const first = questions.first().getByRole("button");
    const text = (await first.innerText()).trim();
    await first.click();
    await expect(first).toContainText("복사했어요");
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(text);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(open).toBeFocused();
  });
});
