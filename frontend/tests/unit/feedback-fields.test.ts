import { expect, test } from "@playwright/test";
import { parseFeedbackForm } from "@/features/participation/feedback-fields";
import type { FeedbackTestItem } from "@/features/participation/types";

const items: FeedbackTestItem[] = [
  { id: "required", title: "가입하기", description: "", required: true },
  { id: "optional", title: "공유하기", description: "", required: false },
];
const image = { name: "화면.png", size: 1024, type: "image/png" };
const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
};

test("S475 #90-S7 필수 칸과 모두 선택인 빈 제출을 거절하고 선택 칸은 생략한다", () => {
  expect(parseFeedbackForm(items, form({ "content-required": "  " })).errors)
    .toEqual({ required: "피드백을 적어 주세요" });
  const optionalItems = items.map((item) => ({ ...item, required: false }));
  expect(parseFeedbackForm(optionalItems, new FormData()))
    .toEqual({ errors: { required: "피드백을 적어 주세요" }, entries: [] });

  const result = parseFeedbackForm(items, form({
    "content-required": "  가입했어요  ", "content-other": "기타 의견",
    "content-unknown": "서버에 없는 항목", "imagesMeta-required": JSON.stringify([image]),
  }));
  expect(result).toEqual({ errors: {}, entries: [
    { testItemId: "required", content: "가입했어요", imageNames: ["화면.png"] },
    { testItemId: null, content: "기타 의견", imageNames: [] },
  ] });
});

test("#90-S4 각 칸은 500자까지 받고 초과한 칸만 오류로 돌린다", () => {
  for (const key of ["required", "optional", "other"]) {
    const data = form({ "content-required": "필수 의견", [`content-${key}`]: "가".repeat(500) });
    expect(parseFeedbackForm(items, data).errors, key).toEqual({});
    data.set(`content-${key}`, "가".repeat(501));
    expect(parseFeedbackForm(items, data).errors, key).toEqual({ [key]: "500자까지 적을 수 있어요" });
  }
});

test("#57-S9 이미지 주소가 있으면 칸 순서대로 읽고 없거나 깨지면 구분한다", () => {
  const urls = [
    "/api/v1/tester/participations/7/feedbacks/images/00000000-0000-0000-0000-000000000001.png",
    "/api/v1/tester/participations/7/feedbacks/images/00000000-0000-0000-0000-000000000002.png",
  ];
  const withUrls = parseFeedbackForm(items, form({ "content-required": "의견", "imageUrls-required": JSON.stringify(urls) }));
  expect(withUrls.errors).toEqual({});
  expect(withUrls.entries[0]?.imageUrls).toEqual(urls);

  expect(parseFeedbackForm(items, form({ "content-required": "의견", "imageUrls-required": "{" })).errors)
    .toEqual({ required: "이미지를 다시 올려 주세요" });

  const mock = parseFeedbackForm(items, form({ "content-required": "의견", "imagesMeta-required": JSON.stringify([image]) }));
  expect(mock.entries[0]).toEqual({ testItemId: "required", content: "의견", imageNames: ["화면.png"] });
  expect(mock.entries[0]).not.toHaveProperty("imageUrls");
});

test("#57-S5 #90-S6 이미지 정보를 칸별로 검증하고 내용 없는 첨부를 거절한다", () => {
  const valid = form({ "content-required": "의견", "imagesMeta-required": JSON.stringify(Array(5).fill(image)) });
  expect(parseFeedbackForm(items, valid).errors).toEqual({});
  const cases: [string, string][] = [
    [JSON.stringify(Array(6).fill(image)), "이미지는 5장까지 올릴 수 있어요"],
    [JSON.stringify([{ ...image, type: "image/gif" }]), "PNG, JPG, WEBP 이미지만 올릴 수 있어요"],
    [JSON.stringify([{ ...image, size: 5 * 1024 * 1024 + 1 }]), "이미지는 한 장에 5MB까지 올릴 수 있어요"],
    ["{", "이미지 정보를 읽지 못했어요. 이미지를 다시 골라 주세요"],
    [JSON.stringify([{ name: "화면.png" }]), "이미지 정보를 읽지 못했어요. 이미지를 다시 골라 주세요"],
  ];
  for (const [metadata, error] of cases) {
    valid.set("imagesMeta-required", metadata);
    expect(parseFeedbackForm(items, valid).errors).toEqual({ required: error });
  }
  const noContent = form({ "content-required": "의견", "imagesMeta-optional": JSON.stringify([image]) });
  expect(parseFeedbackForm(items, noContent).errors).toEqual({ optional: "내용을 적어야 이미지를 넣을 수 있어요" });
});
