/*
 * 시연용 샘플 데이터. 실제 서비스나 사용자와 관계없다.
 * 날짜는 기준 시각에서 상대적으로 만들어 언제 시연해도 같은 상태로 보인다.
 * 북로그와 포트폴리오 빌더 모집 건은 홈의 샘플(recruitment/mock.ts)을 그대로 받아 쓴다. 둘 다 아직 모집 마감 전이라 피드백이 없다.
 * 날짜 순서는 항상 모집 생성 → 지원 → 모집 마감 → 피드백 제출이다. 피드백은 테스트 중인 북로그 1차 모집에만 있다.
 */
import type { Recruitment } from "@/features/recruitment/types";
import type {
  AiSummary,
  Application,
  ApplicationStatus,
  Feedback,
  FeedbackStatus,
  Project,
  RecruitmentCancellation,
  ProjectImage,
  RecruitmentDetail,
} from "./types";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const NICKNAMES = [
  "김하늘", "이도윤", "박서아", "최지호", "윤슬", "강민준", "조하은", "윤시우", "장유나", "임건우",
  "한지아", "오태윤", "서다인", "신우진", "권나연", "황준서", "안소율", "송현우", "전채원", "홍지안", "문서진", "배하린",
];

const hoursAgo = (now: Date, hours: number) => new Date(now.getTime() - hours * HOUR_MS).toISOString();
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
    /* 무료 모집은 선착순 자동 확정이라 대기·거절이 없다 */
    "folio-builder": buildApplications(folio, now, { confirmed: folio.confirmedCount, rejected: 0, cancelled: 0, applied: 0 }),
    "folio-builder-old": buildApplications(folioOld, now, { confirmed: 0, rejected: 0, cancelled: 3, applied: 0 }),
  };

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
    ]),
    "folio-builder": [],
    "folio-builder-old": [],
  };

  /* 북로그 1차 모집 피드백 중 신고된 1건을 뺀 3건을 정리한 샘플. 항목과 근거 수는 위 피드백 내용과 맞춘다 */
  const aiSummaries: Record<string, AiSummary> = {
    "booklog-first": {
      headline: "기록 기능은 편하다는 반응이지만, 책을 찾고 저장한 문장을 다시 찾는 흐름에서 헷갈린다는 의견이 있어요.",
      issues: [
        {
          text: "책 검색 결과에서 표지가 늦게 떠서 같은 책을 다시 눌러요",
          feedbackCount: 2,
          suggestion: "검색 결과에서 표지를 불러오는 동안 자리 표시를 보여 주기",
        },
        {
          text: "저장한 문장을 다시 찾는 메뉴가 잘 안 보여요",
          feedbackCount: 1,
          suggestion: "저장한 문장 모아 보기 메뉴를 눈에 띄는 곳에 두기",
        },
      ],
      strengths: [{ text: "밑줄 문장 저장이 편해요", feedbackCount: 1 }],
      generatedAt: hoursAgo(now, 2),
      isSample: true,
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
        { id: "booklog-t1", title: "책 검색해서 등록하기", description: "읽고 있는 책을 제목이나 저자 이름으로 검색한 뒤 결과 목록에서 같은 책을 골라 내 서재에 등록해 주세요. 판본이 여러 개 나오면 표지와 출판사를 비교해 실제로 가진 책을 고르면 됩니다. 검색 결과가 없다면 띄어쓰기를 바꾸거나 부제를 빼고 다시 찾아보고, 그래도 없으면 어떤 검색어를 썼는지 메모해 주세요. 등록한 뒤에는 내 서재 첫 화면에서 책이 바로 보이는지, 표지와 제목이 맞게 나오는지도 함께 확인해 주세요. 원하는 책을 찾기까지 몇 번 검색했는지도 알려 주세요.", required: true, images: [
            { url: "/sample/feedback/booklog-search.svg", name: "책 검색 화면" },
            { url: "/sample/projects/booklog-library.svg", name: "내 서재 화면" },
          ] },
        { id: "booklog-t2", title: "밑줄 문장 남기기", description: "마음에 드는 문장을 하나 골라 밑줄로 저장한 뒤 모아 보기에서 다시 찾아 주세요. 문장을 고르기 어려웠다면 어느 단계에서 막혔는지 적어 주세요. 참고 화면: https://help.example.com/underline/how-to-save-a-sentence-and-find-it-again-in-your-collection", required: true, images: [
            { url: "/sample/projects/booklog-underline.svg", name: "밑줄 긋기 화면" },
            { url: "/sample/projects/booklog-collection.svg", name: "밑줄 모아 보기 화면" },
          ] },
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

  const projects: Project[] = [
    {
      key: "booklog",
      name: booklog.projectName,
      description:
        "읽은 책을 검색해 등록하고, 마음에 드는 문장에 밑줄을 그어 모아 두는 서비스예요.\n이번에는 책 등록부터 기록 작성까지 처음 쓰는 흐름이 자연스러운지 보고 싶어요.",
      image: { url: "/sample/projects/booklog.svg", name: "내 서재와 밑줄 문장 화면" },
      createdAt: daysAgo(now, 30),
      recruitments: [booklog, booklogFirst],
    },
    {
      key: "folio-builder",
      name: folio.projectName,
      description: "템플릿을 고르고 프로젝트를 추가하면 포트폴리오 페이지를 만들어 주는 서비스예요.\n이번에는 템플릿을 고르는 화면이 이해하기 쉬운지 보고 싶어요.",
      image: { url: "/sample/projects/folio-builder.svg", name: "템플릿 고르기 화면" },
      createdAt: daysAgo(now, 20),
      recruitments: [folioNext, folio, folioOld],
    },
    {
      /* 모집 건, 상세 설명, 대표 이미지가 없는 프로젝트. 빈 상태와 기본 이미지를 보여 준다 */
      key: "todo-memo",
      name: "할 일 메모",
      description: "",
      image: null,
      createdAt: daysAgo(now, 1),
      recruitments: [],
    },
  ];

  return { projects, applications, feedbacks, aiSummaries, details, cancellations };
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
