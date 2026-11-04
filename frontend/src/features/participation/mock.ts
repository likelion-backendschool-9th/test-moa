import type { Participation, ParticipationStatus } from "./types";

/*
 * 시연용 샘플 데이터. 테스터 "한서윤"의 참여 11건이며 실제 사용자와 관계없다.
 * 진행 중인 건은 홈 목업의 모집 글을, 끝난 건은 지난 모집 글을 가리킨다.
 * 날짜는 기준 시각에서 상대적으로 만들고, 마감일·보상은 모집 글의 값을 쓴다.
 */

type Seed = {
  key: string;
  recruitmentSlug: string;
  status: ParticipationStatus;
  appliedHoursAgo: number;
  submittedHoursAgo?: number;
  paidHoursAgo?: number;
  reviewedHoursAgo?: number;
  earnedCredits?: number;
  feedback?: string;
};

const DAY = 24;

const SEEDS: Seed[] = [
  { key: "p-booklog", recruitmentSlug: "booklog", status: "selectionPending", appliedHoursAgo: 1 * DAY },
  { key: "p-recipefit", recruitmentSlug: "recipefit", status: "notSelected", appliedHoursAgo: 4 * DAY },
  { key: "p-meeting-notes", recruitmentSlug: "meeting-notes", status: "beforeSubmit", appliedHoursAgo: 9 * DAY },
  { key: "p-moaplan", recruitmentSlug: "moaplan", status: "beforeSubmit", appliedHoursAgo: 2 * DAY },
  { key: "p-used-books", recruitmentSlug: "used-books", status: "beforeSubmit", appliedHoursAgo: 6 * DAY },
  { key: "p-ledger-note", recruitmentSlug: "ledger-note", status: "beforeSubmit", appliedHoursAgo: 12 },
  /* 지급까지 약 30시간 남았다 */
  {
    key: "p-study-match",
    recruitmentSlug: "study-match",
    status: "payoutPending",
    appliedHoursAgo: 3 * DAY,
    submittedHoursAgo: 42,
    feedback:
      "프로필 작성부터 스터디 신청까지 해 봤어요. 관심 분야를 고르는 화면은 쉬웠는데, 시간대를 여러 개 고를 때 이미 고른 칸이 잘 구분되지 않았어요. 신청 버튼을 두 번 누르면 같은 스터디에 신청이 두 번 들어갔어요.",
  },
  {
    key: "p-run-crew",
    recruitmentSlug: "run-crew",
    status: "underReview",
    appliedHoursAgo: 5 * DAY,
    submittedHoursAgo: 4 * DAY,
    feedback:
      "모임 검색과 참가 신청을 해 봤어요. 지도에서 모임을 누르면 상세가 열리는데 뒤로 가기를 누르면 검색 조건이 초기화됐어요. 참가 신청은 문제없이 됐어요.",
  },
  {
    key: "p-memo-garden",
    recruitmentSlug: "memo-garden",
    status: "paid",
    appliedHoursAgo: 28 * DAY,
    submittedHoursAgo: 17 * DAY,
    paidHoursAgo: 14 * DAY,
    earnedCredits: 850,
    feedback:
      "메모 다섯 개를 쓰고 주제별로 묶어 봤어요. 끌어다 놓기로 묶는 건 자연스러웠어요. 버그는 찾지 못했고, 묶음 이름을 바꾸는 방법을 처음에 찾기 어려웠어요.",
  },
  {
    key: "p-parking-alert",
    recruitmentSlug: "parking-alert",
    status: "paid",
    appliedHoursAgo: 42 * DAY,
    submittedHoursAgo: 32 * DAY,
    paidHoursAgo: 29 * DAY,
    earnedCredits: 1400,
    feedback:
      "주차 위치 저장과 출차 알림을 설정해 봤어요. 알림은 정확한 시간에 왔어요. 사진을 붙인 위치를 지우면 목록에 빈 칸이 남았어요.",
  },
  { key: "p-cafe-map", recruitmentSlug: "cafe-map", status: "incomplete", appliedHoursAgo: 33 * DAY },
];

const HOUR_MS = 60 * 60 * 1000;

function toParticipation(seed: Seed, now: Date): Participation {
  const ago = (hours?: number) => (hours === undefined ? undefined : new Date(now.getTime() - hours * HOUR_MS).toISOString());
  return {
    key: seed.key,
    recruitmentSlug: seed.recruitmentSlug,
    status: seed.status,
    appliedAt: ago(seed.appliedHoursAgo) ?? now.toISOString(),
    submittedAt: ago(seed.submittedHoursAgo),
    paidAt: ago(seed.paidHoursAgo),
    reviewedAt: ago(seed.reviewedHoursAgo),
    earnedCredits: seed.earnedCredits ?? 0,
    feedback: seed.feedback,
  };
}

export function buildParticipations(now: Date) {
  return SEEDS.map((seed) => toParticipation(seed, now));
}
