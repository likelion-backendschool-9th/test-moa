import { expect, test } from "@playwright/test";
import { setDemo } from "./helpers";

/* docs/frontend/projects.md의 R101~R110 시나리오. S번호는 문서와 1:1로 맞춘다 */

const BOOKLOG = "/my/projects/booklog";
const BOOKLOG_MANAGE = `${BOOKLOG}/recruitments/booklog`;
/* 모집이 끝나고 테스트 중인 지난 모집. 피드백·AI 분석이 있다 */
const FIRST_MANAGE = `${BOOKLOG}/recruitments/booklog-first`;
const FOLIO_MANAGE = "/my/projects/folio-builder/recruitments/folio-builder";
/* 개발자가 취소한 지난 무료 모집 */
const FOLIO_OLD_MANAGE = "/my/projects/folio-builder/recruitments/folio-builder-old";
/* 확정 테스터가 아직 없는 무료 모집 */
const FOLIO_NEXT_MANAGE = "/my/projects/folio-builder/recruitments/folio-builder-next";

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
    await page.getByRole("button", { name: "등록" }).click();
    await expect(page.getByText("프로젝트 이름을 적어 주세요")).toBeVisible();
    const name = page.getByLabel("프로젝트 이름");
    await expect(name).toBeFocused();
    await expect(name).toHaveAttribute("aria-describedby", /field-name-error/);
    await expect(page).toHaveURL("/my/projects/new");

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
    await expect(page).toHaveURL("/my/projects?notice=saved");
  });

  test("S491 등록하면 목록으로 가고 시연 안내가 보인다", async ({ page }) => {
    await page.goto("/my/projects/new");
    await page.getByLabel("프로젝트 이름").fill("새 서비스");
    await page.getByRole("button", { name: "등록" }).click();
    await expect(page).toHaveURL("/my/projects?notice=saved");
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

test.describe("R113 프로젝트 이미지·미리보기", () => {
  /* 시연용 파일. 내용은 상관없고 이름·형식·크기만 본다 */
  const file = (name: string, mimeType: string, bytes = 1024) => ({ name, mimeType, buffer: Buffer.alloc(bytes) });
  const png = (name: string) => file(name, "image/png");
  /** 미리보기 대화상자를 연다. Esc로 닫는다 */
  const openPreview = async (page: import("@playwright/test").Page) => {
    await page.getByRole("button", { name: "미리보기" }).click();
    const dialog = page.getByRole("dialog", { name: "미리보기" });
    await expect(dialog).toBeVisible();
    return dialog;
  };

  test.beforeEach(async ({ context, page }) => {
    await setDemo(context, { role: "developer" });
    await page.goto("/my/projects/new");
  });

  test("S145 등록 폼에 이름·상세 설명·대표 이미지만 있다", async ({ page }) => {
    for (const label of ["프로젝트 이름", "상세 설명 (선택)", "대표 이미지 (선택)"]) {
      await expect(page.getByLabel(label)).toBeVisible();
    }
    await expect(page.getByLabel("한 줄 소개")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "링크 추가" })).toHaveCount(0);
    await expect(page.getByRole("radio")).toHaveCount(0);
    /* 미리보기는 등록 버튼 옆에 있고 누르면 대화상자로 열린다 */
    await expect(page.getByRole("button", { name: "미리보기" })).toBeVisible();
  });

  test("S146 대표 이미지를 고르면 썸네일이 보이고, 다시 고르면 바뀌며, 한도를 넘으면 막는다", async ({ page }) => {
    const input = page.getByLabel("대표 이미지 (선택)");
    await expect(input).not.toHaveAttribute("multiple");
    await expect(page.getByText("이미지 고르기")).toBeVisible();
    await input.setInputFiles(png("첫화면.png"));
    const items = page.getByTestId("image-item");
    await expect(items).toHaveCount(1);
    await expect(page.getByText("이미지 바꾸기")).toBeVisible();
    const dialog = await openPreview(page);
    await expect(dialog.getByRole("img", { name: "프로젝트 대표 이미지" })).toBeVisible();
    await page.keyboard.press("Escape");

    await input.setInputFiles(png("기록.png"));
    await expect(items).toHaveCount(1);
    await page.getByRole("button", { name: "기록.png 삭제" }).click();
    await expect(items).toHaveCount(0);

    await input.setInputFiles(png("첫화면.png"));
    await input.setInputFiles([file("움짤.gif", "image/gif")]);
    await expect(page.getByText("PNG, JPG, WEBP 이미지만 올릴 수 있어요")).toBeVisible();
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await input.setInputFiles([file("큰.png", "image/png", 6 * 1024 * 1024)]);
    await expect(page.getByText("이미지는 5MB까지 올릴 수 있어요")).toBeVisible();
    await expect(page.getByRole("button", { name: "첫화면.png 삭제" })).toBeVisible();
  });

  test("S363 다른 화면에 갔다가 뒤로 와도 고른 이미지가 깨지지 않는다", async ({ page }) => {
    /* 1x1 PNG. 실제로 그려지는지 봐야 해서 올바른 이미지를 쓴다 */
    const buffer = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
    await page.getByLabel("대표 이미지 (선택)").setInputFiles({ name: "첫화면.png", mimeType: "image/png", buffer });
    const items = page.getByTestId("image-item");
    await expect(items).toHaveCount(1);

    await page.getByRole("link", { name: "취소" }).click();
    await expect(page).not.toHaveURL(/\/new$/);
    await page.goBack();
    await expect(items).toHaveCount(1);

    const dialog = await openPreview(page);
    const hero = dialog.getByRole("img", { name: "프로젝트 대표 이미지" });
    await expect(hero).toBeVisible();
    await expect.poll(() => hero.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth)).toBeGreaterThan(0);
  });

  test("S366 샘플 이미지가 상세와 수정 폼에 보이고, 이미지가 없으면 기본 이미지가 보인다", async ({ page }) => {
    await page.goto(BOOKLOG);
    const cover = page.getByRole("img", { name: /대표 이미지$/ });
    await expect(cover).toBeVisible();
    await expect.poll(() => cover.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth)).toBeGreaterThan(0);

    await page.goto(`${BOOKLOG}/edit`);
    await expect(page.getByTestId("image-item")).toHaveCount(1);

    await page.goto("/my/projects/folio-builder");
    await expect.poll(() => cover.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth)).toBeGreaterThan(0);

    await page.goto("/my/projects/todo-memo");
    const fallback = page.getByRole("img", { name: "기본 프로젝트 이미지" });
    await expect(fallback).toBeVisible();
    await expect.poll(() => fallback.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth)).toBeGreaterThan(0);
    await page.goto("/my/projects/todo-memo/edit");
    await expect(page.getByTestId("image-item")).toHaveCount(0);

    /* 수정에서 이미지를 지워도 저장되고, 미리보기에는 기본 이미지가 보인다 */
    await page.goto(`${BOOKLOG}/edit`);
    await page.getByRole("button", { name: /삭제$/ }).click();
    await page.getByRole("button", { name: "미리보기" }).click();
    await expect(page.getByRole("dialog", { name: "미리보기" }).getByRole("img", { name: "기본 프로젝트 이미지" })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "저장" }).click();
    await expect(page).toHaveURL(`${BOOKLOG}?notice=saved`);
  });

  test("S149 미리보기 버튼을 누르면 지금 적은 내용을 상세 화면 모양으로 보여 준다", async ({ page }) => {
    const button = page.getByRole("button", { name: "미리보기" });
    /* 등록 버튼 바로 옆에 있다 */
    await expect(page.getByRole("button", { name: "등록" }).locator("xpath=following-sibling::*[1]")).toHaveText("미리보기");
    let dialog = await openPreview(page);
    await expect(dialog.getByRole("heading", { name: "프로젝트 이름" })).toBeVisible();
    await dialog.getByRole("button", { name: "닫기" }).click();
    await expect(dialog).toBeHidden();
    await expect(button).toBeFocused();

    await page.getByLabel("프로젝트 이름").fill("새 서비스");
    await page.getByLabel("상세 설명 (선택)").fill("이번에는 가입 흐름을 보고 싶어요");
    dialog = await openPreview(page);
    await expect(dialog.getByRole("heading", { name: "새 서비스" })).toBeVisible();
    await expect(dialog).toContainText("이번에는 가입 흐름을 보고 싶어요");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("#62-S1 설명이 이미지보다 길면 이미지 높이까지 보이고 더 보기로 펼친다", async ({ page }) => {
    await page.getByLabel("대표 이미지 (선택)").setInputFiles(png("첫화면.png"));
    await page.getByLabel("상세 설명 (선택)").fill("짧은 설명이에요");
    let dialog = await openPreview(page);
    await expect(dialog.getByRole("button", { name: "더 보기" })).toHaveCount(0);
    await page.keyboard.press("Escape");

    await page.getByLabel("상세 설명 (선택)").fill(Array.from({ length: 40 }, (_, index) => `${index + 1}번째 줄 설명`).join("\n"));
    dialog = await openPreview(page);
    const more = dialog.getByRole("button", { name: "더 보기" });
    await expect(more).toHaveAttribute("aria-expanded", "false");
    const text = dialog.getByTestId("project-description");
    const heightOf = async (locator: typeof text) => (await locator.boundingBox())?.height ?? 0;
    const imageHeight = await heightOf(dialog.getByRole("img", { name: /대표 이미지$/ }));
    const clipped = await heightOf(text);
    expect(clipped).toBeLessThanOrEqual(imageHeight);
    /* 다음 줄과 문단 여백까지 합쳐도 들어가지 않을 만큼만 남는다 */
    expect(clipped).toBeGreaterThan(imageHeight - 40);

    await more.click();
    const less = dialog.getByRole("button", { name: "접기" });
    await expect(less).toHaveAttribute("aria-expanded", "true");
    await expect.poll(() => heightOf(text)).toBeGreaterThan(imageHeight * 2);
    await less.click();
    await expect.poll(() => heightOf(text)).toBe(clipped);
    await page.keyboard.press("Escape");
  });
});

test.describe("R104 프로젝트 상세", () => {
  test.beforeEach(async ({ context }) => {
    await setDemo(context, { role: "developer" });
  });

  test("S150 상세 설명이 보이고 수정 폼에 채워져 있다", async ({ page }) => {
    await page.goto(BOOKLOG);
    await expect(page.getByText(/이번에는 책 등록부터 기록 작성까지/)).toBeVisible();

    await page.goto(`${BOOKLOG}/edit`);
    await expect(page.getByLabel("상세 설명 (선택)")).toHaveValue(/읽은 책을 검색해/);
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
    await page.getByLabel("모집글 제목").fill("북로그 3차 테스터 모집");
    await page.getByLabel("모집 설명").fill("회원가입부터 첫 기록까지 해 보기");
    await page.getByLabel("접속 링크").fill("https://booklog.example.com");
    await page.getByLabel("모집 마감일").fill("2099-01-10");
    await page.getByLabel("피드백 제출 마감일").fill("2099-01-20");
    await page.getByLabel("모집 인원").fill("10");
    await page.getByLabel("항목 1 이름").fill("회원가입하기");
    await page.getByRole("button", { name: "모집 등록" }).click();
    await expect(page).toHaveURL(`${BOOKLOG}?notice=saved`);
    await expect(page.getByText("시연용이라 실제로 저장되지는 않아요")).toBeVisible();
  });
});

test.describe("R119 모집글 제목과 선정 조건", () => {
  const NEW = `${BOOKLOG}/recruitments/new`;

  test.beforeEach(async ({ context }) => {
    await setDemo(context, { role: "developer" });
  });

  test("S371 테스트 항목 줄을 지우면 지난 오류가 다른 줄에 붙지 않는다", async ({ page }) => {
    await page.goto(NEW);
    const add = page.getByRole("button", { name: "항목 추가" });
    await add.click();
    await add.click();
    await page.getByLabel("항목 1 이름").fill("회원가입하기");
    await page.getByLabel("항목 2 설명 (선택)").fill("이름 없는 항목");
    await page.getByLabel("항목 3 이름").fill("기록 쓰기");
    await page.getByRole("button", { name: "모집 등록" }).click();
    const error = page.getByText("항목 이름을 적어 주세요");
    await expect(error).toBeVisible();

    /* 기록 쓰기 줄이 둘째로 올라오지만 이름 없는 줄의 오류를 물려받지 않는다 */
    await page.getByRole("button", { name: "항목 1 삭제" }).click();
    await expect(page.getByLabel("항목 2 이름")).toHaveValue("기록 쓰기");
    await expect(error).toHaveCount(0);
  });

  test("S367 구독 모집은 선정 조건을 고르고, 오류가 나도 고른 값이 남는다", async ({ page }) => {
    await page.goto(NEW);
    await expect(page.getByRole("radio", { name: "선발형" })).toBeChecked();
    await page.getByRole("radio", { name: "선착순" }).check();
    await page.getByRole("button", { name: "모집 등록" }).click();
    await expect(page.getByText("모집글 제목을 적어 주세요")).toBeVisible();
    await expect(page.getByLabel("모집글 제목")).toBeFocused();
    await expect(page.getByRole("radio", { name: "선착순" })).toBeChecked();

    await page.getByLabel("모집글 제목").fill("가".repeat(51));
    await page.getByRole("button", { name: "모집 등록" }).click();
    await expect(page.getByText("모집글 제목은 50자까지 적을 수 있어요")).toBeVisible();
  });

  test("S369 접속 링크는 모집글마다 적고 모집 관리에서 새 탭으로 열린다", async ({ page }) => {
    await page.goto("/my/projects/new");
    await expect(page.getByLabel("접속 링크")).toHaveCount(0);

    await page.goto(NEW);
    await page.getByLabel("접속 링크").fill("abc");
    await page.getByRole("button", { name: "모집 등록" }).click();
    await expect(page.getByText("http:// 또는 https://로 시작하는 주소를 적어 주세요")).toBeVisible();

    await page.goto(BOOKLOG_MANAGE);
    const access = page.getByRole("link", { name: /booklog\.example\.com/ });
    await expect(access).toHaveAttribute("target", "_blank");
    await expect(access).toHaveAttribute("rel", "noopener noreferrer");
  });

  test("S368 모집 관리에 모집글 제목과 선정 방식이 보인다", async ({ page }) => {
    const value = (term: string) => page.locator("dt", { hasText: term }).locator("+ dd");
    await page.goto(BOOKLOG_MANAGE);
    await expect(page.getByRole("heading", { level: 1, name: "북로그 2차 베타 테스터 모집" })).toBeVisible();
    await expect(value("선정 방식")).toHaveText("선발형");
    await page.goto(FOLIO_MANAGE);
    await expect(page.getByRole("heading", { level: 1, name: "포트폴리오 빌더 템플릿 테스터 모집" })).toBeVisible();
    await expect(value("선정 방식")).toHaveText("선착순");
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

test.describe("R114 모집 조건과 테스트 항목", () => {
  test.beforeEach(async ({ context }) => {
    await setDemo(context, { role: "developer" });
  });

  test("S352 모집 작성에 모집 조건과 테스트 항목이 있고 항목은 1개 이상이다", async ({ page }) => {
    await page.goto(`${BOOKLOG}/recruitments/new`);
    await expect(page.getByLabel("모집 조건 (선택)")).toBeVisible();
    await expect(page.getByTestId("test-item-row")).toHaveCount(1);
    const add = page.getByRole("button", { name: "항목 추가" });
    for (let i = 1; i < 10; i += 1) await add.click();
    await expect(page.getByTestId("test-item-row")).toHaveCount(10);
    await expect(add).toBeDisabled();
    await page.getByRole("button", { name: "항목 10 삭제" }).click();
    await expect(page.getByTestId("test-item-row")).toHaveCount(9);

    /* 다른 칸은 다 채우고 테스트 항목만 비운다 */
    await page.getByLabel("모집글 제목").fill("북로그 3차 테스터 모집");
    await page.getByLabel("모집 설명").fill("회원가입부터 첫 기록까지 해 보기");
    await page.getByLabel("접속 링크").fill("https://booklog.example.com");
    await page.getByLabel("모집 마감일").fill("2099-01-10");
    await page.getByLabel("피드백 제출 마감일").fill("2099-01-20");
    await page.getByLabel("모집 인원").fill("10");
    await page.getByRole("button", { name: "모집 등록" }).click();
    await expect(page.getByText("테스트 항목을 1개 이상 적어 주세요")).toBeVisible();
    await expect(page.getByLabel("항목 1 이름")).toBeFocused();
  });

  test("S353 모집 관리 화면에서 모집 조건과 테스트 항목을 펼쳐 본다", async ({ page }) => {
    await page.goto(BOOKLOG_MANAGE);
    const box = page.getByText("모집 조건과 테스트 항목 3개");
    await box.click();
    await expect(page.getByText(/한 달에 책을 한 권 이상 읽는 분/)).toBeVisible();
    await expect(page.getByText("책 검색해서 등록하기")).toBeVisible();
    await expect(page.getByText("독서 기록 쓰기")).toBeVisible();
  });

  test("#62-S2 테스트 항목은 처음부터 필수이고, 끈 값은 줄을 지우거나 제출에 실패해도 남으며 모집 관리에 배지로 보인다", async ({ page }) => {
    await page.goto(`${BOOKLOG}/recruitments/new`);
    await expect(page.getByRole("checkbox", { name: "항목 1 필수" })).toBeChecked();
    const add = page.getByRole("button", { name: "항목 추가" });
    await add.click();
    await add.click();
    await page.getByRole("checkbox", { name: "항목 3 필수" }).uncheck();
    await page.getByRole("button", { name: "항목 2 삭제" }).click();
    await expect(page.getByRole("checkbox", { name: "항목 1 필수" })).toBeChecked();
    const second = page.getByRole("checkbox", { name: "항목 2 필수" });
    await expect(second).not.toBeChecked();

    await page.getByRole("button", { name: "모집 등록" }).click();
    await expect(page.getByText("모집글 제목을 적어 주세요")).toBeVisible();
    await expect(second).not.toBeChecked();

    await page.goto(BOOKLOG_MANAGE);
    await page.getByText("모집 조건과 테스트 항목 3개").click();
    await expect(page.getByRole("listitem").filter({ hasText: "책 검색해서 등록하기" })).toContainText("필수");
    await expect(page.getByRole("listitem").filter({ hasText: "독서 기록 쓰기" })).toContainText("선택");
  });

  test("#62-S3 유형은 모집 작성에서 고르고 모집 관리에 보인다", async ({ page }) => {
    await page.goto(`${BOOKLOG}/recruitments/new`);
    await expect(page.getByRole("radio", { name: /웹서비스/ })).toBeChecked();
    for (const label of ["모바일앱", "게임", "API·라이브러리"]) {
      await expect(page.getByRole("radio", { name: new RegExp(label) })).toBeDisabled();
    }
    await page.goto(BOOKLOG_MANAGE);
    await expect(page.getByRole("term").filter({ hasText: /^유형$/ })).toBeVisible();
    await expect(page.getByRole("definition").filter({ hasText: /^웹서비스$/ })).toBeVisible();
  });
});

test.describe("R115 모집 취소", () => {
  test.beforeEach(async ({ context }) => {
    await setDemo(context, { role: "developer" });
  });

  test("S354 확정 테스터가 없는 테스트 전 모집은 확인만 받고 바로 취소한다", async ({ page }) => {
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
    await page.goto("/my/projects");
    const overview = page.getByRole("region", { name: "전체 현황" });
    const tile = overview.locator("div").filter({ has: page.getByRole("term").filter({ hasText: /^모집 중$/ }) });
    await expect(tile.getByRole("definition")).toHaveText("1건");
  });

  test("S355 확정 테스터가 있는 테스트 전 모집과 이미 취소한 모집은 취소할 수 없다", async ({ page }) => {
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

  test("S372 쿠키의 취소 시각이 깨져 있어도 화면이 열리고 그 기록은 버린다", async ({ page, context }) => {
    await context.addCookies([
      {
        name: "demo-recruitment-cancel-folio-builder-next",
        value: encodeURIComponent(JSON.stringify({ reason: "", cancelledAt: "bad" })),
        url: "http://localhost:3100",
      },
    ]);
    await page.goto(FOLIO_NEXT_MANAGE);
    await expect(page.getByRole("button", { name: "모집 취소", exact: true })).toBeVisible();
    await expect(page.getByTestId("cancel-status")).toHaveCount(0);
  });

  test("S365 긴 사유로 취소해도 저장된다", async ({ page }) => {
    await page.goto(FIRST_MANAGE);
    await page.getByRole("button", { name: "모집 취소", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "모집을 취소할까요?" });
    await dialog.getByLabel("취소 사유").fill("가".repeat(300));
    await dialog.getByRole("button", { name: "모집 취소하기" }).click();
    await expect(dialog).toBeHidden();
    await page.reload();
    await expect(page.getByTestId("cancel-status")).toContainText("가".repeat(300));
  });

  test("S357 취소한 모집은 취소 상태이고 진행 숫자에서 빠진다", async ({ page }) => {
    await page.goto(FOLIO_OLD_MANAGE);
    await expect(page.getByTestId("cancel-status")).toContainText("모집을 취소했어요");
    await expect(page.getByTestId("cancel-status")).toContainText("취소 사유: 서비스 화면을 크게 바꿔서 다시 모집할게요");
    await expect(page.getByRole("main").getByText("취소", { exact: true })).toBeVisible();
    await expect(page.getByTestId("applicant").filter({ hasText: "참여 취소" })).toHaveCount(3);

    await page.goto("/my/projects");
    const folio = page.getByRole("region", { name: "프로젝트 3개" }).getByRole("listitem").filter({ hasText: "포트폴리오 빌더" });
    await expect(folio).toContainText("모집 2건 · 모집 중 1건");
    const overview = page.getByRole("region", { name: "전체 현황" });
    const tile = overview.locator("div").filter({ has: page.getByRole("term").filter({ hasText: /^모집 완료$/ }) });
    await expect(tile.getByRole("definition")).toHaveText("1건");

    await page.goto("/my/projects/folio-builder");
    const cancelled = page.getByRole("listitem").filter({ hasText: "포트폴리오 빌더 첫 버전 테스트" });
    await expect(cancelled).toBeVisible();
    await expect(cancelled.getByRole("link", { name: "공개 페이지 보기" })).toHaveCount(0);
  });
});

test.describe("R116 테스터 제출 현황·채팅·참여 취소", () => {
  test.beforeEach(async ({ context }) => {
    await setDemo(context, { role: "developer" });
  });

  test("S358 테스트 중이면 확정 테스터마다 피드백 제출 현황이 보인다", async ({ page }) => {
    await page.goto(FIRST_MANAGE);
    await expect(page.getByTestId("submission-summary")).toHaveText("피드백 제출 4명 · 미제출 1명 · 미완료 0명");
    await expect(page.getByTestId("applicant").filter({ hasText: "김하늘" })).toContainText("제출함");
    await expect(page.getByTestId("applicant").filter({ hasText: "윤슬" })).toContainText("미제출");

    /* 테스트 전(모집 중)에는 제출 현황이 없다 */
    await page.goto(BOOKLOG_MANAGE);
    await expect(page.getByTestId("submission-summary")).toHaveCount(0);
  });

  test("S359 확정 뒤 참여를 취소한 테스터는 참여 취소로 보이고 확정 수에서 빠진다", async ({ page }) => {
    await page.goto(FIRST_MANAGE);
    await expect(page.getByTestId("applicant").filter({ hasText: "참여 취소" })).toHaveCount(1);
    await expect(page.getByTestId("confirmed-count")).toHaveText("확정 5명 · 정원 5명");
  });

  test("S360 구독 모집의 확정 테스터에게 채팅 바로가기가 있다", async ({ page }) => {
    await page.goto(FIRST_MANAGE);
    await expect(page.getByRole("link", { name: "김하늘님과 채팅" })).toHaveAttribute("href", `/my/chats?q=${encodeURIComponent("김하늘")}`);
    /* 확정되지 않은 테스터와 무료 모집에는 없다 */
    await expect(page.getByRole("link", { name: /님과 채팅$/ })).toHaveCount(5);
    await page.goto(FOLIO_MANAGE);
    await expect(page.getByRole("link", { name: /님과 채팅$/ })).toHaveCount(0);
  });
});

test.describe("R117 항목별 피드백과 스크린샷", () => {
  test("S370 채팅 바로가기는 그 테스터와의 채팅으로 이어진다", async ({ page, context }) => {
    await setDemo(context, { role: "developer" });
    await page.goto(FIRST_MANAGE);
    await page.getByRole("link", { name: "윤슬님과 채팅" }).click();
    await expect(page).toHaveURL(/\/my\/chats\?q=/);
    await expect(page.getByRole("main")).toContainText("윤슬");
    await expect(page.getByRole("main")).toContainText("가계부");
  });

  test("S361 피드백마다 테스트 항목과 스크린샷이 보이고 항목별 수가 있다", async ({ page, context }) => {
    await setDemo(context, { role: "developer" });
    await page.goto(`${FIRST_MANAGE}?tab=feedback`);
    await expect(page.getByTestId("feedback-by-item")).toHaveText("항목별 책 검색하기 2건 · 저장한 문장 다시 찾기 1건 · 기타 의견 1건 · 추천 1건");
    const first = page.getByTestId("feedback").filter({ hasText: "김하늘" });
    await expect(first).toContainText("책 검색하기");
    await expect(first.getByRole("img", { name: "표지가 비어 있는 검색 결과" })).toBeVisible();
    await expect(page.getByTestId("feedback").filter({ hasText: "이도윤" })).toContainText("기타 의견");
  });
});

test.describe("R118 피드백 추천", () => {
  test("S362 도움이 된 피드백을 추천하고 다시 누르면 뺀다. 신고된 피드백은 추천할 수 없다", async ({ page, context }) => {
    await setDemo(context, { role: "developer" });
    await page.goto(`${FIRST_MANAGE}?tab=feedback`);
    const count = page.getByTestId("recommended-count");
    await expect(count).toHaveText("· 추천 1건");
    await expect(page.getByRole("button", { name: "박서아님의 피드백 추천" })).toHaveAttribute("aria-pressed", "true");

    const like = page.getByRole("button", { name: "김하늘님의 피드백 추천" });
    await expect(like).toHaveAttribute("aria-pressed", "false");
    await like.click();
    await expect(like).toHaveAttribute("aria-pressed", "true");
    await expect(like).toHaveText("추천함");
    await expect(count).toHaveText("· 추천 2건");
    await expect(page.locator('[aria-live="polite"]').filter({ hasText: "김하늘님의 피드백을 추천했어요" })).toHaveCount(1);
    await like.click();
    await expect(count).toHaveText("· 추천 1건");

    await expect(page.getByRole("button", { name: "이도윤님의 피드백 추천" })).toHaveCount(0);
  });
});
