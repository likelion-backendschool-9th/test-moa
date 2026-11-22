import { expect, test } from "@playwright/test";
import {
  buildReviewMix,
  buildTrends,
  buildVersionBars,
  compareVersions,
  fromBackendGroups,
  linkGroup,
  linksByCode,
  sortReviewGroups,
  toGroupView,
  toVersionLinks,
  unlinkGroup,
  validateIssueDraft,
  yTicks,
  type BackendAnalysisGroup,
  type Feedback,
  type ReviewGroupView,
  type VersionLinks,
} from "@/features/recruitment/types";

/* 리뷰 분석 탭의 숫자 계산. 날짜 경계는 한국 시간 기준이다 */

test("오늘 수와 하루·일주일·30일 칸은 한국 날짜로 어제까지 센다", () => {
  /* 한국 11월 8일 10시. 어제는 11월 7일 */
  const now = new Date("2026-11-08T01:00:00Z");
  const { todayCount, trends } = buildTrends(
    [
      "2026-11-07T15:00:00Z", // 한국 8일 0시: 오늘(그래프에는 없음)
      "2026-11-07T14:59:00Z", // 한국 7일 23시 59분: 어제 21시 칸
      "2026-11-06T15:00:00Z", // 한국 7일 0시: 어제 00시 칸
      "2026-11-06T17:30:00Z", // 한국 7일 2시 30분: 어제 00시 칸
      "2026-11-06T14:00:00Z", // 한국 6일: 하루 범위 밖, 일주일의 6번째 칸
      "2026-10-08T15:00:00Z", // 한국 10월 9일: 30일의 첫 칸(10/9~10/11), 일주일 밖
      "2026-10-08T14:00:00Z", // 한국 10월 8일: 30일 밖
    ],
    now,
  );
  expect(todayCount).toBe(1);
  expect(trends.day.map((point) => point.reviews)).toEqual([2, 0, 0, 0, 0, 0, 0, 1]);
  expect(trends.day[7].title).toBe("21~24시");
  expect(trends.week.map((point) => point.reviews)).toEqual([0, 0, 0, 0, 0, 1, 3]);
  expect(trends.week.map((point) => point.label)).toEqual(["11/1", "11/2", "11/3", "11/4", "11/5", "11/6", "11/7"]);
  expect(trends.month).toHaveLength(10);
  expect(trends.month[0]).toMatchObject({ label: "10/9", title: "10/9~10/11", reviews: 1 });
  expect(trends.month[9]).toMatchObject({ title: "11/5~11/7", reviews: 4 });
});

test("y축 눈금은 그날 가장 많은 칸을 덮는 정수다", () => {
  expect(yTicks([0, 0, 0])).toEqual([0, 1]);
  expect(yTicks([1, 3, 0])).toEqual([0, 1, 2, 3]);
  expect(yTicks([12, 4])).toEqual([0, 3, 6, 9, 12]);
  expect(yTicks([5])).toEqual([0, 2, 4, 6]);
});

test("리뷰 그룹은 심각도 순, 같으면 테스터가 많은 순이다", () => {
  const group = (id: string, severity: ReviewGroupView["severity"], testerCount: number): ReviewGroupView => ({
    id, code: id, name: id, category: "bug", severity, issueTitle: "", issueContent: "", issue: null, reviews: [], testerCount,
  });
  const sorted = sortReviewGroups([group("a", 3, 9), group("b", 1, 2), group("c", 1, 5)]);
  expect(sorted.map((item) => item.id)).toEqual(["c", "b", "a"]);
});

test("그룹 리뷰는 대표가 먼저, 나머지는 최신순이고 신고된 리뷰는 빠진다", () => {
  const feedback = (id: string, testerNickname: string, submittedAt: string, status: Feedback["status"] = "waiting"): Feedback => ({
    id, testerNickname, testItemId: id === "f1" ? "t1" : null, images: [], recommended: false, content: id, submittedAt, status,
  });
  const view = toGroupView(
    {
      id: "g", code: "1", name: "g", category: "bug", severity: 1, issueTitle: "", issueContent: "", issue: null,
      feedbackIds: ["f1", "f2", "f3", "f4"], representativeFeedbackId: "f1",
    },
    [
      feedback("f1", "가", "2026-11-01T00:00:00Z"),
      feedback("f2", "나", "2026-11-03T00:00:00Z"),
      feedback("f3", "가", "2026-11-02T00:00:00Z"),
      feedback("f4", "다", "2026-11-04T00:00:00Z", "reported"),
      feedback("f5", "라", "2026-11-05T00:00:00Z"),
    ],
    [{ id: "t1", title: "책 검색하기" }],
  );
  expect(view.reviews.map((item) => item.id)).toEqual(["f1", "f2", "f3"]);
  expect(view.reviews[0]).toMatchObject({ representative: true, testItemTitle: "책 검색하기" });
  expect(view.testerCount).toBe(2);
});

test("이슈 초안은 제목이 있어야 하고 백엔드 한도를 넘을 수 없다", () => {
  expect(validateIssueDraft("  ", "내용")).toBe("이슈 제목을 적어 주세요");
  expect(validateIssueDraft("가".repeat(256), "")).toBe("이슈 제목은 255자까지 적을 수 있어요");
  expect(validateIssueDraft("제목", "가".repeat(60_001))).toBe("이슈 내용은 60,000자까지 적을 수 있어요");
  expect(validateIssueDraft("제목", "")).toBeNull();
});

test("#284-S1 버전 비교는 짝으로 잇고(N:M), 어느 이번 그룹과도 이어지지 않은 직전 그룹은 맨 뒤에 둔다", () => {
  const group = (id: string, severity: ReviewGroupView["severity"], testerCount = 1): ReviewGroupView => ({
    id, code: id, name: `분류 ${id}`, category: "bug", severity, issueTitle: "", issueContent: "", issue: null, reviews: [], testerCount,
  });
  /* c1은 p1·p2가 합쳐진 그룹, p1은 c1·c5로 나뉘었다 */
  const result = compareVersions([group("p1", 1), group("p2", 2), group("p3", 4)], [group("c4", 1, 3), group("c1", 1, 2), group("c5", 3)], {
    c1: ["p2", "p1"],
    c5: ["p1"],
  });
  expect(result.map((item) => [item.key, item.status, item.previous.map((previous) => previous.id)])).toEqual([
    ["cc4", "new", []],
    ["cc1", "continued", ["p1", "p2"]],
    ["cc5", "continued", ["p1"]],
    ["pp3", "notReported", ["p3"]],
  ]);
  expect(result[3].current).toBeNull();
});

test("목업의 짝은 분류 코드가 같은 두 버전 그룹이다", () => {
  const previous = [versionGroup("p1", "1", "bug", 1, 1), versionGroup("p2", "2", "bug", 2, 1)];
  const current = [versionGroup("c1", "1", "bug", 1, 1), versionGroup("c2", "9", "ux", 3, 1)];
  expect(linksByCode(previous, current)).toEqual({ c1: ["p1"], c2: [] });
});

test("리뷰 성향은 태그·그룹·심각도 별 리뷰 수이고 0건은 빼며, 그룹이 6개를 넘으면 나머지를 기타로 묶는다", () => {
  const review = (id: string) => ({ id, testerNickname: id, content: "", submittedAt: "", testItemTitle: null, representative: false });
  const group = (id: string, category: ReviewGroupView["category"], severity: ReviewGroupView["severity"], count: number): ReviewGroupView => ({
    id, code: id, name: `그룹 ${id}`, category, severity, issueTitle: "", issueContent: "", issue: null, testerCount: 1,
    reviews: Array.from({ length: count }, (_, index) => review(`${id}-${index}`)),
  });
  const groups = [group("a", "bug", 1, 3), group("b", "bug", 2, 2), group("c", "ux", 3, 1)];
  const mix = buildReviewMix(groups, 2);
  expect(mix.tag.map((slice) => [slice.label, slice.count])).toEqual([["버그", 5], ["UX", 1], ["칭찬", 2]]);
  expect(mix.severity.map((slice) => [slice.label, slice.count])).toEqual([["치명", 3], ["높음", 2], ["보통", 1]]);
  expect(mix.group.map((slice) => slice.count)).toEqual([3, 2, 1]);

  const many = Array.from({ length: 8 }, (_, index) => group(`g${index}`, "ux", 3, 1));
  const folded = buildReviewMix(many, 0).group;
  expect(folded).toHaveLength(6);
  expect(folded[5]).toMatchObject({ label: "기타", count: 3 });
});

/* 버전 별 분석: 짝 고치기와 막대 */

const versionGroup = (id: string, code: string, category: ReviewGroupView["category"], severity: ReviewGroupView["severity"], count: number): ReviewGroupView => ({
  id, code, name: id, category, severity, issueTitle: "", issueContent: "", issue: null, testerCount: 1,
  reviews: Array.from({ length: count }, (_, index) => ({ id: `${id}-${index}`, testerNickname: "", content: "", submittedAt: "", testItemTitle: null, representative: false })),
});

test("#284-S8 짝 고치기: 같은 직전 그룹을 여러 이번 그룹에 이을 수 있고, 하나씩 또는 모두 풀 수 있다", () => {
  const previous = [versionGroup("p1", "1", "bug", 1, 2), versionGroup("p2", "2", "bug", 2, 1)];
  const current = [versionGroup("c1", "1", "bug", 1, 3), versionGroup("c2", "9", "ux", 3, 1)];
  const statusOf = (links: VersionLinks) => compareVersions(previous, current, links).map((item) => [item.key, item.status]);
  const saved: VersionLinks = { c1: ["p1"], c2: [] };

  /* c1의 짝 p1을 c2에도 이으면 c1은 그대로 이어져 있다(N:M) */
  const both = linkGroup(saved, "c2", "p1");
  expect(statusOf(both)).toEqual([["cc1", "continued"], ["cc2", "continued"], ["pp2", "notReported"]]);
  expect(linkGroup(both, "c2", "p1")).toBe(both);
  expect(statusOf(linkGroup(saved, "c1", "p2"))).toEqual([["cc1", "continued"], ["cc2", "new"]]);
  expect(unlinkGroup(linkGroup(saved, "c1", "p2"), "c1", "p1")).toEqual({ c1: ["p2"], c2: [] });
  expect(statusOf(unlinkGroup(saved, "c1"))).toEqual([["cc1", "new"], ["cc2", "new"], ["pp1", "notReported"], ["pp2", "notReported"]]);
});

test("#284-S8 버전 막대는 심각도·태그를 버전마다 각 그룹 한 번씩 세고, 그룹은 이어진 직전 그룹들의 합이며 두 버전 모두 0건인 칸은 뺀다", () => {
  const groups = compareVersions(
    [versionGroup("p1", "1", "bug", 1, 2), versionGroup("p2", "2", "ux", 3, 1)],
    [versionGroup("c1", "1", "ux", 2, 4), versionGroup("c2", "5", "request", 1, 1), versionGroup("c3", "6", "bug", 4, 1)],
    /* p1은 c1·c3 두 줄에 이어져 있다 */
    { c1: ["p1", "p2"], c3: ["p1"] },
  );
  const bars = buildVersionBars(groups);
  expect(bars.severity.map(({ label, previous, current }) => [label, previous, current])).toEqual([
    ["치명", 2, 1],
    ["높음", 0, 4],
    ["보통", 1, 0],
    ["사소", 0, 1],
  ]);
  expect(bars.tag.map(({ label, previous, current }) => [label, previous, current])).toEqual([
    ["버그", 2, 1],
    ["UX", 1, 4],
    ["요청", 0, 1],
  ]);
  expect(bars.group.map(({ label, previous, current }) => [label, previous, current])).toEqual([
    ["c2", 0, 1],
    ["c1", 3, 4],
    ["c3", 2, 1],
  ]);
});

test("#284-S8 짝 저장 요청은 직전 그룹 목록이 바뀐 이번 버전 그룹만 보내고, 빈 목록은 짝 없음이다", () => {
  const saved: VersionLinks = { c1: ["p1"], c2: [], c3: ["p2"] };
  /* c2를 p1과 잇고 c1의 짝을 푼다. c3은 순서만 같은 그대로 */
  const draft = unlinkGroup(linkGroup(saved, "c2", "p1"), "c1");
  expect(toVersionLinks(saved, draft)).toEqual([
    { groupId: "c1", previousGroupIds: [] },
    { groupId: "c2", previousGroupIds: ["p1"] },
  ]);
  expect(toVersionLinks(saved, { ...saved, c3: ["p2"] })).toEqual([]);
});

test("백엔드 분석 그룹은 칭찬·미분류를 빼고, 이슈와 리뷰를 화면 값으로 바꾼다", () => {
  const backend = (groupId: number, category: BackendAnalysisGroup["category"], gitIssueNumber: number | null): BackendAnalysisGroup => ({
    groupId,
    groupCode: String(groupId),
    name: `그룹 ${groupId}`,
    category,
    improvementRank: category === "UX" ? 2 : null,
    gitIssueTitle: "제목",
    gitIssueContent: "내용",
    gitIssueUrl: gitIssueNumber ? `https://github.com/o/r/issues/${gitIssueNumber}` : null,
    gitIssueNumber,
    testerCount: 2,
  });
  const groups = fromBackendGroups([backend(1, "UX", 7), backend(2, "PRAISE", null), backend(3, "UNCLASSIFIED", null)], {
    1: [{ feedbackId: 31, registerId: 7, nickname: "모아", testItemTitle: null, content: "버튼이 작아요", submittedAt: "2026-11-07T10:00:00+09:00", representative: true }],
  });
  expect(groups).toEqual([
    {
      id: "1",
      code: "1",
      name: "그룹 1",
      category: "ux",
      severity: 2,
      issueTitle: "제목",
      issueContent: "내용",
      issue: { number: 7, url: "https://github.com/o/r/issues/7" },
      testerCount: 2,
      reviews: [{ id: "31", registerId: "7", testerNickname: "모아", content: "버튼이 작아요", submittedAt: "2026-11-07T10:00:00+09:00", testItemTitle: null, representative: true }],
    },
  ]);
});
