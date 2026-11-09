import type {
  FeedbackEntry,
  FeedbackTestItem,
  Participation,
  ParticipationStatus,
} from "@/features/participation/types";
import { cookies } from "next/headers";
import "server-only";

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
  /** [제목, 설명, 필수 여부] */
  testItems?: Array<[string, string, boolean]>;
  /** 제출한 피드백. 항목 순서대로이고 항목 번호가 0이면 기타 의견이다 */
  feedbacks?: Array<[number, string]>;
};

const DAY = 24;

const SEEDS: Seed[] = [
  { key: "p-booklog", recruitmentSlug: "booklog", status: "selectionPending", appliedHoursAgo: 1 * DAY },
  { key: "p-recipefit", recruitmentSlug: "recipefit", status: "notSelected", appliedHoursAgo: 4 * DAY },
  {
    key: "p-meeting-notes",
    recruitmentSlug: "meeting-notes",
    status: "beforeSubmit",
    appliedHoursAgo: 9 * DAY,
    testItems: [
      ["회의 메모로 회의록 만들기", "메모를 붙여 넣고 회의록을 만들어 보세요.", true],
      ["할 일 목록 확인하기", "회의록에서 뽑은 할 일과 담당자가 맞는지 보세요.", true],
      ["회의록 공유하기", "팀원에게 공유 링크를 보내 보세요.", false],
    ],
  },
  {
    key: "p-moaplan",
    recruitmentSlug: "moaplan",
    status: "beforeSubmit",
    appliedHoursAgo: 2 * DAY,
    testItems: [
      ["일정 만들기", "새 일정을 하나 만들어 보세요.", true],
      ["팀원 초대하기", "만든 일정에 팀원을 초대해 보세요.", true],
    ],
  },
  {
    key: "p-used-books",
    recruitmentSlug: "used-books",
    status: "beforeSubmit",
    appliedHoursAgo: 6 * DAY,
    testItems: [
      ["책 등록하기", "가지고 있는 전공 서적을 등록해 보세요.", true],
      ["거래 요청 보내기", "다른 책에 거래 요청을 보내 보세요.", false],
    ],
  },
  {
    key: "p-ledger-note",
    recruitmentSlug: "ledger-note",
    status: "beforeSubmit",
    appliedHoursAgo: 12,
    testItems: [
      ["영수증 올리기", "영수증 사진을 한 장 올려 보세요.", false],
      ["분류 확인하기", "지출 분류가 맞는지 보세요.", false],
    ],
  },
  /* 지급까지 약 30시간 남았다 */
  {
    key: "p-study-match",
    recruitmentSlug: "study-match",
    status: "payoutPending",
    appliedHoursAgo: 3 * DAY,
    submittedHoursAgo: 42,
    testItems: [
      ["프로필 작성하기", "관심 분야와 시간대를 골라 프로필을 만들어 보세요.", true],
      ["스터디 신청하기", "마음에 드는 스터디에 신청해 보세요.", true],
    ],
    feedbacks: [
      [1, "관심 분야를 고르는 화면은 쉬웠는데, 시간대를 여러 개 고를 때 이미 고른 칸이 잘 구분되지 않았어요."],
      [2, "신청 버튼을 두 번 누르면 같은 스터디에 신청이 두 번 들어갔어요."],
    ],
  },
  {
    key: "p-run-crew",
    recruitmentSlug: "run-crew",
    status: "underReview",
    appliedHoursAgo: 5 * DAY,
    submittedHoursAgo: 4 * DAY,
    testItems: [
      ["모임 검색하기", "지도에서 가까운 모임을 찾아보세요.", true],
      ["참가 신청하기", "모임 하나에 참가 신청을 해 보세요.", true],
    ],
    feedbacks: [
      [1, "지도에서 모임을 누르면 상세가 열리는데 뒤로 가기를 누르면 검색 조건이 초기화됐어요."],
      [2, "참가 신청은 문제없이 됐어요. 신청 뒤 안내도 바로 나왔어요."],
    ],
  },
  {
    key: "p-memo-garden",
    recruitmentSlug: "memo-garden",
    status: "paid",
    appliedHoursAgo: 28 * DAY,
    submittedHoursAgo: 17 * DAY,
    paidHoursAgo: 14 * DAY,
    earnedCredits: 850,
    testItems: [
      ["메모 쓰고 묶기", "메모를 다섯 개 쓰고 주제별로 묶어 보세요.", true],
    ],
    feedbacks: [
      [1, "끌어다 놓기로 묶는 건 자연스러웠어요. 버그는 찾지 못했어요."],
      [0, "묶음 이름을 바꾸는 방법을 처음에 찾기 어려웠어요."],
    ],
  },
  {
    key: "p-parking-alert",
    recruitmentSlug: "parking-alert",
    status: "paid",
    appliedHoursAgo: 42 * DAY,
    submittedHoursAgo: 32 * DAY,
    paidHoursAgo: 29 * DAY,
    earnedCredits: 1400,
    testItems: [
      ["주차 위치 저장하기", "사진과 함께 주차 위치를 저장해 보세요.", true],
      ["출차 알림 설정하기", "출차 알림을 설정해 보세요.", false],
    ],
    feedbacks: [
      [1, "사진을 붙인 위치를 지우면 목록에 빈 칸이 남았어요."],
      [2, "알림은 정확한 시간에 왔어요. 다시 알림 설정도 문제없었어요."],
    ],
  },
  { key: "p-cafe-map", recruitmentSlug: "cafe-map", status: "incomplete", appliedHoursAgo: 33 * DAY },
];

const HOUR_MS = 60 * 60 * 1000;

const UNCONFIRMED: ParticipationStatus[] = ["selectionPending", "notSelected", "cancelled"];

function toParticipation(seed: Seed, now: Date): Participation {
  const testItems: FeedbackTestItem[] = (seed.testItems ?? []).map(([title, description, required], index) => ({
    id: `${seed.key}-t${index + 1}`,
    title,
    description,
    required,
  }));
  const feedbacks: FeedbackEntry[] = (seed.feedbacks ?? []).map(([itemNumber, content]) => ({
    testItemId: itemNumber === 0 ? null : testItems[itemNumber - 1].id,
    content,
    imageNames: [],
  }));
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
    /* 접속 링크는 확정된 참여에만 있다. 시연용 주소다 */
    ...(UNCONFIRMED.includes(seed.status) ? {} : { accessUrl: `https://${seed.recruitmentSlug}.example.com` }),
    testItems,
    feedbacks,
  };
}

export function buildParticipations(now: Date) {
  return SEEDS.map((seed) => toParticipation(seed, now));
}

/*
 * 시연용 피드백 제출 기록. 실제 저장소가 없어서 참여마다 쿠키 demo-feedback-<참여 키>에 남긴다.
 * 값은 "제출 시각(ms).항목별 피드백 JSON(base64url)"이다. 이미지 파일은 저장하지 않는다. base64url은 쿠키 인코딩에서 길이가 늘지 않아 한글 한 글자가 4바이트다.
 * 같은 브라우저 안에서만 유지되고, 병렬 E2E도 서로의 제출을 보지 않는다. 실제 API를 붙이면 이 파일을 지운다.
 */

const COOKIE_PREFIX = "demo-feedback-";

const MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

/* 브라우저는 이름+값이 4096바이트를 넘는 쿠키를 알리지 않고 버린다. 속성 몫을 남겨 둔다 */
const COOKIE_MAX_BYTES = 4000;

export type DemoFeedback = { submittedAt: string; entries: FeedbackEntry[] };

const encode = (text: string) => Buffer.from(text, "utf8").toString("base64url");

const decodeText = (text: string) => Buffer.from(text, "base64url").toString("utf8");

function isEntry(value: unknown): value is FeedbackEntry {
  const entry = value as FeedbackEntry | null;
  return (
    typeof entry?.content === "string" &&
    (entry.testItemId === null || typeof entry.testItemId === "string") &&
    Array.isArray(entry.imageNames) &&
    entry.imageNames.every((name) => typeof name === "string")
  );
}

function decode(value: string): DemoFeedback | null {
  const [millis, encoded] = value.split(".");
  const time = Number(millis);
  if (!encoded || !Number.isFinite(time)) return null;
  try {
    const entries: unknown = JSON.parse(decodeText(encoded));
    if (!Array.isArray(entries) || entries.length === 0 || !entries.every(isEntry)) return null;
    return { submittedAt: new Date(time).toISOString(), entries };
  } catch {
    /* 깨졌거나 예전 형식의 값이다 */
    return null;
  }
}

/** 이 브라우저에서 제출한 피드백, { 참여 키: 기록 }. 깨진 값은 버린다 */
export async function readDemoFeedback(): Promise<Record<string, DemoFeedback>> {
  const entries = (await cookies())
    .getAll()
    .filter((cookie) => cookie.name.startsWith(COOKIE_PREFIX))
    .map((cookie) => [cookie.name.slice(COOKIE_PREFIX.length), decode(cookie.value)] as const)
    .filter((entry): entry is readonly [string, DemoFeedback] => entry[1] !== null);
  return Object.fromEntries(entries);
}

/** Server Action에서만 부른다. 쿠키 한도를 넘으면 저장하지 않고 false를 돌려준다 */
export async function saveDemoFeedback(participationKey: string, entries: FeedbackEntry[]): Promise<boolean> {
  const name = `${COOKIE_PREFIX}${participationKey}`;
  const value = `${Date.now()}.${encode(JSON.stringify(entries))}`;
  if (name.length + 1 + value.length > COOKIE_MAX_BYTES) return false;
  (await cookies()).set(name, value, { path: "/", httpOnly: true, sameSite: "lax", maxAge: MAX_AGE_SECONDS });
  return true;
}
