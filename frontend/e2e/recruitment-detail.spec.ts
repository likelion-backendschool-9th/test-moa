import { expect, test } from "@playwright/test";
import { setDemo } from "./helpers";

test.describe("#63-R1 모집글 상세", () => {
  test("#63-S1 비로그인도 일정·보상·조건·항목을 보고 지원으로 넘어간다", async ({ page, context }) => {
    await setDemo(context, { role: "guest" });
    await page.goto("/recruitments/booklog");
    await expect(page).toHaveURL("/recruitments/booklog");
    await expect(page.getByRole("heading", { level: 1, name: "북로그 2차 베타 테스터 모집" })).toBeVisible();
    await expect(page.getByText("모집 중", { exact: true })).toBeVisible();
    /* 맨 위 배지와 요약 두 곳에 있다 */
    await expect(page.getByText("추가 보상", { exact: true })).toHaveCount(2);
    await expect(page.getByText("구독 모집", { exact: true })).toHaveCount(0);
    const summary = page.getByRole("complementary", { name: "모집 요약" });
    for (const term of ["모집 마감", "피드백 제출 마감", "선정 방식", "기본 보상", "추가 보상"]) {
      await expect(summary.getByRole("term").filter({ hasText: new RegExp(`^${term}$`) })).toBeVisible();
    }
    await expect(summary.getByRole("term").filter({ hasText: /^인원$/ })).toHaveCount(0);
    await expect(page.getByText(/한 달에 책을 한 권 이상 읽는 분/)).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: "책 검색해서 등록하기" })).toContainText("필수");
    await expect(page.getByRole("listitem").filter({ hasText: "독서 기록 쓰기" })).toContainText("선택");
    /* 접속 링크는 확정된 테스터에게만 안내한다 */
    await expect(page.getByRole("main").getByText("booklog.example.com")).toHaveCount(0);

    await summary.getByRole("link", { name: "지원하기" }).click();
    await expect(page).toHaveURL("/recruitments/booklog/apply");
    await expect(page.getByRole("heading", { name: "준비 중인 페이지예요" })).toBeVisible();
  });

  test("#63-S2 모집 마감 전이면 지원하고, 마감되면 지원할 수 없다", async ({ page }) => {
    await page.goto("/recruitments/folio-builder");
    await expect(page.getByText("모집 중", { exact: true })).toBeVisible();
    /* 추가 보상이 없으면 배지도 없다 */
    await expect(page.getByText("추가 보상", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "지원하기" })).toBeVisible();

    await page.goto("/recruitments/memo-garden");
    await expect(page.getByText("모집이 마감됐어요")).toBeVisible();
    await expect(page.getByRole("link", { name: "지원하기" })).toHaveCount(0);
  });
});
