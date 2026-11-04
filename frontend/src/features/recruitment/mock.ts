import type { Recruitment } from "./types";

/*
 * 시연용 샘플 데이터. 실제 서비스나 사용자와 관계없다.
 * 보상 크레딧은 기획에서 미정이라 임시값이다.
 * 날짜는 기준 시각에서 상대적으로 만들어 언제 시연해도 마감 전 상태로 보인다.
 */

type Seed = Omit<Recruitment, "createdAt" | "recruitDeadline" | "submitDeadline"> & {
  createdDaysAgo: number;
  recruitInDays: number;
  submitInDays: number;
};

const PROMOTED: Seed[] = [
  {
    slug: "booklog",
    projectName: "북로그",
    summary: "읽은 책과 밑줄 그은 문장을 모아 두는 독서 기록 서비스",
    request: "책 등록부터 독서 기록 작성까지 한 번 써 보기",
    softwareType: "web",
    isSubscription: true,
    capacity: 20,
    confirmedCount: 13,
    baseReward: 1350,
    extraReward: 450,
    createdDaysAgo: 2,
    recruitInDays: 6,
    submitInDays: 13,
  },
  {
    slug: "moaplan",
    projectName: "모아플랜",
    summary: "작은 팀을 위한 일정 공유와 회의 예약 도구",
    request: "일정을 만들고 팀원을 초대하는 흐름 확인하기",
    softwareType: "web",
    isSubscription: true,
    capacity: 15,
    confirmedCount: 4,
    baseReward: 1180,
    extraReward: 320,
    createdDaysAgo: 3,
    recruitInDays: 9,
    submitInDays: 16,
  },
  {
    slug: "recipefit",
    projectName: "레시피핏",
    summary: "냉장고에 남은 재료로 만들 수 있는 요리를 추천하는 서비스",
    request: "재료 입력과 추천 결과가 쓸 만한지 알려 주기",
    softwareType: "web",
    isSubscription: true,
    capacity: 25,
    confirmedCount: 17,
    baseReward: 990,
    extraReward: 270,
    createdDaysAgo: 5,
    recruitInDays: 4,
    submitInDays: 11,
  },
];

const GENERAL: Seed[] = [
  {
    slug: "ledger-note",
    projectName: "가계부 노트",
    summary: "영수증 사진으로 지출을 정리하는 가계부",
    request: "영수증 업로드 후 분류가 맞는지 확인하기",
    softwareType: "web",
    isSubscription: false,
    capacity: 10,
    confirmedCount: 3,
    baseReward: 870,
    createdDaysAgo: 0,
    recruitInDays: 7,
    submitInDays: 14,
  },
  {
    slug: "study-match",
    projectName: "스터디 매칭",
    summary: "관심 분야와 시간대로 스터디원을 찾는 서비스",
    request: "프로필 작성부터 스터디 신청까지 해 보기",
    softwareType: "web",
    isSubscription: false,
    capacity: 12,
    confirmedCount: 7,
    baseReward: 940,
    createdDaysAgo: 4,
    recruitInDays: 5,
    submitInDays: 12,
  },
  {
    slug: "folio-builder",
    projectName: "포트폴리오 빌더",
    summary: "템플릿을 골라 개발자 포트폴리오 페이지를 만드는 서비스",
    request: "템플릿 선택과 프로젝트 추가 화면 써 보기",
    softwareType: "web",
    isSubscription: false,
    capacity: 12,
    confirmedCount: 12,
    baseReward: 1060,
    createdDaysAgo: 2,
    recruitInDays: 3,
    submitInDays: 10,
  },
  {
    slug: "plant-diary",
    projectName: "반려식물 일지",
    summary: "물 주기와 성장 사진을 기록하는 식물 관리 서비스",
    request: "식물 등록과 물 주기 알림 설정 확인하기",
    softwareType: "web",
    isSubscription: false,
    capacity: 8,
    confirmedCount: 2,
    baseReward: 760,
    createdDaysAgo: 4,
    recruitInDays: 8,
    submitInDays: 15,
  },
  {
    slug: "run-crew",
    projectName: "동네 러닝 크루",
    summary: "가까운 러닝 모임을 찾고 기록을 나누는 서비스",
    request: "모임 검색과 참가 신청 흐름 써 보기",
    softwareType: "web",
    isSubscription: false,
    capacity: 15,
    confirmedCount: 9,
    baseReward: 830,
    createdDaysAgo: 6,
    recruitInDays: 2,
    submitInDays: 9,
  },
  {
    slug: "used-books",
    projectName: "중고책 장터",
    summary: "학교 근처에서 전공 서적을 사고파는 서비스",
    request: "책 등록과 거래 요청 보내기",
    softwareType: "web",
    isSubscription: false,
    capacity: 10,
    confirmedCount: 5,
    baseReward: 720,
    createdDaysAgo: 8,
    recruitInDays: 5,
    submitInDays: 12,
  },
  {
    slug: "meeting-notes",
    projectName: "회의록 정리",
    summary: "회의 메모를 안건과 할 일로 나눠 주는 도구",
    request: "회의록 작성 후 할 일 목록이 맞는지 보기",
    softwareType: "web",
    isSubscription: false,
    capacity: 10,
    confirmedCount: 6,
    baseReward: 910,
    createdDaysAgo: 10,
    recruitInDays: 1,
    submitInDays: 8,
  },
  /*
   * 페이지 나누기를 보이려고 더한 글 (#60). 기존 시나리오가 깨지지 않게
   * 생성일은 가계부 노트보다 이르고, 모집 마감은 회의록 정리보다 늦고, 기본 보상은 북로그보다 적고,
   * 정원이 남아 있으며, 검색어 "일정"에 걸리지 않는다.
   */
  ...(
    [
      ["habit-check", "습관 체크", "매일 지킬 습관을 체크하고 연속 기록을 보여 주는 서비스", "습관 추가와 체크 기록 확인하기", 790],
      ["lunch-vote", "점심 투표", "팀원끼리 점심 메뉴를 투표로 정하는 도구", "투표 만들기와 결과 공유 써 보기", 680],
      ["photo-album", "가족 사진첩", "가족끼리 사진을 올리고 댓글을 나누는 앨범", "앨범 만들기와 사진 올리기 해 보기", 820],
      ["word-quiz", "단어 퀴즈", "외운 영어 단어를 퀴즈로 복습하는 서비스", "단어장 등록과 퀴즈 풀기 써 보기", 650],
      ["gift-list", "선물 목록", "받고 싶은 선물을 모아 친구와 공유하는 위시리스트", "목록 만들기와 공유 링크 보내기", 700],
      ["pet-walk", "산책 기록", "반려견 산책 경로와 시간을 기록하는 서비스", "산책 기록 시작과 끝내기 확인하기", 740],
      ["movie-memo", "영화 메모", "본 영화의 별점과 감상을 남기는 기록장", "영화 검색과 감상 쓰기 해 보기", 610],
      ["room-share", "자취방 공유", "자취방 매물을 사진과 함께 올리고 문의하는 게시판", "매물 등록과 문의 보내기 써 보기", 960],
      ["coupon-box", "쿠폰함", "흩어진 모바일 쿠폰을 한곳에 모아 유효기간을 알려 주는 서비스", "쿠폰 등록과 만료 알림 확인하기", 670],
      ["quiet-desk", "집중 타이머", "공부 시간을 재고 하루 집중 기록을 보여 주는 타이머", "타이머 시작과 기록 화면 보기", 630],
      ["clothes-swap", "옷 나눔", "안 입는 옷을 이웃과 나누는 서비스", "나눔 글 올리기와 신청하기 해 보기", 710],
      ["bus-time", "버스 도착", "자주 타는 정류장의 버스 도착 시간을 모아 보는 서비스", "정류장 즐겨찾기와 도착 시간 확인하기", 880],
    ] as const
  ).map(
    ([slug, projectName, summary, request, baseReward], index): Seed => ({
      slug,
      projectName,
      summary,
      request,
      softwareType: "web",
      isSubscription: false,
      capacity: 10,
      confirmedCount: index % 4,
      baseReward,
      createdDaysAgo: 11 + index,
      recruitInDays: 6 + (index % 5),
      submitInDays: 13 + (index % 5),
    }),
  ),
];

/* 끝난 모집 글. 홈 목록에는 나오지 않고 참여 내역에서만 가리킨다 */
const PAST: Seed[] = [
  {
    slug: "memo-garden",
    projectName: "메모 정원",
    summary: "흩어진 메모를 주제별 화단으로 묶어 주는 메모 앱",
    request: "메모 작성과 주제 묶기가 자연스러운지 보기",
    softwareType: "web",
    isSubscription: false,
    capacity: 10,
    confirmedCount: 10,
    baseReward: 850,
    createdDaysAgo: 30,
    recruitInDays: -23,
    submitInDays: -16,
  },
  {
    slug: "parking-alert",
    projectName: "주차 알리미",
    summary: "주차 위치를 기록하고 출차 시간을 알려 주는 서비스",
    request: "주차 위치 저장과 알림 설정 흐름 써 보기",
    softwareType: "web",
    isSubscription: true,
    capacity: 20,
    confirmedCount: 18,
    baseReward: 1100,
    extraReward: 300,
    createdDaysAgo: 45,
    recruitInDays: -38,
    submitInDays: -31,
  },
  {
    slug: "cafe-map",
    projectName: "카페 지도",
    summary: "콘센트와 좌석 정보로 작업하기 좋은 카페를 찾는 지도",
    request: "카페 검색과 후기 남기기 해 보기",
    softwareType: "web",
    isSubscription: false,
    capacity: 12,
    confirmedCount: 12,
    baseReward: 780,
    createdDaysAgo: 35,
    recruitInDays: -28,
    submitInDays: -21,
  },
];

const DAY_MS = 24 * 60 * 60 * 1000;

function toRecruitment(seed: Seed, now: Date): Recruitment {
  const { createdDaysAgo, recruitInDays, submitInDays, ...rest } = seed;
  const at = (days: number) => new Date(now.getTime() + days * DAY_MS).toISOString();
  return {
    ...rest,
    createdAt: at(-createdDaysAgo),
    recruitDeadline: at(recruitInDays),
    submitDeadline: at(submitInDays),
  };
}

export function buildPromotedRecruitments(now: Date) {
  return PROMOTED.map((seed) => toRecruitment(seed, now));
}

export function buildGeneralRecruitments(now: Date) {
  return GENERAL.map((seed) => toRecruitment(seed, now));
}

export function buildPastRecruitments(now: Date) {
  return PAST.map((seed) => toRecruitment(seed, now));
}
