import { expect, test } from "@playwright/test";
import { setDemo } from "./helpers";

test.describe("#63-R1 모집글 상세", () => {
  test("#63-S1 비로그인도 일정·보상·조건·항목을 보고 지원으로 넘어간다", async ({ page, context }) => {
    await setDemo(context, { role: "guest" });
    await page.goto("/recruitments/booklog");
    await expect(page).toHaveURL("/recruitments/booklog");
    await expect(page.getByRole("heading", { level: 1, name: "북로그 2차 베타 테스터 모집" })).toBeVisible();
    await expect(page.getByText("모집 중", { exact: true })).toBeVisible();
    await expect(page.getByText("구독 모집", { exact: true })).toBeVisible();
    const summary = page.getByRole("complementary", { name: "모집 요약" });
    for (const term of ["모집 마감", "피드백 제출 마감", "인원", "선정 방식", "기본 보상", "추가 보상"]) {
      await expect(summary.getByRole("term").filter({ hasText: new RegExp(`^${term}$`) })).toBeVisible();
    }
    await expect(summary).toContainText("13 / 20명");
    await expect(page.getByText(/한 달에 책을 한 권 이상 읽는 분/)).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: "책 검색해서 등록하기" })).toContainText("필수");
    await expect(page.getByRole("listitem").filter({ hasText: "독서 기록 쓰기" })).toContainText("선택");
    /* 접속 링크는 확정된 테스터에게만 안내한다 */
    await expect(page.getByRole("main").getByText("booklog.example.com")).toHaveCount(0);

    await summary.getByRole("link", { name: "지원하기" }).click();
    await expect(page).toHaveURL("/recruitments/booklog/apply");
    await expect(page.getByRole("heading", { name: "준비 중인 페이지예요" })).toBeVisible();
  });

  test("#63-S2 정원이 찼거나 마감되면 지원할 수 없다", async ({ page }) => {
    await page.goto("/recruitments/folio-builder");
    await expect(page.getByText("모집 완료", { exact: true })).toBeVisible();
    await expect(page.getByText("정원이 모두 찼어요")).toBeVisible();
    await expect(page.getByRole("link", { name: "지원하기" })).toHaveCount(0);

    await page.goto("/recruitments/memo-garden");
    await expect(page.getByText("모집이 마감됐어요")).toBeVisible();
    await expect(page.getByRole("link", { name: "지원하기" })).toHaveCount(0);
  });

  test("#63-S3 상세 샘플이 없는 모집 건도 기본 내용으로 열린다", async ({ page }) => {
    await page.goto("/recruitments/moaplan");
    await expect(page.getByRole("heading", { level: 1, name: "일정을 만들고 팀원을 초대하는 흐름 확인하기" })).toBeVisible();
    await expect(page.getByRole("img", { name: "기본 프로젝트 이미지" })).toBeVisible();
    await expect(page.getByText("따로 정한 조건이 없어요")).toBeVisible();
    await expect(page.getByRole("heading", { name: /^테스트 항목/ })).toHaveCount(0);
    await expect(page.getByRole("complementary", { name: "모집 요약" })).toContainText("+320 크레딧");
    await expect(page.getByRole("link", { name: "지원하기" })).toHaveAttribute("href", "/recruitments/moaplan/apply");
  });

  test("#63-S4 없거나 취소된 모집 건은 404다", async ({ page }) => {
    for (const slug of ["nope", "folio-builder-old"]) {
      await page.goto(`/recruitments/${slug}`);
      await expect(page.getByRole("heading", { name: "찾는 페이지가 없어요" })).toBeVisible();
    }
  });
});
