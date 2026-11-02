/*
 * 시연용 샘플 데이터. 실제 서비스나 사용자와 관계없다.
 * 날짜는 기준 시각에서 상대적으로 만들어 언제 시연해도 같은 상태로 보인다.
 * 북로그와 포트폴리오 빌더 모집 건은 홈의 샘플(recruitment/mock.ts)을 그대로 받아 쓴다.
 */
import type { Recruitment } from "@/features/recruitment/types";
import type { AiSummary, Application, ApplicationStatus, Feedback, FeedbackStatus, Project } from "./types";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const NICKNAMES = [
  "김하늘", "이도윤", "박서아", "최지호", "정예린", "강민준", "조하은", "윤시우", "장유나", "임건우",
  "한지아", "오태윤", "서다인", "신우진", "권나연", "황준서", "안소율", "송현우", "전채원", "홍지안", "문서진", "배하린",
];

const hoursAgo = (now: Date, hours: number) => new Date(now.getTime() - hours * HOUR_MS).toISOString();
const daysAgo = (now: Date, days: number) => new Date(now.getTime() - days * DAY_MS).toISOString();
const inDays = (now: Date, days: number) => new Date(now.getTime() + days * DAY_MS).toISOString();

/** 상태별 인원 수로 지원 목록을 만든다. 먼저 지원한 사람부터 확정, 거절, 대기 순이다 */
function buildApplications(slug: string, now: Date, counts: Record<ApplicationStatus, number>): Application[] {
  const statuses: ApplicationStatus[] = [
    ...Array<ApplicationStatus>(counts.confirmed).fill("confirmed"),
    ...Array<ApplicationStatus>(counts.rejected).fill("rejected"),
    ...Array<ApplicationStatus>(counts.applied).fill("applied"),
  ];
  return statuses.map((status, index) => ({
    id: `${slug}-a${index + 1}`,
    testerNickname: NICKNAMES[index % NICKNAMES.length],
    status,
    appliedAt: hoursAgo(now, (statuses.length - index) * 3),
  }));
}

type FeedbackSeed = { nickname: string; content: string; submittedHoursAgo: number; status: FeedbackStatus };

function buildFeedbacks(slug: string, now: Date, seeds: FeedbackSeed[]): Feedback[] {
  return seeds.map((seed, index) => ({
    id: `${slug}-f${index + 1}`,
    testerNickname: seed.nickname,
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

  /* 정원이 찼지만 아직 모집 마감 전인 구독 모집. 확정 버튼 비활성 상태를 보여 준다 */
  const booklogBeta: Recruitment = {
    ...booklog,
    slug: "booklog-beta",
    request: "새로 만든 독서 통계 화면을 보고 헷갈리는 곳 알려 주기",
    createdAt: daysAgo(now, 1),
    recruitDeadline: inDays(now, 3),
    submitDeadline: inDays(now, 10),
    capacity: 5,
    confirmedCount: 5,
  };

  const applications: Record<string, Application[]> = {
    booklog: buildApplications("booklog", now, { confirmed: booklog.confirmedCount, rejected: 1, applied: 8 }),
    "booklog-beta": buildApplications("booklog-beta", now, { confirmed: 5, rejected: 0, applied: 1 }),
    /* 무료 모집은 선착순 자동 확정이라 대기·거절이 없다 */
    "folio-builder": buildApplications("folio-builder", now, { confirmed: folio.confirmedCount, rejected: 0, applied: 0 }),
  };

  const feedbacks: Record<string, Feedback[]> = {
    booklog: buildFeedbacks("booklog", now, [
      { nickname: "김하늘", content: "책 검색 결과에서 표지가 늦게 떠서 같은 책을 두 번 눌렀어요.", submittedHoursAgo: 10, status: "waiting" },
      { nickname: "이도윤", content: "좋아요.", submittedHoursAgo: 30, status: "reported" },
      { nickname: "박서아", content: "밑줄 문장 저장은 편했는데, 저장한 문장을 다시 찾는 메뉴가 안 보였어요.", submittedHoursAgo: 96, status: "paid" },
    ]),
    "booklog-beta": [],
    "folio-builder": buildFeedbacks("folio-builder", now, [
      { nickname: "최지호", content: "템플릿을 바꾸면 입력한 경력이 사라져요.", submittedHoursAgo: 20, status: "waiting" },
      { nickname: "정예린", content: "PDF로 내보낼 때 한글 글꼴이 깨졌어요.", submittedHoursAgo: 80, status: "paid" },
    ]),
  };

  /* 북로그 피드백 3건을 정리한 샘플. 항목과 근거 수는 위 피드백 내용과 맞춘다 */
  const aiSummaries: Record<string, AiSummary> = {
    booklog: {
      headline: "기록 기능은 편하다는 반응이지만, 책을 찾고 저장한 문장을 다시 찾는 흐름에서 헷갈린다는 의견이 있어요.",
      issues: [
        {
          text: "책 검색 결과에서 표지가 늦게 떠서 같은 책을 다시 눌러요",
          feedbackCount: 1,
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

  const projects: Project[] = [
    {
      key: "booklog",
      name: booklog.projectName,
      summary: booklog.summary,
      softwareType: booklog.softwareType,
      accessUrl: "https://booklog.example.com",
      createdAt: daysAgo(now, 30),
      recruitments: [booklogBeta, booklog],
    },
    {
      key: "folio-builder",
      name: folio.projectName,
      summary: folio.summary,
      softwareType: folio.softwareType,
      accessUrl: "https://folio.example.com",
      createdAt: daysAgo(now, 20),
      recruitments: [folio],
    },
    {
      /* 모집 건이 없는 프로젝트. 빈 상태를 보여 준다 */
      key: "todo-memo",
      name: "할 일 메모",
      summary: "할 일을 한 줄씩 적고 끝내면 지우는 메모 서비스",
      softwareType: "web",
      accessUrl: "https://todo-memo.example.com",
      createdAt: daysAgo(now, 1),
      recruitments: [],
    },
  ];

  return { projects, applications, feedbacks, aiSummaries };
}
