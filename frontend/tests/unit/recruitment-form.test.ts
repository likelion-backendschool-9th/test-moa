import { expect, test } from "@playwright/test";
import { validateRecruitmentForm } from "@/features/recruitment/types";

const NOW = new Date("2026-11-08T15:00:00Z"); // 한국 시간 11월 9일 0시
const image = { name: "화면.png", size: 1024, type: "image/png" };
function validForm() {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    title: "모집", request: "가입 흐름 확인", selectionMode: "firstCome",
    accessUrl: "https://example.com", recruitDeadline: "2026-11-09", submitDeadline: "2026-11-10",
    testItemTitle: "가입하기", testItemDescription: "", testItemImagesMeta: "[]",
  })) data.set(key, value);
  data.set("softwareTypes", "web");
  return data;
}

test("S498 한국 날짜 기준으로 과거 모집 마감과 모집 마감 이하인 제출 마감을 거절한다", () => {
  const data = validForm();
  expect(validateRecruitmentForm(data, false, NOW).errors).toEqual({});
  data.set("recruitDeadline", "2026-11-08");
  expect(validateRecruitmentForm(data, false, NOW).errors)
    .toEqual({ recruitDeadline: "모집 마감일은 오늘 이후로 골라 주세요" });
  expect(validateRecruitmentForm(data, false, new Date("2026-11-08T14:59:59Z")).errors).toEqual({});
  data.set("recruitDeadline", "2026-11-09");
  for (const date of ["2026-11-08", "2026-11-09"]) {
    data.set("submitDeadline", date);
    expect(validateRecruitmentForm(data, false, NOW).errors)
      .toEqual({ submitDeadline: "제출 마감일은 모집 마감일보다 뒤여야 해요" });
  }
});

test("#124-S2 모집글 이미지 10장 한도는 항목 이미지와 독립적으로 검사한다", () => {
  const data = validForm();
  data.set("testItemImagesMeta", JSON.stringify(Array(5).fill(image)));
  data.set("recruitmentImagesMeta", JSON.stringify(Array(10).fill(image)));
  expect(validateRecruitmentForm(data, true, NOW).errors).toEqual({});
  data.set("recruitmentImagesMeta", JSON.stringify(Array(11).fill(image)));
  expect(validateRecruitmentForm(data, true, NOW).errors)
    .toEqual({ recruitmentImages: "이미지는 10장까지 올릴 수 있어요" });
  data.set("recruitmentImagesMeta", "{");
  expect(validateRecruitmentForm(data, true, NOW).errors)
    .toEqual({ recruitmentImages: "이미지 정보를 읽지 못했어요" });
});

test("#63-S8 항목 이미지는 5장까지이고 이미지가 있는 항목에는 이름이 필요하다", () => {
  const data = validForm();
  data.set("testItemImagesMeta", JSON.stringify(Array(5).fill(image)));
  expect(validateRecruitmentForm(data, true, NOW).errors).toEqual({});
  data.set("testItemImagesMeta", JSON.stringify(Array(6).fill(image)));
  expect(validateRecruitmentForm(data, true, NOW).errors)
    .toEqual({ "testItemImages-0": "이미지는 5장까지 올릴 수 있어요" });
  data.set("testItemTitle", "");
  data.set("testItemImagesMeta", JSON.stringify([image]));
  expect(validateRecruitmentForm(data, true, NOW).errors)
    .toEqual({ "testItemTitle-0": "항목 이름을 적어 주세요" });
});
