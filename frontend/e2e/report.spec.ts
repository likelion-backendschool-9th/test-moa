import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow, openMoreMenu, setDemo } from "./helpers";

/* 모집 글·채팅방 신고 창(#85). 목업은 저장하지 않고 접수한 것으로 보인다. 실제 백엔드 접수는 #85-S26 [직접] */

test.describe("#85-R6 모집 글·채팅방 신고", () => {
  test("#85-S22 로그인한 회원은 모집 상세에서 사유를 적어 모집 글을 신고한다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/recruitments/booklog");
    const summary = page.getByRole("complementary", { name: "모집 요약" });
    const open = summary.getByRole("button", { name: "모집 글 신고하기" });
    await expect(async () => {
      await open.click({ timeout: 2000 });
      await expect(page.getByRole("dialog", { name: "모집 글 신고" })).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 15000 });
    const dialog = page.getByRole("dialog", { name: "모집 글 신고" });
    await expect(dialog).toContainText("북로그");
    await expectNoHorizontalOverflow(page);

    /* 사유 없이 보내면 칸 아래에 알린다 */
    await dialog.getByRole("button", { name: "신고하기" }).click();
    await expect(dialog.getByText("신고 사유를 적어 주세요")).toBeVisible();

    await dialog.getByRole("textbox", { name: "신고 사유" }).fill("모집 조건과 실제 테스트 내용이 달라요");
    await dialog.getByRole("button", { name: "신고하기" }).click();
    const done = page.getByRole("dialog", { name: "신고를 접수했어요" });
    await expect(done).toContainText("내 신고");
    await done.getByRole("button", { name: "확인" }).click();
    await expect(done).toBeHidden();
    await expect(open).toBeFocused();
  });

  test("#85-S23 비로그인은 모집 상세에 신고 버튼이 없다", async ({ page, context }) => {
    await setDemo(context, { role: "guest" });
    await page.goto("/recruitments/booklog");
    await expect(page.getByRole("complementary", { name: "모집 요약" }).getByRole("link", { name: "지원하기" })).toBeVisible();
    await expect(page.getByRole("button", { name: "모집 글 신고하기" })).toHaveCount(0);
  });

  test("#85-S24 증거 파일은 PNG·JPG·WEBP·PDF만 5장까지 고를 수 있다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/recruitments/booklog");
    const open = page.getByRole("button", { name: "모집 글 신고하기" });
    const dialog = page.getByRole("dialog", { name: "모집 글 신고" });
    await expect(async () => {
      await open.click({ timeout: 2000 });
      await expect(dialog).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 15000 });
    const files = dialog.getByLabel(/증거 파일/);
    const png = (name: string) => ({ name, mimeType: "image/png", buffer: Buffer.from("png") });

    await files.setInputFiles({ name: "memo.txt", mimeType: "text/plain", buffer: Buffer.from("x") });
    await expect(dialog.getByRole("alert")).toHaveText("PNG·JPG·WEBP·PDF 파일만 올릴 수 있어요");
    await expect(dialog.getByRole("button", { name: "신고하기" })).toBeDisabled();

    await files.setInputFiles(["1", "2", "3", "4", "5", "6"].map((n) => png(`${n}.png`)));
    await expect(dialog.getByRole("alert")).toHaveText("증거 파일은 5장까지 올릴 수 있어요");

    await files.setInputFiles([png("capture.png"), { name: "chat.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF") }]);
    await expect(dialog.getByRole("alert")).toHaveCount(0);
    await dialog.getByRole("textbox", { name: "신고 사유" }).fill("욕설이 담긴 화면이에요");
    await dialog.getByRole("button", { name: "신고하기" }).click();
    await expect(page.getByRole("dialog", { name: "신고를 접수했어요" })).toBeVisible();
  });

  test("#85-S25 채팅방 더보기의 신고하기로 상대를 신고하고, 취소하면 메뉴 버튼으로 돌아간다", async ({ page, context }) => {
    await setDemo(context, { role: "tester" });
    await page.goto("/my/chats/ledger-yunseul");
    const more = page.getByRole("button", { name: "가계부 노트 채팅 더보기" });
    await openMoreMenu(more);
    await expect(page.getByRole("menuitem")).toHaveText(["대화방 이름 변경", "신고하기", "대화방 삭제"]);
    await page.getByRole("menuitem", { name: "신고하기" }).click();
    const dialog = page.getByRole("dialog", { name: "채팅 신고" });
    await expect(dialog).toContainText("가계부 노트");
    await dialog.getByRole("button", { name: "취소" }).click();
    await expect(dialog).toBeHidden();
    await expect(more).toBeFocused();

    await openMoreMenu(more);
    await page.getByRole("menuitem", { name: "신고하기" }).click();
    await dialog.getByRole("textbox", { name: "신고 사유" }).fill("대화 중 욕설을 했어요");
    await dialog.getByRole("button", { name: "신고하기" }).click();
    await expect(page.getByRole("dialog", { name: "신고를 접수했어요" })).toBeVisible();
  });
});
