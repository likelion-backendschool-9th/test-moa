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
  { key: "p-study-match", recruitmentSlug: "study-match", status: "payoutPending", appliedHoursAgo: 3 * DAY, submittedHoursAgo: 42 },
  { key: "p-run-crew", recruitmentSlug: "run-crew", status: "underReview", appliedHoursAgo: 5 * DAY, submittedHoursAgo: 4 * DAY },
  {
    key: "p-memo-garden",
    recruitmentSlug: "memo-garden",
    status: "paid",
    appliedHoursAgo: 28 * DAY,
    submittedHoursAgo: 17 * DAY,
    paidHoursAgo: 14 * DAY,
    earnedCredits: 850,
  },
  {
    key: "p-parking-alert",
    recruitmentSlug: "parking-alert",
    status: "paid",
    appliedHoursAgo: 42 * DAY,
    submittedHoursAgo: 32 * DAY,
    paidHoursAgo: 29 * DAY,
    earnedCredits: 1400,
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
  };
}

export function buildParticipations(now: Date) {
  return SEEDS.map((seed) => toParticipation(seed, now));
}
