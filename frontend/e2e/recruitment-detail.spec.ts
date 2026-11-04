import { expect, test, type Page } from "@playwright/test";
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

  test("#63-S6 상세와 모집 관리에 항목 이미지가 순서대로 보인다", async ({ page, context }) => {
    await page.goto("/recruitments/booklog");
    const images = page.getByRole("list", { name: "책 검색해서 등록하기 이미지 2장" }).getByRole("img");
    await expect(images).toHaveCount(2);
    expect(await images.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("alt")))).toEqual(["책 검색 화면", "내 서재 화면"]);
    await expect.poll(() => images.first().evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth)).toBeGreaterThan(0);
    await expect(page.getByRole("list", { name: /^독서 기록 쓰기 이미지/ })).toHaveCount(0);

    await setDemo(context, { role: "developer" });
    await page.goto("/my/projects/booklog/recruitments/booklog");
    await page.getByText("모집 조건과 테스트 항목 3개").click();
    await expect(page.getByRole("list", { name: "책 검색해서 등록하기 이미지 2장" }).getByRole("img")).toHaveCount(2);
  });

  test("#63-S9 대표 이미지 옆에 항목 이미지를 이어 놓고 버튼으로 넘긴다", async ({ page }) => {
    await page.goto("/recruitments/booklog");
    const gallery = page.getByRole("list", { name: "북로그 이미지 5장" });
    expect(await gallery.getByRole("img").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("alt")))).toEqual([
      "북로그 대표 이미지",
      "책 검색 화면",
      "내 서재 화면",
      "밑줄 긋기 화면",
      "밑줄 모아 보기 화면",
    ]);
    /* 대표 이미지에만 표시가 있다 */
    await expect(gallery.getByText("대표 이미지", { exact: true })).toHaveCount(1);
    await expect(gallery.getByRole("listitem").first()).toContainText("대표 이미지");
    const prev = page.getByRole("button", { name: "이전 이미지" });
    const next = page.getByRole("button", { name: "다음 이미지" });
    const scrollLeft = () => gallery.evaluate((node) => node.scrollLeft);
    await expect(prev).toBeDisabled();

    await next.click();
    await expect.poll(scrollLeft).toBeGreaterThan(0);
    await expect(prev).toBeEnabled();

    /* 1440px에서는 두 번 더 넘기면 끝이다. 끝까지 가면 마지막 이미지가 보이고 다음 버튼이 꺼진다 */
    const second = await scrollLeft();
    await next.click();
    await expect.poll(scrollLeft).toBeGreaterThan(second);
    await next.click();
    await expect(next).toBeDisabled();
    await expect(gallery.getByRole("img", { name: "밑줄 모아 보기 화면" })).toBeInViewport({ ratio: 1 });

    /* 움직이는 중에 빠르게 눌러도 누른 만큼 넘어간다 */
    await prev.click();
    await prev.click();
    await prev.click();
    await expect.poll(scrollLeft).toBe(0);
    await expect(next).toBeEnabled();
    await expect(prev).toBeDisabled();

    /* 항목 이미지가 없으면 대표 이미지만 있고 넘길 것이 없다 */
    await page.goto("/recruitments/moaplan");
    await expect(page.getByTestId("recruitment-gallery").getByRole("img")).toHaveCount(1);
    await expect(page.getByRole("button", { name: "다음 이미지" })).toHaveCount(0);
    await expect(page.getByTestId("recruitment-gallery").getByText("대표 이미지", { exact: true })).toHaveCount(0);
  });

  test("#63-S11 항목 이미지를 크게 보여 주고 누르면 확대해 넘겨 본다", async ({ page, context }) => {
    await page.goto("/recruitments/booklog");
    const opener = page.getByRole("button", { name: "책 검색 화면 크게 보기" });
    expect((await opener.boundingBox())?.width).toBeGreaterThan(200);

    await opener.click();
    const viewer = page.getByRole("dialog", { name: "책 검색해서 등록하기 이미지 크게 보기" });
    await expect(viewer.getByRole("img", { name: "책 검색 화면" })).toBeVisible();
    await expect(viewer).toContainText("1 / 2");

    await viewer.getByRole("button", { name: "다음 이미지" }).click();
    await expect(viewer.getByRole("img", { name: "내 서재 화면" })).toBeVisible();
    await expect(viewer).toContainText("2 / 2");
    await page.keyboard.press("ArrowLeft");
    await expect(viewer.getByRole("img", { name: "책 검색 화면" })).toBeVisible();

    /* Esc, 닫기 버튼, 바깥 클릭으로 닫히고 Esc로 닫으면 누른 이미지로 포커스가 돌아온다 */
    await page.keyboard.press("Escape");
    await expect(viewer).toHaveCount(0);
    await expect(opener).toBeFocused();
    await opener.click();
    await viewer.getByRole("button", { name: "닫기" }).click();
    await expect(viewer).toHaveCount(0);
    await opener.click();
    await expect(viewer).toBeVisible();
    await page.mouse.click(5, 5);
    await expect(viewer).toHaveCount(0);

    await setDemo(context, { role: "developer" });
    await page.goto("/my/projects/booklog/recruitments/booklog");
    await page.getByText("모집 조건과 테스트 항목 3개").click();
    await page.getByRole("button", { name: "책 검색 화면 크게 보기" }).click();
    await expect(page.getByRole("dialog", { name: "책 검색해서 등록하기 이미지 크게 보기" })).toBeVisible();
  });

  test.describe("모집 작성", () => {
    const NEW = "/my/projects/booklog/recruitments/new";
    const PIXEL = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
    const png = (name: string) => ({ name, mimeType: "image/png", buffer: PIXEL });
    const picker = (page: Page, index: number) => page.getByLabel(`항목 ${index} 이미지 (선택)`);

    test.beforeEach(async ({ context }) => {
      await setDemo(context, { role: "developer" });
    });

    test("#63-S7 항목 이미지는 항목당 5장까지이고 넘기면 넣지 않으며, 다른 항목과 따로 센다", async ({ page }) => {
      await page.goto(NEW);
      await page.getByRole("button", { name: "항목 추가" }).click();
      const rows = page.getByTestId("test-item-row");
      const first = rows.nth(0).getByTestId("test-item-image");
      await picker(page, 1).setInputFiles(["1", "2", "3", "4"].map((name) => png(`${name}.png`)));
      await expect(first).toHaveCount(4);

      await picker(page, 1).setInputFiles([png("5.png"), png("6.png")]);
      await expect(rows.nth(0).getByText("이미지는 5장까지 올릴 수 있어요")).toBeVisible();
      await expect(first).toHaveCount(4);

      await picker(page, 1).setInputFiles(png("5.png"));
      await expect(first).toHaveCount(5);
      await expect(rows.nth(0).getByText("이미지는 5장까지 올릴 수 있어요")).toHaveCount(0);

      await picker(page, 2).setInputFiles(["a", "b"].map((name) => png(`${name}.png`)));
      await expect(rows.nth(1).getByTestId("test-item-image")).toHaveCount(2);

      await page.getByRole("button", { name: "항목 1 1.png 삭제" }).click();
      await expect(first).toHaveCount(4);
      expect(await first.getByRole("img").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("alt")))).toEqual(["2.png", "3.png", "4.png", "5.png"]);

      /* 줄을 지우면 그 줄의 이미지도 함께 없어지고, 제출에 실패해도 남은 이미지는 그대로다 */
      await page.getByRole("button", { name: "항목 1 삭제", exact: true }).click();
      await expect(page.getByTestId("test-item-image")).toHaveCount(2);
      await page.getByRole("button", { name: "모집 등록" }).click();
      await expect(page.getByText("모집글 제목을 적어 주세요")).toBeVisible();
      await expect(page.getByTestId("test-item-image")).toHaveCount(2);
    });

    test("#63-S8 서버도 항목 이미지 장수를 다시 확인하고, 이름 없이 이미지만 있으면 막는다", async ({ page }) => {
      await page.goto(NEW);
      await picker(page, 1).setInputFiles(png("화면.png"));
      await expect(page.getByTestId("test-item-image")).toHaveCount(1);
      await page.getByRole("button", { name: "모집 등록" }).click();
      await expect(page.getByText("항목 이름을 적어 주세요")).toBeVisible();

      await page.getByLabel("항목 1 이름").fill("회원가입하기");
      await page.locator('input[name="testItemImagesMeta"]').evaluate((element: HTMLInputElement) => {
        element.value = JSON.stringify(Array.from({ length: 6 }, (_, index) => ({ name: `${index}.png`, size: 1, type: "image/png" })));
      });
      await page.getByRole("button", { name: "모집 등록" }).click();
      await expect(page.getByTestId("test-item-row").getByText("이미지는 5장까지 올릴 수 있어요")).toBeVisible();
    });
  });

  test("#63-S4 없거나 취소된 모집 건은 404다", async ({ page }) => {
    for (const slug of ["nope", "folio-builder-old"]) {
      await page.goto(`/recruitments/${slug}`);
      await expect(page.getByRole("heading", { name: "찾는 페이지가 없어요" })).toBeVisible();
    }
  });
});
