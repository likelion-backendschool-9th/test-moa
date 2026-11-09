import { expect, test } from "@playwright/test";
import {
  getEditLocks,
  validatePostEdit,
  validateRepository,
  validateRepositoryConnect,
  validateTermsEdit,
  validateTestItemsEdit,
} from "@/features/recruitment/types";

/* 모집 정보 탭의 잠금과 영역별 검증. 화면에서 막아도 요청은 조작될 수 있어서 서버 검증을 직접 확인한다 */

const form = (entries: Array<[string, string]>) => {
  const data = new FormData();
  for (const [key, value] of entries) data.append(key, value);
  return data;
};

/* 한국 시간 11월 15일, 11월 22일 */
const current = {
  isSubscription: false,
  selectionMode: "firstCome" as const,
  recruitDeadline: "2026-11-15T03:00:00Z",
  submitDeadline: "2026-11-22T03:00:00Z",
};
const open = getEditLocks({ status: "recruiting" }, 0, []);

test("잠금: 지원자가 있으면 선정 방식, 모집 마감 뒤에는 모집 마감일, 피드백이 달린 항목은 삭제를 막는다", () => {
  expect(getEditLocks({ status: "testing" }, 2, [{ testItemId: "t1" }, { testItemId: "t1" }, { testItemId: null }])).toEqual({
    readOnly: false,
    selectionMode: true,
    recruitDeadline: true,
    lockedItemIds: ["t1"],
  });
  expect(getEditLocks({ status: "closed" }, 0, []).readOnly).toBe(true);
  expect(getEditLocks({ status: "cancelled" }, 0, []).readOnly).toBe(true);
});

test("글 정보: 카테고리는 하나 이상, 정해진 값만 받는다", () => {
  const base: Array<[string, string]> = [["title", "모집"], ["request", "설명"], ["accessUrl", "https://example.com"]];
  expect(validatePostEdit(form([...base, ["categories", "web"], ["categories", "game"]])).errors).toEqual({});
  expect(validatePostEdit(form(base)).errors).toEqual({ categories: "카테고리를 하나 이상 골라 주세요" });
  expect(validatePostEdit(form([...base, ["categories", "desktop"]])).errors).toEqual({ categories: "카테고리를 하나 이상 골라 주세요" });
});

test("모집 정보: 마감일은 미루기만, 잠긴 선정 방식은 바꿀 수 없다", () => {
  const dates = (recruit: string, submit: string): Array<[string, string]> => [["recruitDeadline", recruit], ["submitDeadline", submit]];
  expect(validateTermsEdit(form(dates("2026-11-15", "2026-11-22")), current, open).errors).toEqual({});
  expect(validateTermsEdit(form(dates("2026-11-20", "2026-11-25")), current, open).errors).toEqual({});
  expect(validateTermsEdit(form(dates("2026-11-14", "2026-11-21")), current, open).errors).toEqual({
    recruitDeadline: "모집 마감일은 미루기만 할 수 있어요",
    submitDeadline: "제출 마감일은 미루기만 할 수 있어요",
  });

  const locked = { ...open, selectionMode: true, recruitDeadline: true };
  /* 꺼 둔 라디오는 값이 오지 않으니 지금 값으로 본다 */
  expect(validateTermsEdit(form(dates("2026-11-15", "2026-11-22")), current, locked).errors).toEqual({});
  expect(validateTermsEdit(form([["submitDeadline", "2026-11-22"]]), current, locked).errors).toEqual({});
  expect(validateTermsEdit(form([["selectionMode", "selection"], ...dates("2026-11-16", "2026-11-22")]), { ...current, isSubscription: true }, locked).errors).toEqual({
    selectionMode: "지원자가 있어 선정 방식을 바꿀 수 없어요",
    recruitDeadline: "모집이 마감돼 바꿀 수 없어요",
  });
  expect(validateTermsEdit(form([["selectionMode", "selection"], ...dates("2026-11-15", "2026-11-22")]), current, open).errors).toEqual({
    selectionMode: "선발형은 구독 모집에서만 쓸 수 있어요",
  });
});

test("테스트 정보: 피드백이 달린 항목은 빠지면 안 되고, 순서와 새 항목은 받는다", () => {
  const row = (id: string, title: string): Array<[string, string]> => [["testItemId", id], ["testItemTitle", title], ["testItemDescription", ""]];
  expect(validateTestItemsEdit(form([...row("", "새 항목"), ...row("t2", "둘"), ...row("t1", "하나")]), ["t1"]).errors).toEqual({});
  expect(validateTestItemsEdit(form(row("t2", "둘")), ["t1"]).errors).toEqual({ testItems: "피드백이 달린 항목은 지울 수 없어요" });
  expect(validateTestItemsEdit(form([...row("t1", "하나"), ...row("", "")]), ["t1"]).errors).toEqual({ "testItemTitle-1": "항목 이름을 적어 주세요" });
  expect(validateTestItemsEdit(form([]), []).errors).toEqual({ testItems: "테스트 항목을 1개 이상 적어 주세요" });
});

test("GitHub 저장소: owner/repo와 GitHub 주소를 받아 owner/repo로 맞춘다", () => {
  for (const input of ["moa/booklog", "https://github.com/moa/booklog", "https://github.com/moa/booklog.git", "https://github.com/moa/booklog/"]) {
    expect(validateRepository(form([["repository", input]]))).toEqual({ values: { repository: "moa/booklog" }, errors: {} });
  }
  for (const input of ["", "booklog", "https://gitlab.com/moa/booklog", "moa/booklog/issues"]) {
    expect(validateRepository(form([["repository", input]])).errors).toEqual({ repository: "owner/repo 형식이나 GitHub 주소를 적어 주세요" });
  }
});

test("#227-S9 백엔드 연결은 토큰이 있어야 하고, 목업은 토큰 없이 저장소만 확인한다", () => {
  const repoOnly = form([["repository", "moa/booklog"]]);
  expect(validateRepositoryConnect(repoOnly, true).errors).toEqual({ token: "GitHub 토큰을 적어 주세요" });
  expect(validateRepositoryConnect(form([["repository", "moa/booklog"], ["token", "   "]]), true).errors).toEqual({ token: "GitHub 토큰을 적어 주세요" });
  expect(validateRepositoryConnect(form([["repository", "https://github.com/moa/booklog.git"], ["token", "ghp_x"]]), true)).toEqual({ values: { repository: "moa/booklog" }, errors: {} });
  expect(validateRepositoryConnect(repoOnly, false)).toEqual({ values: { repository: "moa/booklog" }, errors: {} });
  // 저장소가 틀리면 토큰이 있어도 저장소 오류만 알린다
  expect(validateRepositoryConnect(form([["repository", "booklog"], ["token", "ghp_x"]]), true).errors).toEqual({ repository: "owner/repo 형식이나 GitHub 주소를 적어 주세요" });
});
