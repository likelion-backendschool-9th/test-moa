import { expect, test } from "@playwright/test";
import { pickBannerRecruitments, type Recruitment } from "@/features/recruitment/types";

const item = (slug: string) => ({ slug }) as Recruitment;
const slugs = (items: Recruitment[]) => items.map((row) => row.slug);

test("#212-S1 구독 모집을 받은 순서대로 먼저 놓는다", () => {
  expect(slugs(pickBannerRecruitments([item("s1"), item("s2"), item("s3")], [item("g1"), item("g2"), item("g3")], 3))).toEqual(["s1", "s2", "s3"]);
});

test("#212-S2 구독 모집이 모자라면 남는 자리를 최신순으로 채운다", () => {
  expect(slugs(pickBannerRecruitments([item("s1")], [item("g1"), item("g2"), item("g3")], 3))).toEqual(["s1", "g1", "g2"]);
  expect(slugs(pickBannerRecruitments([], [item("g1"), item("g2"), item("g3")], 3))).toEqual(["g1", "g2", "g3"]);
});

test("#212-S3 전체 최신순에 구독 모집이 섞여 있어도 두 번 넣지 않는다", () => {
  expect(slugs(pickBannerRecruitments([item("s1"), item("s2")], [item("g1"), item("s1"), item("s2")], 3))).toEqual(["s1", "s2", "g1"]);
});

test("#212-S4 모집 건이 모자라면 있는 만큼만 돌려준다", () => {
  expect(slugs(pickBannerRecruitments([item("s1")], [item("s1"), item("g1")], 3))).toEqual(["s1", "g1"]);
  expect(pickBannerRecruitments([], [], 3)).toEqual([]);
});
