import type { ProjectImage, Project as ProjectRecord } from "@/features/project/types";
import type {
  AiSummary,
  Application,
  ApplicationStatus,
  Feedback,
  FeedbackStatus,
  ProjectWithRecruitments as Project,
  Recruitment,
  RecruitmentCancellation,
  RecruitmentDetail,
  VersionComparisonSample,
} from "@/features/recruitment/types";
import "server-only";

/*
 * 시연용 샘플 데이터. 실제 서비스나 사용자와 관계없다.
 * 날짜는 기준 시각에서 상대적으로 만들어 언제 시연해도 같은 상태로 보인다.
 * 북로그와 포트폴리오 빌더 모집 건은 홈의 샘플(demo/recruitment.ts)을 그대로 받아 쓴다. 둘 다 아직 모집 마감 전이라 피드백이 없다.
 * 날짜 순서는 항상 모집 생성 → 지원 → 모집 마감 → 피드백 제출이다. 피드백은 테스트 중인 북로그 1차 모집에만 있다.
 */

const HOUR_MS = 60 * 60 * 1000;

const DAY_MS = 24 * HOUR_MS;

const NICKNAMES = [
  "김하늘", "이도윤", "박서아", "최지호", "윤슬", "강민준", "조하은", "윤시우", "장유나", "임건우",
  "한지아", "오태윤", "서다인", "신우진", "권나연", "황준서", "안소율", "송현우", "전채원", "홍지안", "문서진", "배하린",
];

const hoursAgo = (now: Date, hours: number) => new Date(now.getTime() - hours * HOUR_MS).toISOString();

/** 한국 시각으로 오늘 0시부터 지난 시간 */
function hoursSinceSeoulMidnight(now: Date) {
  const [hour, minute] = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .format(now)
    .split(":")
    .map(Number);
  return hour + minute / 60;
}

const daysAgo = (now: Date, days: number) => new Date(now.getTime() - days * DAY_MS).toISOString();

const inDays = (now: Date, days: number) => new Date(now.getTime() + days * DAY_MS).toISOString();

/**
 * 상태별 인원 수로 지원 목록을 만든다. 먼저 지원한 사람부터 확정, 거절, 참여 취소, 대기 순이다.
 * 지원 시각은 모집 생성 뒤부터 지금(모집이 끝났으면 모집 마감)까지 고르게 나눈다.
 */
function buildApplications(recruitment: Recruitment, now: Date, counts: Record<ApplicationStatus, number>): Application[] {
  const statuses: ApplicationStatus[] = [
    ...Array<ApplicationStatus>(counts.confirmed).fill("confirmed"),
    ...Array<ApplicationStatus>(counts.rejected).fill("rejected"),
    ...Array<ApplicationStatus>(counts.applied).fill("applied"),
    ...Array<ApplicationStatus>(counts.cancelled).fill("cancelled"),
  ];
  const from = new Date(recruitment.createdAt).getTime();
  const to = Math.min(now.getTime(), new Date(recruitment.recruitDeadline).getTime());
  const step = (to - from) / (statuses.length + 1);
  return statuses.map((status, index) => ({
    id: `${recruitment.slug}-a${index + 1}`,
    testerNickname: NICKNAMES[index % NICKNAMES.length],
    status,
    appliedAt: new Date(from + step * (index + 1)).toISOString(),
  }));
}

type FeedbackSeed = {
  nickname: string;
  content: string;
  submittedHoursAgo: number;
  status: FeedbackStatus;
  /** 테스트 항목 id. 기타 의견은 null */
  testItemId: string | null;
  images?: ProjectImage[];
  recommended?: boolean;
};

function buildFeedbacks(slug: string, now: Date, seeds: FeedbackSeed[]): Feedback[] {
  return seeds.map((seed, index) => ({
    id: `${slug}-f${index + 1}`,
    testerNickname: seed.nickname,
    testItemId: seed.testItemId,
    images: seed.images ?? [],
    recommended: seed.recommended ?? false,
    content: seed.content,
    submittedAt: hoursAgo(now, seed.submittedHoursAgo),
    status: seed.status,
  }));
}

export type ProjectSeedData = {
  projects: Project[];
  /** recruitmentKey별 지원 목록 */
  applications: Record<string, Application[]>;
  /** recruitmentKey별 피드백 목록 */
  feedbacks: Record<string, Feedback[]>;
  /** recruitmentKey별 AI 분석 결과 */
  aiSummaries: Record<string, AiSummary>;
  /** 현재 버전 recruitmentKey별 AI 버전 비교 결과 */
  versionComparisons: Record<string, VersionComparisonSample>;
  /** recruitmentKey별 모집 조건과 테스트 항목 */
  details: Record<string, RecruitmentDetail>;
  /** recruitmentKey별 모집 취소 기록 */
  cancellations: Record<string, RecruitmentCancellation>;
};

/**
 * 개발자(박도현)의 프로젝트 3개를 만든다.
 * homeRecruitments는 홈 샘플 모집 건 전체로, 그중 북로그와 포트폴리오 빌더를 골라 쓴다.
 */
export function buildDeveloperProjects(now: Date, homeRecruitments: Recruitment[]): ProjectSeedData {
  const pick = (slug: string) => {
    const found = homeRecruitments.find((item) => item.slug === slug);
    if (!found) throw new Error(`홈 샘플에 ${slug} 모집 건이 없어요`);
    return found;
  };
  const booklog = pick("booklog");
  const folio = pick("folio-builder");

  /* 모집이 끝나고 테스트 중인 지난 구독 모집. 피드백·신고·AI 분석을 보여 준다 */
  const booklogFirst: Recruitment = {
    ...booklog,
    slug: "booklog-first",
    request: "베타 버전 밑줄 저장과 문장 모아 보기 써 보기",
    createdAt: daysAgo(now, 12),
    recruitDeadline: daysAgo(now, 5),
    submitDeadline: inDays(now, 2),
    confirmedCount: 5,
  };

  /* 북로그의 첫 클로즈드 베타(v1). 테스트까지 끝난 구독 모집이고, 1차 테스트(v2)의 버전 별 분석에서 직전 버전으로 견준다 */
  const booklogBeta: Recruitment = {
    ...booklog,
    slug: "booklog-beta",
    request: "클로즈드 베타 책 등록과 밑줄 긋기 써 보기",
    createdAt: daysAgo(now, 30),
    recruitDeadline: daysAgo(now, 24),
    submitDeadline: daysAgo(now, 17),
    confirmedCount: 4,
  };

  /* 개발자가 취소한 지난 무료 모집. 확정됐던 테스터의 참여도 함께 취소됐다 */
  const folioOld: Recruitment = {
    ...folio,
    slug: "folio-builder-old",
    request: "첫 버전 템플릿 고르기 화면 써 보기",
    createdAt: daysAgo(now, 15),
    recruitDeadline: daysAgo(now, 9),
    submitDeadline: daysAgo(now, 2),
    confirmedCount: 0,
  };

  /* 확정된 테스터가 아직 없는 무료 모집. 개발자가 바로 취소할 수 있는 모습을 보여 준다 */
  const folioNext: Recruitment = {
    ...folio,
    slug: "folio-builder-next",
    request: "새 템플릿 미리 보기 화면 써 보기",
    createdAt: daysAgo(now, 1),
    recruitDeadline: inDays(now, 5),
    submitDeadline: inDays(now, 12),
    confirmedCount: 0,
  };

  const applications: Record<string, Application[]> = {
    /* 모집 중. 대기 지원자 8명으로 일괄 확정을 보여 준다 */
    booklog: buildApplications(booklog, now, { confirmed: booklog.confirmedCount, rejected: 1, cancelled: 0, applied: 8 }),
    /* 확정 5명 중 1명은 아직 피드백을 내지 않았고, 1명은 참여를 취소했다. 모집이 끝나 남은 대기 지원자 1명은 더 확정할 수 없다(일괄 확정이 없는 것을 보여 준다) */
    "booklog-first": buildApplications(booklogFirst, now, { confirmed: 5, rejected: 1, cancelled: 1, applied: 1 }),
    /* 확정된 4명(김하늘·이도윤·박서아·최지호)이 모두 피드백을 냈다 */
    "booklog-beta": buildApplications(booklogBeta, now, { confirmed: 4, rejected: 0, cancelled: 0, applied: 0 }),
    /* 무료 모집은 선착순 자동 확정이라 대기·거절이 없다 */
    "folio-builder": buildApplications(folio, now, { confirmed: folio.confirmedCount, rejected: 0, cancelled: 0, applied: 0 }),
    "folio-builder-old": buildApplications(folioOld, now, { confirmed: 0, rejected: 0, cancelled: 3, applied: 0 }),
  };

  /* 시간대 별 리뷰 수가 어제·오늘(한국 날짜)에 맞게 보이도록 한국 자정을 기준으로 시각을 정한다 */
  const sinceMidnight = hoursSinceSeoulMidnight(now);
  const yesterdayAt = (hour: number) => sinceMidnight + 24 - hour;
  const todayAt = (part: number) => sinceMidnight * part;

  const feedbacks: Record<string, Feedback[]> = {
    booklog: [],
    /* 확정된 테스터(앞의 5명)가 모집 마감(5일 전) 뒤에 낸 피드백 */
    "booklog-first": buildFeedbacks("booklog-first", now, [
      {
        nickname: "김하늘",
        content: "책 검색 결과에서 표지가 늦게 떠서 같은 책을 두 번 눌렀어요.",
        submittedHoursAgo: 10,
        status: "waiting",
        testItemId: "booklog-first-t1",
        images: [{ url: "/sample/feedback/booklog-search.svg", name: "표지가 비어 있는 검색 결과" }],
      },
      { nickname: "이도윤", content: "좋아요.", submittedHoursAgo: 30, status: "reported", testItemId: null },
      {
        nickname: "박서아",
        content: "밑줄 문장 저장은 편했는데, 저장한 문장을 다시 찾는 메뉴가 안 보였어요.",
        submittedHoursAgo: 96,
        status: "paid",
        testItemId: "booklog-first-t2",
        recommended: true,
      },
      {
        nickname: "최지호",
        content: "책을 검색하면 표지가 한참 비어 있어서 맞는 책인지 헷갈렸어요.",
        submittedHoursAgo: 110,
        status: "paid",
        testItemId: "booklog-first-t1",
      },
      /*
       * 리뷰 분석 시연용. 어제 하루 3시간 칸마다 고르지 않게 들어오고 오늘도 2건 들어온다.
       * 김하늘은 피드백 탭의 AI 질문 버튼 이름이 겹치지 않게 1건만 둔다
       */
      ...([
        ["이도윤", "booklog-first-t2", yesterdayAt(1.3), "밑줄 문장을 저장하는 중에 앱이 꺼져서 같이 쓴 메모가 다 사라졌어요."],
        ["박서아", "booklog-first-t2", yesterdayAt(6.7), "메모를 길게 쓰고 저장을 누르면 앱이 닫히고, 다시 열면 메모가 없어요."],
        ["최지호", null, yesterdayAt(8.2), "다크 모드에서 밑줄 색이 배경이랑 비슷해서 어디에 밑줄을 그었는지 잘 안 보여요."],
        ["이도윤", "booklog-first-t1", yesterdayAt(9.5), "검색 결과에서 책을 누르면 화면이 멈추고 뒤로 가기도 안 돼요."],
        ["박서아", "booklog-first-t2", yesterdayAt(10.3), "모아 보기에서 저장한 문장이 날짜순으로만 나와서 책별로 보기 어려워요."],
        ["최지호", "booklog-first-t2", yesterdayAt(11), "저장하다 앱이 꺼진 뒤로 그 책의 밑줄 목록이 비어 있어요."],
        ["이도윤", null, yesterdayAt(11.7), "책별로 밑줄을 묶어서 볼 수 있으면 좋겠어요."],
        ["박서아", "booklog-first-t1", yesterdayAt(12.5), "같은 책이 판본마다 여러 개 떠서 헷갈리는데, 표지까지 늦게 떠서 더 고르기 어려워요."],
        ["최지호", "booklog-first-t1", yesterdayAt(13.8), "검색 결과에서 두 번째 책을 누르니 앱이 멈췄어요."],
        ["이도윤", "booklog-first-t2", yesterdayAt(14.3), "모아 보기 메뉴가 설정 안쪽에 있어서 처음엔 못 찾았어요."],
        ["박서아", null, yesterdayAt(16.2), "밑줄 긋는 방식이 직관적이고 문장 저장이 빨라서 좋았어요."],
        ["최지호", null, yesterdayAt(19.5), "어두운 화면에서 밑줄 문장을 읽기가 힘들어요."],
        ["이도윤", "booklog-first-t2", yesterdayAt(20.7), "저장한 문장을 찾으려고 메뉴를 한참 뒤졌어요."],
        ["박서아", "booklog-first-t2", yesterdayAt(22.3), "긴 메모를 저장하면 앱이 종료되고 메모가 날아가요."],
        ["최지호", "booklog-first-t1", todayAt(0.7), "책 등록 흐름이 간단해서 처음 써도 어렵지 않았어요."],
        ["이도윤", "booklog-first-t2", todayAt(0.3), "메모를 쓰다가 저장 중에 앱이 또 꺼졌어요. 벌써 두 번째예요."],
      ] as const).map(([nickname, testItemId, submittedHoursAgo, content]) => ({
        nickname,
        testItemId,
        submittedHoursAgo,
        content,
        status: "waiting" as const,
      })),
    ]),
    /* 클로즈드 베타(v1) 피드백. 테스트가 끝나 모두 지급됐다. 버전 별 분석에서 1차 테스트(v2)와 견준다 */
    "booklog-beta": buildFeedbacks(
      "booklog-beta",
      now,
      (
        [
          ["이도윤", "booklog-beta-t2", 21, "메모를 쓰고 저장하면 앱이 꺼져요."],
          ["박서아", "booklog-beta-t2", 20.5, "저장 버튼을 누르면 가끔 앱이 닫혀요. 다시 열면 메모는 남아 있긴 해요."],
          ["김하늘", "booklog-beta-t1", 22, "검색하면 표지가 안 보이고 회색 칸만 보여요."],
          ["최지호", "booklog-beta-t1", 21.5, "표지가 늦게 떠서 내가 가진 책인지 고르기 어려워요."],
          ["이도윤", "booklog-beta-t1", 20, "표지가 뜨기 전에 눌러서 엉뚱한 책을 등록했어요."],
          ["박서아", "booklog-beta-t1", 22.5, "바코드를 찍어도 책을 못 찾아요."],
          ["김하늘", "booklog-beta-t1", 19.5, "바코드 스캔 화면이 계속 초점을 못 잡아요."],
          ["최지호", "booklog-beta-t2", 19, "본문 글자가 작아서 밑줄 긋기가 어려워요."],
          ["이도윤", "booklog-beta-t2", 18.5, "밑줄 친 문장을 어디서 다시 보는지 모르겠어요."],
          ["박서아", null, 18, "책 등록이 빨라서 좋아요."],
        ] as const
      ).map(([nickname, testItemId, days, content]) => ({ nickname, testItemId, content, submittedHoursAgo: days * 24, status: "paid" as const })),
    ),
    "folio-builder": [],
    "folio-builder-old": [],
  };

  /*
   * 북로그 1차 모집 피드백을 AI가 묶은 샘플. 신고된 리뷰는 넣지 않는다.
   * 심각도 1~4, 버그·UX·요청, 등록한 이슈와 아직 등록하지 않은 초안이 모두 보이게 둔다. 칭찬 리뷰(f15, f19)는 그룹에 넣지 않는다
   */
  const f = (...numbers: number[]) => numbers.map((number) => `booklog-first-f${number}`);
  const aiSummaries: Record<string, AiSummary> = {
    "booklog-first": {
      /* 오늘 들어온 리뷰 중 f20은 분석 뒤라 그룹에 없고 "아직 반영되지 않은 리뷰 1건"으로 보인다 */
      analyzedAt: hoursAgo(now, todayAt(0.5)),
      analyticsSummary: "메모 저장 중 앱이 꺼지는 문제와 검색 결과 화면 멈춤을 먼저 확인하세요.",
      praiseSummary: "밑줄 긋는 방식이 직관적이고 책 등록 흐름이 간단해서 처음 써도 어렵지 않았다는 평가가 많았어요.",
      /* 칭찬 리뷰: 밑줄 긋기가 직관적(f15), 책 등록이 간단(f19) */
      praiseFeedbackIds: f(15, 19),
      groups: [
        {
          id: "booklog-first-g1",
          code: "1",
          name: "메모를 저장하는 중 앱이 꺼지며 쓴 내용이 사라짐",
          category: "bug",
          severity: 1,
          issueTitle: "[버그] 밑줄 메모 저장 중 앱 종료와 메모 유실",
          issueContent:
            "## 현상\n밑줄 문장에 메모를 쓰고 저장하면 앱이 종료되고, 다시 열면 메모와 그 책의 밑줄 목록이 비어 있음\n\n## 재현 단서\n- 긴 메모(여러 줄)를 쓴 뒤 저장할 때 주로 보고됨\n- 3명이 4번 겪음, 한 테스터는 두 번 겪음\n\n## 개선 제안\n- 저장 실패 시 앱을 닫지 말고 오류를 보여 주기\n- 쓰는 중인 메모를 기기에 임시 저장해 두기",
          issue: null,
          feedbackIds: f(5, 6, 10, 18),
          representativeFeedbackId: "booklog-first-f5",
        },
        {
          id: "booklog-first-g2",
          code: "6",
          name: "검색 결과에서 책을 누르면 화면이 멈춤",
          category: "bug",
          severity: 1,
          issueTitle: "[버그] 책 검색 결과 선택 시 화면 멈춤",
          issueContent:
            "## 현상\n검색 결과에서 책을 누르면 화면이 멈추고 뒤로 가기도 되지 않음\n\n## 재현 단서\n- 첫 번째가 아닌 결과를 누를 때 보고됨\n\n## 개선 제안\n- 책 상세를 불러오는 동안 로딩을 보여 주고, 실패하면 목록으로 돌아가게 하기",
          issue: { number: 42, url: "https://github.com/testmoa-demo/booklog/issues/42" },
          feedbackIds: f(8, 13),
          representativeFeedbackId: "booklog-first-f8",
        },
        {
          id: "booklog-first-g3",
          code: "2",
          name: "검색 결과 표지가 늦게 떠 같은 책을 다시 누름",
          category: "bug",
          severity: 2,
          issueTitle: "[버그] 책 검색 결과 표지 로딩 지연",
          issueContent:
            "## 현상\n검색 결과의 표지가 한참 비어 있어 맞는 책인지 알기 어렵고, 같은 책을 두 번 누르게 됨\n\n## 개선 제안\n- 표지를 불러오는 동안 자리 표시를 보여 주기\n- 판본이 여러 개면 출판사와 출간 연도를 함께 보여 주기",
          issue: null,
          feedbackIds: f(1, 4, 12),
          representativeFeedbackId: "booklog-first-f1",
        },
        {
          id: "booklog-first-g4",
          code: "5",
          name: "저장한 문장을 다시 찾는 메뉴가 안 보임",
          category: "ux",
          severity: 3,
          issueTitle: "[UX] 밑줄 모아 보기 메뉴 찾기 어려움",
          issueContent:
            "## 현상\n밑줄 문장을 저장한 뒤 모아 보기 메뉴를 찾지 못함. 메뉴가 설정 안쪽에 있음\n\n## 개선 제안\n- 저장 직후 모아 보기로 가는 바로가기를 보여 주기\n- 아래 탭에 모아 보기를 두기",
          issue: null,
          feedbackIds: f(3, 14, 17),
          representativeFeedbackId: "booklog-first-f3",
        },
        {
          id: "booklog-first-g5",
          code: "7",
          name: "다크 모드에서 밑줄 색이 잘 안 보임",
          category: "ux",
          severity: 3,
          issueTitle: "[UX] 다크 모드 밑줄 색 대비 부족",
          issueContent: "## 현상\n다크 모드에서 밑줄 색이 배경과 비슷해 밑줄 위치와 문장을 읽기 어려움\n\n## 개선 제안\n- 다크 모드 전용 밑줄 색을 두고 배경과 대비 4.5:1 이상 맞추기",
          issue: null,
          feedbackIds: f(7, 16),
          representativeFeedbackId: "booklog-first-f7",
        },
        {
          id: "booklog-first-g6",
          code: "8",
          name: "모아 보기를 책별로 묶어 보고 싶음",
          category: "request",
          severity: 4,
          issueTitle: "[요청] 밑줄 모아 보기 책별 묶기",
          issueContent: "## 요청\n모아 보기가 날짜순으로만 보여 책별로 찾기 어려움\n\n## 제안\n- 모아 보기에 책별 묶기와 정렬 옵션 더하기",
          issue: null,
          feedbackIds: f(9, 11),
          representativeFeedbackId: "booklog-first-f9",
        },
      ],
    },
    /* 클로즈드 베타(v1) 분석. 분류 코드 1·2·5는 1차 테스트(v2)에도 이어지고, 3·4는 v2에서 보고되지 않았다. 칭찬 리뷰(f10)는 그룹에 넣지 않는다 */
    "booklog-beta": {
      analyzedAt: daysAgo(now, 16),
      analyticsSummary: "메모를 저장하면 앱이 꺼지는 문제를 먼저 확인하세요.",
      praiseSummary: "책 등록이 빠르다는 평가가 있었어요.",
      praiseFeedbackIds: ["booklog-beta-f10"],
      groups: (
        [
          ["1", "메모를 저장하면 앱이 꺼짐", "bug", 1, [1, 2], 1],
          ["2", "검색 결과 표지가 늦게 뜸", "bug", 2, [3, 4, 5], 3],
          ["3", "바코드 스캔으로 책을 찾지 못함", "bug", 2, [6, 7], 6],
          ["4", "본문 글자가 작아 밑줄 긋기 어려움", "ux", 3, [8], 8],
          ["5", "밑줄 친 문장을 다시 보는 곳을 모름", "ux", 3, [9], 9],
        ] as const
      ).map(([code, name, category, severity, numbers, representative]) => ({
        id: `booklog-beta-g${code}`,
        code,
        name,
        category,
        severity,
        issueTitle: name,
        issueContent: `## 현상\n${name}`,
        issue: null,
        feedbackIds: numbers.map((number) => `booklog-beta-f${number}`),
        representativeFeedbackId: `booklog-beta-f${representative}`,
      })),
    },
  };

  /* 1차 테스트(v2)를 클로즈드 베타(v1)와 견준 결과. 두 버전 분석이 끝난 뒤에 비교해 오래된 비교가 아니다 */
  const versionComparisons: Record<string, VersionComparisonSample> = {
    "booklog-first": {
      summary: "메모를 저장할 때 앱이 꺼지는 문제가 v1에 이어 더 자주 보고됐고, 검색 결과에서 화면이 멈추는 문제가 새로 나타났어요.",
      comparedAt: now.toISOString(),
    },
  };

  const details: Record<string, RecruitmentDetail> = {
    booklog: {
      title: "북로그 2차 베타 테스터 모집",
      selectionMode: "selection",
      accessUrl: "https://booklog.example.com",
      conditions: "한 달에 책을 한 권 이상 읽는 분\n휴대폰 브라우저(크롬·사파리)로 참여할 수 있는 분",
      /* 모집글 상세 이미지 띠에서 대표 이미지 다음에 이 순서로 놓인다 (#124) */
      images: [
        { url: "/sample/projects/booklog-library.svg", name: "2차 베타 내 서재" },
        { url: "/sample/projects/booklog-underline.svg", name: "2차 베타 밑줄 긋기" },
        { url: "/sample/projects/booklog-collection.svg", name: "2차 베타 밑줄 모아 보기" },
        { url: "/sample/feedback/booklog-search.svg", name: "2차 베타 책 검색" },
      ],
      testItems: [
        {
          id: "booklog-t1", title: "책 검색해서 등록하기", description: "읽고 있는 책을 제목이나 저자 이름으로 검색한 뒤 결과 목록에서 같은 책을 골라 내 서재에 등록해 주세요. 판본이 여러 개 나오면 표지와 출판사를 비교해 실제로 가진 책을 고르면 됩니다. 검색 결과가 없다면 띄어쓰기를 바꾸거나 부제를 빼고 다시 찾아보고, 그래도 없으면 어떤 검색어를 썼는지 메모해 주세요. 등록한 뒤에는 내 서재 첫 화면에서 책이 바로 보이는지, 표지와 제목이 맞게 나오는지도 함께 확인해 주세요. 원하는 책을 찾기까지 몇 번 검색했는지도 알려 주세요.", required: true, images: [
            { url: "/sample/feedback/booklog-search.svg", name: "책 검색 화면" },
            { url: "/sample/projects/booklog-library.svg", name: "내 서재 화면" },
          ]
        },
        {
          id: "booklog-t2", title: "밑줄 문장 남기기", description: "마음에 드는 문장을 하나 골라 밑줄로 저장한 뒤 모아 보기에서 다시 찾아 주세요. 문장을 고르기 어려웠다면 어느 단계에서 막혔는지 적어 주세요. 참고 화면: https://help.example.com/underline/how-to-save-a-sentence-and-find-it-again-in-your-collection", required: true, images: [
            { url: "/sample/projects/booklog-underline.svg", name: "밑줄 긋기 화면" },
            { url: "/sample/projects/booklog-collection.svg", name: "밑줄 모아 보기 화면" },
          ]
        },
        { id: "booklog-t3", title: "독서 기록 쓰기", description: "등록한 책에 짧은 감상을 남겨 주세요.", required: false, images: [] },
      ],
    },
    "booklog-first": {
      title: "북로그 밑줄 저장 1차 테스트",
      selectionMode: "selection",
      accessUrl: "https://beta.booklog.example.com",
      conditions: "",
      images: [],
      testItems: [
        { id: "booklog-first-t1", title: "책 검색하기", description: "제목으로 책을 찾아 보세요.", required: true, images: [] },
        { id: "booklog-first-t2", title: "저장한 문장 다시 찾기", description: "밑줄 저장 뒤 모아 보기에서 다시 찾아 보세요.", required: true, images: [] },
      ],
    },
    "booklog-beta": {
      title: "북로그 클로즈드 베타 테스트",
      selectionMode: "selection",
      accessUrl: "https://alpha.booklog.example.com",
      conditions: "",
      images: [],
      testItems: [
        { id: "booklog-beta-t1", title: "책 등록하기", description: "검색이나 바코드로 책을 찾아 내 서재에 등록해 보세요.", required: true, images: [] },
        { id: "booklog-beta-t2", title: "밑줄 긋기", description: "마음에 드는 문장에 밑줄을 긋고 메모를 남겨 보세요.", required: true, images: [] },
      ],
    },
    "folio-builder": {
      title: "포트폴리오 빌더 템플릿 테스터 모집",
      selectionMode: "firstCome",
      accessUrl: "https://folio.example.com",
      conditions: "포트폴리오를 만들어 본 적이 있는 분",
      images: [],
      testItems: [
        { id: "folio-t1", title: "템플릿 고르기", description: "마음에 드는 템플릿을 하나 골라 주세요.", required: true, images: [] },
        { id: "folio-t2", title: "프로젝트 추가하기", description: "프로젝트 하나를 추가하고 미리보기로 확인해 주세요.", required: true, images: [] },
      ],
    },
    "folio-builder-old": {
      title: "포트폴리오 빌더 첫 버전 테스트",
      selectionMode: "firstCome",
      accessUrl: "https://old.folio.example.com",
      conditions: "",
      images: [],
      testItems: [{ id: "folio-old-t1", title: "템플릿 고르기", description: "첫 버전 템플릿 화면을 써 보세요.", required: true, images: [] }],
    },
  };

  const cancellations: Record<string, RecruitmentCancellation> = {
    "folio-builder-old": { reason: "서비스 화면을 크게 바꿔서 다시 모집할게요", cancelledAt: daysAgo(now, 10) },
  };

  const projects: Project[] = buildProjectRecords(now).map(project => ({ ...project, recruitments: ({ "booklog": [booklog, booklogFirst, booklogBeta], "folio-builder": [folioNext, folio, folioOld], "todo-memo": [] } as Record<string, Recruitment[]>)[project.key] }));

  return { projects, applications, feedbacks, aiSummaries, versionComparisons, details, cancellations };
}

/**
 * 시연용 AI 후속 질문 3개. 실제로는 백엔드가 AI 분석 서버에서 받아 온다(POST /api/v1/developer/feedbacks/{id}/followup-questions).
 * 테스트 항목이 없는 기타 의견은 항목 이름 없이 묻는다.
 */
export function buildFollowupQuestions(testItemTitle: string | null): string[] {
  /* 항목 이름 뒤 조사(을/를)가 받침에 따라 달라서 "항목을"로 고정한다 */
  const where = testItemTitle ? `"${testItemTitle}" 항목을 테스트하실 때` : "테스트하실 때";
  return [
    `${where} 어떤 부분이 불편했는지, 그때 무엇을 하려고 하셨는지 자세히 알려주실 수 있을까요?`,
    "그 순간 화면에 어떤 문구나 버튼이 보였는지 말씀해 주실 수 있을까요?",
    "같은 상황에서 화면이 어떻게 달라지면 더 편하셨을지 편하게 들려주실 수 있을까요?",
  ];
}

/** 모집 데이터 없이 프로젝트 자체만 만드는 시연 원천. */
export function buildProjectRecords(now: Date): ProjectRecord[] {
  return [{
key: "booklog",
    name: "북로그",
    description:
      "읽은 책을 검색해 등록하고, 마음에 드는 문장에 밑줄을 그어 모아 두는 서비스예요.\n이번에는 책 등록부터 기록 작성까지 처음 쓰는 흐름이 자연스러운지 보고 싶어요.",
    image: { url: "/sample/projects/booklog.svg", name: "내 서재와 밑줄 문장 화면" },
    /* 리뷰 분석의 GitHub 이슈 등록은 레포가 연결된 프로젝트에서만 된다 */
    repository: "testmoa-demo/booklog",
    createdAt: daysAgo(now, 30)
},
  {
key: "folio-builder",
    name: "포트폴리오 빌더",
    description: "템플릿을 고르고 프로젝트를 추가하면 포트폴리오 페이지를 만들어 주는 서비스예요.\n이번에는 템플릿을 고르는 화면이 이해하기 쉬운지 보고 싶어요.",
    image: { url: "/sample/projects/folio-builder.svg", name: "템플릿 고르기 화면" },
    createdAt: daysAgo(now, 20)
},
  {
key: "todo-memo",
    name: "할 일 메모",
    description: "",
    image: null,
    createdAt: daysAgo(now, 1)
}];
}
