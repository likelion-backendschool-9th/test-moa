import { getDemoDataMode, waitIfSlow } from "@/demo/mode";
import { buildDeveloperProjects, buildFollowupQuestions, type ProjectSeedData } from "@/demo/project";
import {
  buildGeneralRecruitments,
  buildPastRecruitments,
  buildPromotedRecruitments,
  readCancellations,
  readDecisions,
  saveCancellation,
  saveDecisions,
  type Decision,
} from "@/demo/recruitment";
import { findBackendProject, findBackendProjects, isBackendId, readProjectApi } from "@/features/project/api";
import { parseFileMeta } from "@/features/project/media";
import { recruitmentManagePath } from "@/features/project/paths";
import { type FormState } from "@/features/project/types";
import type { RecruitmentQuery } from "@/features/recruitment/query";
import type {
  AiSummary,
  Application,
  Feedback,
  ProjectWithRecruitments as Project,
  PublicRecruitmentData,
  Recruitment,
  RecruitmentCancellation,
  RecruitmentDetail,
  RecruitmentPage,
} from "@/features/recruitment/types";
import {
  AI_MIN_FEEDBACKS,
  type AiAnalysis,
  type ApplicationStatus,
  type ApplyState,
  type AnalysisStatus,
  type GithubIssue,
  compareVersions,
  type BackendAnalysisGroup,
  type BackendGroupReview,
  fromBackendGroups,
  buildTrends,
  toGroupReviews,
  toGroupView,
  type VersionComparison,
  BASE_REWARD,
  EXTRA_REWARD,
  type ProjectOverview,
  type ProjectRecruitmentRow,
  type ProjectSummary,
  RECRUITMENT_LIMIT,
  type RecruitmentView,
  type SelectionMode,
  type SoftwareType,
  type TodoItem,
  canCancelRecruitment,
  canSelectApplicants,
  type EditState,
  type RecruitmentEditSection,
  getAnalytics,
  getEditLocks,
  validatePostEdit,
  validateRepositoryConnect,
  validateTermsEdit,
  validateTestItemsEdit,
  getHoursUntilPaid,
  getRecruitmentStatus,
  getSubmissionStatus,
  pickBannerRecruitments,
  type FollowupResult,
  type RecruitmentStatus,
} from "@/features/recruitment/types";
import { requireRole } from "@/features/session/guard";
import type { Role } from "@/features/session/session";
import { backendFetch, isBackendAuth, type BackendResult } from "@/lib/backend";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import "server-only";

/*
 * 모집 데이터 접근. 지금은 목업을 돌려준다.
 * 실제 API를 붙일 때는 이 파일의 함수 본문만 바꾸고 시그니처는 유지한다.
 */

const SLOW_DELAY_MS = 1500;

async function loadAll() {
  const mode = await getDemoDataMode();
  if (mode === "slow") await new Promise((resolve) => setTimeout(resolve, SLOW_DELAY_MS));
  /* 마감 판단은 요청 시각 기준이라 미리 렌더링하지 않는다 */
  await connection();
  const now = new Date();
  if (mode === "empty") return { now, subscription: [] as Recruitment[], general: [] as Recruitment[] };
  const subscription = buildPromotedRecruitments(now);
  return {
    now,
    subscription: mode === "single" ? subscription.slice(0, 1) : subscription,
    general: buildGeneralRecruitments(now),
  };
}

const byLatest = (a: Recruitment, b: Recruitment) => b.createdAt.localeCompare(a.createdAt);
const byDeadline = (a: Recruitment, b: Recruitment) => a.recruitDeadline.localeCompare(b.recruitDeadline);

const RECRUITMENTS_API = "/api/v1/recruitments";
/* 백엔드 검색 요청의 한도. 넘으면 400이라 주소를 고쳐 쓴 요청도 목록을 보여 주도록 맞춘다 */
const MAX_SEARCH_LENGTH = 100;
const MAX_SEARCH_PAGE = 2147483647;

/** 백엔드 RecruitmentPageResponse */
type RecruitmentPageResponse = {
  items: Array<{
    id: number;
    title: string;
    projectName: string;
    projectDescription: string | null;
    projectImageUrl: string | null;
    softwareType: SoftwareType | null;
    subscription: boolean;
    createdAt: string;
    recruitDeadline: string;
    submitDeadline: string;
  }>;
  total: number;
  page: number;
  pageCount: number;
};

/** 공개 모집 목록을 읽어 화면의 모집 건으로 바꾼다. 카드 문구는 모집글 제목이다 */
async function readRecruitmentPage(params: URLSearchParams): Promise<RecruitmentPage> {
  /* 로그인이 필요 없는 목록이다. 토큰을 붙이면 로그아웃·정지로 막힌 회원은 401을 받아 홈이 열리지 않는다 */
  const result = await backendFetch<RecruitmentPageResponse>(`${RECRUITMENTS_API}?${params}`, { withToken: false });
  if (!result.ok) throw new Error(result.message);
  const { items, total, page, pageCount } = result.data;
  return {
    total,
    page,
    pageCount,
    items: items.map((item) => ({
      slug: String(item.id),
      projectName: item.projectName,
      ...(item.projectImageUrl ? { projectImage: item.projectImageUrl } : {}),
      summary: item.projectDescription ?? "",
      request: item.title,
      softwareTypes: item.softwareType ? [item.softwareType] : [],
      isSubscription: item.subscription,
      createdAt: item.createdAt,
      recruitDeadline: item.recruitDeadline,
      submitDeadline: item.submitDeadline,
      confirmedCount: 0,
      /* 공개 API에는 금액이 없어 서비스 상수로 채운다. 추가 보상은 지급하지 않아 넣지 않는다 */
      baseReward: BASE_REWARD,
    })),
  };
}

/** 구독 개발자의 모집 건 (상단 노출 혜택) */
export async function getSubscriptionRecruitments(): Promise<Recruitment[]> {
  if (isBackendAuth) {
    /* 더 보기가 없는 영역이라 백엔드 한도(50)까지 읽는다 */
    const params = new URLSearchParams({ subscription: "true", open: "true", size: "50" });
    return (await readRecruitmentPage(params)).items;
  }
  const { subscription } = await loadAll();
  return [...subscription].sort(byLatest);
}

/** 홈 배너의 교정지 더미에 쓴다. 모집 마감 전인 구독 모집을 최신순으로 먼저 놓고, 남는 자리는 전체 최신순으로 채운다 */
export async function getLatestOpenRecruitments(limit = 3): Promise<Recruitment[]> {
  if (isBackendAuth) {
    const size = String(limit);
    const [subscription, latest] = await Promise.all([
      readRecruitmentPage(new URLSearchParams({ subscription: "true", open: "true", size })),
      readRecruitmentPage(new URLSearchParams({ open: "true", size })),
    ]);
    return pickBannerRecruitments(subscription.items, latest.items, limit);
  }
  const { now, subscription, general } = await loadAll();
  const open = [...subscription, ...general].filter((item) => new Date(item.recruitDeadline) > now).sort(byLatest);
  return pickBannerRecruitments(open.filter((item) => item.isSubscription), open, limit);
}

export const RECRUITMENT_PAGE_SIZE = 20;

/** 전체 모집 건을 검색 조건으로 거르고 한 페이지만 잘라 준다. 검색 대상은 이름, 소개, 요청 내용이다 */
export async function searchRecruitments(query: RecruitmentQuery): Promise<RecruitmentPage> {
  if (isBackendAuth) {
    const params = new URLSearchParams({
      sort: query.sort,
      page: String(Math.min(query.page, MAX_SEARCH_PAGE)),
      size: String(RECRUITMENT_PAGE_SIZE),
    });
    if (query.q) params.set("q", query.q.slice(0, MAX_SEARCH_LENGTH));
    if (query.type) params.set("type", query.type);
    if (query.open) params.set("open", "true");
    return readRecruitmentPage(params);
  }
  const { now, subscription, general } = await loadAll();
  const keyword = query.q.toLowerCase();
  const isClosed = (item: Recruitment) => new Date(item.recruitDeadline) <= now;
  /* 마감 임박순에서 이미 마감한 모집은 맨 뒤로 보낸다 */
  const byUpcomingDeadline = (a: Recruitment, b: Recruitment) => Number(isClosed(a)) - Number(isClosed(b)) || byDeadline(a, b);
  const sorter = { latest: byLatest, deadline: byUpcomingDeadline }[query.sort];
  const matched = [...subscription, ...general]
    .filter((item) => !query.type || item.softwareTypes.includes(query.type))
    .filter((item) => !query.open || !isClosed(item))
    .filter((item) => !keyword || [item.projectName, item.summary, item.request].some((text) => text.toLowerCase().includes(keyword)))
    .sort(sorter);
  const pageCount = Math.max(1, Math.ceil(matched.length / RECRUITMENT_PAGE_SIZE));
  const page = Math.min(query.page, pageCount);
  const start = (page - 1) * RECRUITMENT_PAGE_SIZE;
  return { items: matched.slice(start, start + RECRUITMENT_PAGE_SIZE), total: matched.length, page, pageCount };
}

/** slug로 모집 건을 찾는다. 끝난 모집 건도 포함하고, 목록용 시연 상황(demo-data)은 따르지 않는다 */
export async function getRecruitmentsBySlugs(slugs: string[]): Promise<Recruitment[]> {
  await connection();
  const now = new Date();
  return [...buildPromotedRecruitments(now), ...buildGeneralRecruitments(now), ...buildPastRecruitments(now)].filter((item) =>
    slugs.includes(item.slug),
  );
}

const EMPTY: ProjectSeedData = { projects: [], applications: {}, feedbacks: {}, aiSummaries: {}, versionComparisons: {}, details: {}, cancellations: {} };

/** 한 요청 안에서는 목업을 한 번만 만든다 */
const load = cache(async (role: Role): Promise<ProjectSeedData> => {
  const mode = await getDemoDataMode();
  if (mode === "slow") await new Promise((resolve) => setTimeout(resolve, SLOW_DELAY_MS));
  /* 날짜가 요청 시각 기준이라 미리 렌더링하지 않는다 */
  await connection();
  /* 시연에서는 개발자 역할만 프로젝트를 가진다 */
  if (mode === "empty" || role !== "developer") return EMPTY;
  const now = new Date();
  const seed = buildDeveloperProjects(now, [...buildPromotedRecruitments(now), ...buildGeneralRecruitments(now)]);
  return applyCancellations(applyDecisions(seed, await readDecisions()), await readCancellations());
});

/** 시연 중 확정·거절한 결과를 덮어쓰고, 모집 건의 확정 인원을 지원 목록에서 다시 센다 */
function applyDecisions(seed: ProjectSeedData, decisions: Record<string, Decision>): ProjectSeedData {
  const applications = Object.fromEntries(
    Object.entries(seed.applications).map(([key, list]) => [
      key,
      list.map((item) => (item.status === "applied" && decisions[item.id] ? { ...item, status: decisions[item.id] } : item)),
    ]),
  );
  return { ...seed, applications, projects: recountConfirmed(seed.projects, applications) };
}

/** 모집 건의 확정 인원을 지원 목록에서 다시 센다 */
function recountConfirmed(projects: Project[], applications: ProjectSeedData["applications"]): Project[] {
  return projects.map((project) => ({
    ...project,
    recruitments: project.recruitments.map((recruitment) => {
      const list = applications[recruitment.slug];
      return list ? { ...recruitment, confirmedCount: list.filter((item) => item.status === "confirmed").length } : recruitment;
    }),
  }));
}

/**
 * 시연 중 취소한 모집 건을 반영한다. 피드백을 낸 확정 테스터는 보상 대상이라 그대로 두고, 나머지 참여와 대기 지원은 취소한다.
 * 목업은 지원 id가 피드백에 없어 닉네임으로 잇는다. 거절된 지원은 그대로 둔다.
 */
function applyCancellations(seed: ProjectSeedData, cancelled: Record<string, RecruitmentCancellation>): ProjectSeedData {
  const applications = { ...seed.applications };
  for (const slug of Object.keys(cancelled)) {
    const submitted = new Set((seed.feedbacks[slug] ?? []).map((item) => item.testerNickname));
    applications[slug] = (applications[slug] ?? []).map((item) => {
      if (item.status === "applied" || (item.status === "confirmed" && !submitted.has(item.testerNickname))) {
        return { ...item, status: "cancelled" as const };
      }
      return item;
    });
  }
  return {
    ...seed,
    applications,
    cancellations: { ...seed.cancellations, ...cancelled },
    projects: recountConfirmed(seed.projects, applications),
  };
}

/** 지원자 확정·거절을 저장한다. 서버 액션에서만 부른다. 저장하지 못하면 false */
export async function saveApplicationDecisions(ids: string[], status: Decision): Promise<boolean> {
  return saveDecisions(ids, status);
}

/**
 * 누구나 볼 수 있는 모집글 하나. 역할과 상관없이 읽는다. 없거나 취소된 모집 건은 null.
 * 시연용 상세 샘플은 개발자 데모 계정의 모집 건에만 있다.
 */
export async function findPublicRecruitment(slug: string): Promise<PublicRecruitmentData | null> {
  if (isBackendAuth) return readPublicRecruitment(slug);
  const mode = await getDemoDataMode();
  if (mode === "slow") await new Promise((resolve) => setTimeout(resolve, SLOW_DELAY_MS));
  await connection();
  const now = new Date();
  const home = [...buildPromotedRecruitments(now), ...buildGeneralRecruitments(now)];
  const seed = buildDeveloperProjects(now, home);
  if (seed.cancellations[slug] || (await readCancellations())[slug]) return null;
  const owner = seed.projects.find((project) => project.recruitments.some((item) => item.slug === slug));
  const recruitment =
    owner?.recruitments.find((item) => item.slug === slug) ?? [...home, ...buildPastRecruitments(now)].find((item) => item.slug === slug);
  if (!recruitment) return null;
  return { recruitment, detail: seed.details[slug] ?? null, project: owner ?? null };
}

/** 백엔드 RecruitmentResponse */
type PublicRecruitmentResponse = {
  id: number;
  title: string;
  description: string;
  conditions: string | null;
  selectionMode: SelectionMode;
  softwareType: SoftwareType | null;
  subscription: boolean;
  recruitDeadline: string;
  submitDeadline: string;
  project: { id: number; name: string; description: string | null; imageUrl: string | null };
  imageUrls: string[];
  testItems: Array<{ id: number; title: string; description: string | null; required: boolean; imageUrls: string[] }>;
  myRegisterStatus: ApplicationStatus | null;
};

/** 공개 모집글을 읽어 화면 모양으로 바꾼다. 없거나 취소됐거나 id로 쓸 수 없는 주소면 null */
async function readPublicRecruitment(slug: string): Promise<PublicRecruitmentData | null> {
  if (!isBackendId(slug)) return null;
  const path = `${RECRUITMENTS_API}/${slug}`;
  /* 내 지원 상태를 받으려고 토큰을 붙인다. 토큰이 막혔으면 비로그인으로 다시 읽어 공개 글은 보여 준다 */
  let result = await backendFetch<PublicRecruitmentResponse>(path);
  if (!result.ok && result.status === 401) result = await backendFetch<PublicRecruitmentResponse>(path, { withToken: false });
  if (!result.ok) {
    if (result.status === 404) return null;
    throw new Error(result.message);
  }
  const { data } = result;
  const projectDescription = data.project.description ?? "";
  const toImages = (urls: string[], name: string) => urls.map((url, index) => ({ url, name: `${name} 이미지 ${index + 1}` }));
  return {
    recruitment: {
      slug: String(data.id),
      projectName: data.project.name,
      ...(data.project.imageUrl ? { projectImage: data.project.imageUrl } : {}),
      summary: projectDescription,
      request: data.description,
      softwareTypes: data.softwareType ? [data.softwareType] : [],
      isSubscription: data.subscription,
      /* 상세 응답에는 작성일이 없고, 화면은 마감일로만 상태를 계산한다 */
      createdAt: "",
      recruitDeadline: data.recruitDeadline,
      submitDeadline: data.submitDeadline,
      confirmedCount: 0,
      baseReward: BASE_REWARD,
    },
    detail: {
      title: data.title,
      selectionMode: data.selectionMode,
      /* 접속 링크는 확정된 테스터에게만 안내해서 공개 응답에 없다 */
      accessUrl: "",
      conditions: data.conditions ?? "",
      images: toImages(data.imageUrls, data.title),
      testItems: data.testItems.map((item) => ({
        id: String(item.id),
        title: item.title,
        description: item.description ?? "",
        required: item.required,
        images: toImages(item.imageUrls, item.title),
      })),
    },
    project: {
      description: projectDescription,
      image: data.project.imageUrl ? { url: data.project.imageUrl, name: `${data.project.name} 대표 이미지` } : null,
    },
    myRegisterStatus: data.myRegisterStatus,
  };
}

/** 테스트에 지원한다. 마감·자기 모집·중복 지원은 서버가 거절한 이유를 그대로 보여 준다 */
export async function submitApplication(slug: string): Promise<ApplyState> {
  const path = `/recruitments/${slug}/apply`;
  await requireRole(path);
  if (!isBackendAuth) return { status: "error", message: "지금은 지원할 수 없어요" };
  if (!isBackendId(slug)) notFound();
  const result = await backendFetch<{ status: ApplicationStatus }>(`${RECRUITMENTS_API}/${slug}/applications`, { method: "POST" });
  if (result.ok) return { status: "done", confirmed: result.data.status === "confirmed" };
  if (result.status === 401) redirect(`/login?next=${encodeURIComponent(path)}`);
  return { status: "error", message: result.message };
}

/** 회원의 프로젝트 전체 */
export async function findProjects(role: Role): Promise<Project[]> {
  return (await load(role)).projects;
}

/** 내 모집 하나와 소유 프로젝트. 전체 탐색은 목업에만 해당하고, API에서는 모집 키로 소유권을 확인한다 */
export async function findOwnedRecruitment(role: Role, recruitmentKey: string) {
  const { projects } = await load(role);
  for (const project of projects) {
    const recruitment = project.recruitments.find((item) => item.slug === recruitmentKey);
    if (recruitment) return { project, recruitment };
  }
  return null;
}

/** 모집 건 하나의 지원 목록 */
export async function findApplications(role: Role, recruitmentKey: string): Promise<Application[]> {
  return (await load(role)).applications[recruitmentKey] ?? [];
}

/** 모집 건 하나의 피드백 목록 */
export async function findFeedbacks(role: Role, recruitmentKey: string): Promise<Feedback[]> {
  return (await load(role)).feedbacks[recruitmentKey] ?? [];
}

/**
 * 모집 건 피드백의 AI 분석 결과. 없으면 null.
 * 실제 AI를 붙이면 이 함수가 AI API를 부른다. 분석은 느릴 수 있어서 화면은 따로 기다린다.
 */
export async function findAiSummary(role: Role, recruitmentKey: string): Promise<AiSummary | null> {
  const mode = await getDemoDataMode();
  /* 느린 응답 시연: 숫자 카드보다 늦게 도착하는 모습을 보여 준다 */
  if (mode === "slow") await new Promise((resolve) => setTimeout(resolve, SLOW_DELAY_MS));
  return (await load(role)).aiSummaries[recruitmentKey] ?? null;
}

/* 백엔드는 AI 분석 서버의 응답을 30초까지 기다린다(연결 5초 별도). 그보다 먼저 끊지 않게 넉넉히 기다린다 */
const FOLLOWUP_TIMEOUT_MS = 40_000;

/** 백엔드 FollowupQuestionsResponse */
type FollowupQuestions = { questions: string[] };

/**
 * 피드백 하나로 테스터에게 되물을 AI 후속 질문을 받는다. 백엔드가 구독 여부와 하루 3번 한도를 확인한다.
 * AUTH_MODE=backend면 백엔드를 부르고, 아니면 시연용 샘플을 돌려준다.
 */
export async function requestFollowupQuestions(
  role: Role,
  recruitmentKey: string,
  feedbackId: string,
): Promise<BackendResult<FollowupQuestions>> {
  if (isBackendAuth) {
    return backendFetch<FollowupQuestions>(`/api/v1/developer/feedbacks/${encodeURIComponent(feedbackId)}/followup-questions`, {
      method: "POST",
      timeoutMs: FOLLOWUP_TIMEOUT_MS,
    });
  }
  await waitIfSlow();
  const { feedbacks, details } = await load(role);
  const feedback = feedbacks[recruitmentKey]?.find((item) => item.id === feedbackId);
  const testItem = details[recruitmentKey]?.testItems.find((item) => item.id === feedback?.testItemId);
  return { ok: true, data: { questions: buildFollowupQuestions(testItem?.title ?? null) } };
}

const EMPTY_DETAIL: RecruitmentDetail = { title: "", selectionMode: "firstCome", accessUrl: "", conditions: "", images: [], testItems: [] };

/** 모집 건의 모집 조건과 테스트 항목. 백엔드 모드에서는 공개 모집글 API로 읽는다 */
export async function findRecruitmentDetail(role: Role, recruitmentKey: string): Promise<RecruitmentDetail> {
  if (isBackendAuth) return (await readPublicRecruitment(recruitmentKey))?.detail ?? { ...EMPTY_DETAIL, unavailable: true };
  return (await load(role)).details[recruitmentKey] ?? EMPTY_DETAIL;
}

/** 모집 건의 취소 기록. 취소하지 않았으면 null */
export async function findCancellation(role: Role, recruitmentKey: string): Promise<RecruitmentCancellation | null> {
  return (await load(role)).cancellations[recruitmentKey] ?? null;
}

/** 모집 취소를 저장한다. 서버 액션에서만 부른다. 저장하지 못하면 false */
export async function saveRecruitmentCancellation(recruitmentKey: string, reason: string): Promise<boolean> {
  return saveCancellation(recruitmentKey, { reason, cancelledAt: new Date().toISOString() });
}

/** 회원이 지금 구독 중인지. 시연에서는 개발자 역할만 구독 중이다 */
export async function findIsSubscribed(role: Role): Promise<boolean> {
  if (!isBackendAuth) return role === "developer";
  const result = await backendFetch<{ active: boolean | null }>("/api/v1/my/subscription/status");
  if (!result.ok) throw new Error(result.message);
  return result.data.active === true;
}

const byCreatedLatest = (a: { createdAt: string }, b: { createdAt: string }) => b.createdAt.localeCompare(a.createdAt);

/** 프로젝트의 모집 건에 상태를 붙인다. 개발자가 취소한 모집 건은 취소 상태다 */
async function withStatus(role: Role, recruitments: Recruitment[], now: Date): Promise<RecruitmentView[]> {
  const cancellations = await Promise.all(recruitments.map((item) => findCancellation(role, item.slug)));
  const details = await Promise.all(recruitments.map((item) => findRecruitmentDetail(role, item.slug)));
  return recruitments.map((item, index) => ({
    ...item,
    title: details[index].title,
    status: getRecruitmentStatus(item, now, cancellations[index] !== null),
  }));
}

/** 내 프로젝트 목록. 최신 등록순이고 모집 건 수와 모집 중인 건 수를 붙인다 */
export async function getMyProjects(path: string): Promise<ProjectSummary[]> {
  const role = await requireRole(path);
  if (isBackendAuth) return (await findBackendProjects()).map((project) => ({ ...project, recruitments: [] }));
  const projects = await findProjects(role);
  const now = new Date();
  return Promise.all(
    [...projects].sort(byCreatedLatest).map(async (project) => {
      const recruitments = await withStatus(role, project.recruitments, now);
      return {
        ...project,
        recruitments,
        recruitmentCount: recruitments.filter((item) => item.status !== "cancelled").length,
        openRecruitmentCount: recruitments.filter((item) => item.status === "recruiting").length,
      };
    }),
  );
}

/** 백엔드 ProjectDashboardResponse */
type ProjectDashboardResponse = {
  todos: Array<{ kind: TodoItem["kind"]; recruitmentId: number; projectName: string; count: number; payoutAt: string | null }>;
  overview: ProjectOverview;
};

function toTodoItem(todo: ProjectDashboardResponse["todos"][number], now: Date): TodoItem {
  const base = recruitmentManagePath(String(todo.recruitmentId));
  if (todo.kind === "applicants") {
    return { kind: todo.kind, projectName: todo.projectName, href: `${base}?tab=testers`, text: `지원자 ${todo.count}명이 확정을 기다려요` };
  }
  const hours = Math.max(0, Math.ceil((new Date(todo.payoutAt ?? now).getTime() - now.getTime()) / (60 * 60 * 1000)));
  return { kind: todo.kind, projectName: todo.projectName, href: `${base}?tab=feedback`, text: `신고 대기 피드백 ${todo.count}건 · ${hours}시간 뒤 자동 지급` };
}

/**
 * 내 프로젝트 화면 전체: 할 일, 전체 현황, 프로젝트 카드.
 * 할 일은 지원자 확정 대기(구독·모집 마감 전)가 먼저, 신고 대기 피드백은 자동 지급이 가까운 순서다.
 */
export async function getMyDashboard(path: string) {
  const projects = await getMyProjects(path);
  const role = await requireRole(path);
  const now = new Date();
  if (isBackendAuth) {
    const { todos, overview } = await readProjectApi<ProjectDashboardResponse>("/dashboard");
    return { projects, overview, todos: todos.map((todo) => toTodoItem(todo, now)) };
  }

  const applicantTodos: TodoItem[] = [];
  const feedbackTodos: Array<{ item: TodoItem; hours: number }> = [];
  const overview: ProjectOverview = { recruiting: 0, testing: 0, waitingReports: 0 };

  for (const project of projects) {
    for (const recruitment of project.recruitments) {
      const [applications, feedbacks] = await Promise.all([
        findApplications(role, recruitment.slug),
        findFeedbacks(role, recruitment.slug),
      ]);
      const { status } = recruitment;
      if (status === "cancelled") continue;
      const base = recruitmentManagePath(recruitment.slug);
      const pending = applications.filter((item) => item.status === "applied").length;
      const waitingHours = feedbacks.map((item) => getHoursUntilPaid(item, now)).filter((hours) => hours > 0);

      if (status !== "closed") overview[status] += 1;
      overview.waitingReports += waitingHours.length;

      /* 지금 확정할 수 있는 지원자만 할 일로 본다. 무료 모집은 자동 확정이라 뺀다 */
      if (recruitment.isSubscription && status === "recruiting" && pending > 0) {
        applicantTodos.push({
          kind: "applicants",
          projectName: project.name,
          href: `${base}?tab=testers`,
          text: `지원자 ${pending}명이 확정을 기다려요`,
        });
      }
      if (waitingHours.length > 0) {
        const hours = Math.min(...waitingHours);
        feedbackTodos.push({
          item: {
            kind: "feedback",
            projectName: project.name,
            href: `${base}?tab=feedback`,
            text: `신고 대기 피드백 ${waitingHours.length}건 · ${hours}시간 뒤 자동 지급`,
          },
          hours,
        });
      }
    }
  }

  feedbackTodos.sort((a, b) => a.hours - b.hours);
  const todos: TodoItem[] = [...applicantTodos, ...feedbackTodos.map(({ item }) => item)];
  return { projects, todos, overview };
}

/** 백엔드 RecruitmentSummaryResponse */
type RecruitmentSummaryResponse = {
  id: number;
  title: string;
  description: string;
  status: RecruitmentStatus;
  softwareType: SoftwareType | null;
  recruitDeadline: string;
  submitDeadline: string;
  confirmedCount: number;
  createdAt: string;
  selectionMode: SelectionMode;
  cancelReason: string | null;
  cancelledAt: string | null;
  subscription: boolean;
  version: number;
  feedbackCount: number;
  analyzedAt: string | null;
};

function toRecruitmentRow(projectName: string, item: RecruitmentSummaryResponse): ProjectRecruitmentRow {
  return {
    slug: String(item.id),
    projectName,
    summary: "",
    request: item.description,
    softwareTypes: item.softwareType ? [item.softwareType] : [],
    isSubscription: item.subscription,
    createdAt: item.createdAt,
    recruitDeadline: item.recruitDeadline,
    submitDeadline: item.submitDeadline,
    confirmedCount: item.confirmedCount,
    baseReward: BASE_REWARD,
    status: item.status,
    title: item.title,
    version: item.version,
    feedbackCount: item.feedbackCount,
    analyzedAt: item.analyzedAt,
    selectionMode: item.selectionMode,
    cancellation: item.status === "cancelled" && item.cancelledAt ? { reason: item.cancelReason ?? "", cancelledAt: item.cancelledAt } : null,
  };
}

/** 백엔드의 프로젝트 하나와 모집글(최신순). 상태·버전·수는 응답 값을 그대로 쓴다 */
async function findBackendProjectDetail(projectKey: string) {
  const project = await findBackendProject(projectKey);
  const items = await readProjectApi<RecruitmentSummaryResponse[]>(`/${projectKey}/recruitments`);
  const recruitments = items.map((item) => toRecruitmentRow(project.name, item));
  return { project: { ...project, recruitments }, recruitments };
}

/** 내 프로젝트 하나와 모집 건(최신순). 없거나 남의 프로젝트면 404 */
export async function getMyProject(path: string, projectKey: string) {
  const role = await requireRole(path);
  if (isBackendAuth) return findBackendProjectDetail(projectKey);
  const project = (await findProjects(role)).find((item) => item.key === projectKey);
  if (!project) notFound();
  return { project, recruitments: await withStatus(role, [...project.recruitments].sort(byCreatedLatest), new Date()) };
}

/** 프로젝트 상세 화면: 프로젝트와 최신순 모집글. 모집글마다 버전, 피드백 수, AI 분석 시각을 붙인다 */
export async function getProjectDetail(path: string, projectKey: string) {
  if (isBackendAuth) {
    await requireRole(path);
    return findBackendProjectDetail(projectKey);
  }
  const [{ project, recruitments }, role] = await Promise.all([getMyProject(path, projectKey), requireRole(path)]);
  const rows: ProjectRecruitmentRow[] = await Promise.all(
    recruitments.map(async (item) => {
      const [feedbacks, summary] = await Promise.all([findFeedbacks(role, item.slug), findAiSummary(role, item.slug)]);
      return { ...item, version: versionOf(recruitments, item), feedbackCount: feedbacks.length, analyzedAt: summary?.analyzedAt ?? null };
    }),
  );
  return { project, recruitments: rows };
}

/* 목업에는 버전 값이 없어서 프로젝트 안에서 만든 순서로 센다(첫 모집이 v1). 백엔드 모드는 응답의 버전을 쓴다 */
function versionOf(projectRecruitments: Pick<Recruitment, "createdAt">[], recruitment: Pick<Recruitment, "createdAt">) {
  return projectRecruitments.filter((item) => item.createdAt <= recruitment.createdAt).length;
}

/** 공개 모집글에 필요한 값. 없거나 취소된 모집 건이면 null */
export async function getPublicRecruitment(slug: string) {
  const data = await findPublicRecruitment(slug);
  if (!data) return null;
  const now = new Date();
  return { ...data, now, status: getRecruitmentStatus(data.recruitment, now) as Exclude<RecruitmentStatus, "cancelled"> };
}

/** 내 모집의 소유권과 현재 상태. 화면 목록이나 통계는 읽지 않는다 */
async function getMyRecruitment(path: string, recruitmentKey: string): Promise<{
  role: Role;
  project: Project;
  recruitment: Recruitment & { status: RecruitmentStatus; title?: string; selectionMode?: SelectionMode; version?: number };
  cancellation: RecruitmentCancellation | null;
}> {
  const role = await requireRole(path);
  /* 백엔드 응답은 상태·버전을 이미 계산해 준다. 내 프로젝트의 모집 목록에서 id로 찾아 소유권도 함께 확인한다 */
  if (isBackendAuth) {
    for (const { key } of await findBackendProjects()) {
      const { project, recruitments } = await findBackendProjectDetail(key);
      const recruitment = recruitments.find((item) => item.slug === recruitmentKey);
      if (recruitment) return { role, project, recruitment, cancellation: recruitment.cancellation ?? null };
    }
    notFound();
  }
  const owned = await findOwnedRecruitment(role, recruitmentKey);
  if (!owned) notFound();
  const cancellation = await findCancellation(role, recruitmentKey);
  return {
    role,
    project: owned.project,
    recruitment: { ...owned.recruitment, status: getRecruitmentStatus(owned.recruitment, new Date(), cancellation !== null) },
    cancellation,
  };
}

/** 모집 관리 화면에 필요한 값 전부. 없는 모집 건이면 404 */
export async function getRecruitmentDetail(path: string, recruitmentKey: string) {
  const { role, project, recruitment: currentRecruitment, cancellation } = await getMyRecruitment(path, recruitmentKey);
  const [applications, feedbacks, found] = await Promise.all([
    findApplications(role, recruitmentKey),
    findFeedbacks(role, recruitmentKey),
    findRecruitmentDetail(role, recruitmentKey),
  ]);
  /* 조회할 수 없는 상세는 목록에서 알고 있는 제목과 선정 방식만 채운다. 나머지는 unavailable로 알린다 */
  const detail = found.unavailable
    ? { ...found, title: currentRecruitment.title ?? "", selectionMode: currentRecruitment.selectionMode ?? found.selectionMode }
    : found;
  const recruitment = { ...currentRecruitment, title: detail.title || currentRecruitment.title || "", version: currentRecruitment.version ?? versionOf(project.recruitments, currentRecruitment) };
  const now = new Date();
  return {
    project,
    recruitment,
    detail,
    cancellation,
    canCancel: canCancelRecruitment(recruitment),
    applications: [...applications]
      .sort((a, b) => a.appliedAt.localeCompare(b.appliedAt))
      .map((item) => ({ ...item, submission: getSubmissionStatus(item, feedbacks, recruitment, now) })),
    feedbacks: [...feedbacks]
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
      .map((item) => ({ ...item, hoursUntilPaid: getHoursUntilPaid(item, now) })),
    analytics: getAnalytics(applications, feedbacks),
    locks: getEditLocks(recruitment, applications.length, feedbacks),
  };
}


const NOT_EDITABLE: EditState = { values: {}, errors: { form: "종료되거나 취소된 모집은 바꿀 수 없어요" } };

/**
 * 모집 정보 탭의 영역 하나를 저장한다. 잠금은 화면에서 막아도 요청이 조작될 수 있어서 여기서 다시 본다.
 * 검증을 통과하면 백엔드에 저장한다. 백엔드도 같은 잠금을 다시 확인한다
 */
export async function updateRecruitment(recruitmentKey: string, section: RecruitmentEditSection, formData: FormData): Promise<EditState> {
  const path = recruitmentManagePath(recruitmentKey);
  const { role, project, recruitment } = await getMyRecruitment(path, recruitmentKey);
  /* 저장소는 프로젝트 정보라 모집이 끝나도 연결할 수 있다. 목업은 검증만 하고 저장하지 않는다 */
  if (section === "repository") {
    const checked = withOk(validateRepositoryConnect(formData, isBackendAuth));
    return checked.ok && isBackendAuth ? connectRepository(project.key, checked, text(formData, "token")) : checked;
  }
  const [applications, feedbacks, detail] = await Promise.all([
    findApplications(role, recruitmentKey),
    findFeedbacks(role, recruitmentKey),
    findRecruitmentDetail(role, recruitmentKey),
  ]);
  const locks = getEditLocks(recruitment, applications.length, feedbacks);
  if (locks.readOnly) return NOT_EDITABLE;
  const state =
    section === "post"
      ? validatePostEdit(formData)
      : section === "terms"
        ? validateTermsEdit(formData, { ...recruitment, selectionMode: detail.selectionMode }, locks)
        : validateTestItemsEdit(formData, locks.lockedItemIds);
  if (Object.keys(state.errors).length > 0) return withOk(state);
  return withOk(await saveEdit(recruitmentKey, section, formData, state));
}

/**
 * 프로젝트에 GitHub 레포를 연결한다. 백엔드가 토큰으로 GitHub에서 레포를 읽어 확인한 뒤 저장한다.
 * 토큰은 화면 상태에 되돌려 주지 않는다(values에는 저장소만 넣는다)
 */
async function connectRepository(projectKey: string, state: EditState, token: string): Promise<EditState> {
  const result = await backendFetch<unknown>(`/api/v1/developer/projects/${encodeURIComponent(projectKey)}/repository`, {
    method: "PUT",
    body: { repository: state.values.repository, token },
    timeoutMs: REPOSITORY_TIMEOUT_MS,
  });
  if (result.ok) return state;
  return { values: state.values, errors: result.fields ? toFormFields(result.fields) : { form: result.message } };
}

/* 백엔드가 GitHub 확인을 최대 15초 기다린다 */
const REPOSITORY_TIMEOUT_MS = 20_000;

/** 프로젝트의 GitHub 레포 연결을 해제한다. 레포와 토큰이 함께 지워진다. 목업은 저장하지 않는다 */
export async function disconnectRepository(recruitmentKey: string): Promise<EditState> {
  const { project } = await getMyRecruitment(recruitmentManagePath(recruitmentKey), recruitmentKey);
  if (isBackendAuth) {
    const result = await backendFetch<unknown>(`/api/v1/developer/projects/${encodeURIComponent(project.key)}/repository`, { method: "DELETE" });
    if (!result.ok) return { values: {}, errors: { form: result.message } };
  }
  return { values: {}, errors: {}, ok: true };
}

const withOk = (state: EditState): EditState => ({ ...state, ok: Object.keys(state.errors).length === 0 });

/**
 * 검증을 마친 영역을 백엔드에 저장한다. 글 정보·모집 정보는 PATCH, 테스트 항목은 전체를 PUT으로 보낸다.
 * shortcut: 목업에서는 저장하지 않는다(새로고침하면 처음 값). 모집 관리 화면이 백엔드에서 읽게 되면 목업 분기를 지운다
 */
async function saveEdit(recruitmentKey: string, section: RecruitmentEditSection, formData: FormData, state: EditState): Promise<EditState> {
  if (!isBackendAuth) return state;
  const path = `/api/v1/developer/recruitments/${encodeURIComponent(recruitmentKey)}`;
  const { values } = state;
  const result =
    section === "testItems"
      ? await backendFetch<null>(`${path}/test-items`, { method: "PUT", body: { testItems: testItemRows(formData) } })
      : await backendFetch<null>(path, {
          method: "PATCH",
          body:
            section === "post"
              ? { title: values.title, description: values.request, ...(values.accessUrl ? { accessUrl: values.accessUrl } : {}), softwareTypes: formData.getAll("categories").map(String) }
              : { conditions: values.conditions, selectionMode: values.selectionMode, recruitDeadline: values.recruitDeadline, submitDeadline: values.submitDeadline },
        });
  if (result.ok) return state;
  return { values, errors: result.fields ? toFormFields(result.fields) : { form: result.message } };
}

/* 테스트 항목 줄. 필수는 체크한 줄의 번호로 온다 */
function testItemRows(formData: FormData) {
  const titles = formData.getAll("testItemTitle").map((item) => String(item).trim());
  const descriptions = formData.getAll("testItemDescription").map((item) => String(item).trim());
  const required = new Set(formData.getAll("testItemRequired").map(String));
  return formData.getAll("testItemId").map((id, index) => ({
    id: id ? Number(id) : null,
    title: titles[index] ?? "",
    description: descriptions[index] ?? "",
    required: required.has(String(index)),
  }));
}

/* 백엔드 칸 이름(요청 필드)을 화면 칸 이름으로 바꾼다. testItems[0].title → testItemTitle-0 */
function toFormFields(fields: Record<string, string>) {
  const names: Record<string, string> = { description: "request", softwareTypes: "categories" };
  return Object.fromEntries(
    Object.entries(fields).map(([key, message]) => {
      const row = /^testItems\[(\d+)]\.(title|description)$/.exec(key);
      if (row) return [`testItem${row[2] === "title" ? "Title" : "Description"}-${row[1]}`, message];
      const base = key.replace(/\[\d+]$/, "");
      return [names[base] ?? base, message];
    }),
  );
}

/** 모집 취소. 취소할 수 있는 상태인지 서버에서 다시 보고, 테스트 중이면 사유를 받는다 */
export async function cancelRecruitment(
  recruitmentKey: string,
  formData: FormData,
): Promise<FormState & { ok?: boolean }> {
  const path = recruitmentManagePath(recruitmentKey);
  const { recruitment } = await getMyRecruitment(path, recruitmentKey);
  const canCancel = canCancelRecruitment(recruitment);
  const testing = recruitment.status === "testing";
  const values = { reason: text(formData, "reason") };
  const errors: Record<string, string> = {};
  if (!canCancel) errors.reason = "지금은 모집을 취소할 수 없어요";
  /* 테스트 전에 연 대화상자에는 사유 칸이 없다. 그사이 테스트가 시작됐으면 다시 열어 사유를 적게 한다 */
  else if (testing && !formData.has("reason")) errors.reason = "모집 상태가 바뀌었어요. 새로고침한 뒤 다시 시도해 주세요";
  else if (testing && !values.reason) errors.reason = "취소 사유를 적어 주세요";
  else if (values.reason.length > RECRUITMENT_LIMIT.cancelReasonLength) {
    errors.reason = `취소 사유는 ${RECRUITMENT_LIMIT.cancelReasonLength}자까지 적을 수 있어요`;
  }
  if (Object.keys(errors).length > 0) return { values, errors };
  if (isBackendAuth) {
    const reason = testing ? values.reason : undefined;
    const result = await backendFetch<unknown>(`/api/v1/developer/recruitments/${encodeURIComponent(recruitmentKey)}/cancel`, {
      method: "POST",
      body: reason ? { reason } : {},
    });
    return result.ok ? { values: {}, errors: {}, ok: true } : { values, errors: { reason: result.message } };
  }
  const ok = await saveRecruitmentCancellation(recruitmentKey, testing ? values.reason : "");
  return ok ? { values: {}, errors: {}, ok } : { values, errors: { reason: "취소를 저장하지 못했어요. 다시 시도해 주세요" } };
}

/**
 * 지원자 여러 명을 확정 또는 거절한다. 화면에서 막아도 요청은 조작될 수 있어서 여기서 다시 확인한다.
 * 이 모집 건의 대기 지원만 바꿀 수 있다.
 */
export async function decideApplicants(
  recruitmentKey: string,
  ids: string[],
  status: "confirmed" | "rejected",
): Promise<{ ok: boolean }> {
  const path = recruitmentManagePath(recruitmentKey);
  const { role, recruitment } = await getMyRecruitment(path, recruitmentKey);
  const [applications, detail] = await Promise.all([
    findApplications(role, recruitmentKey),
    findRecruitmentDetail(role, recruitmentKey),
  ]);
  const pendingIds = new Set(applications.filter((item) => item.status === "applied").map((item) => item.id));
  const unique = [...new Set(ids)];
  if (!canSelectApplicants(recruitment, detail.selectionMode) || unique.length === 0 || !unique.every((id) => pendingIds.has(id))) return { ok: false };
  return { ok: await saveApplicationDecisions(unique, status) };
}

/** AI 분석 결과. 신고된 피드백을 뺀 피드백이 최소 수보다 적으면 분석하지 않는다 */
export async function getAiAnalysis(path: string, recruitmentKey: string): Promise<AiAnalysis> {
  if (isBackendAuth) return getBackendAiAnalysis(path, recruitmentKey);
  const { role } = await getMyRecruitment(path, recruitmentKey);
  const feedbacks = await findFeedbacks(role, recruitmentKey);
  const feedbackCount = feedbacks.filter((item) => item.status !== "reported").length;
  if (feedbackCount < AI_MIN_FEEDBACKS) {
    return { state: "notEnough", feedbackCount, minFeedbacks: AI_MIN_FEEDBACKS };
  }
  const [summary, detail] = await Promise.all([findAiSummary(role, recruitmentKey), findRecruitmentDetail(role, recruitmentKey)]);
  if (!summary) return { state: "empty", status: "NONE" };
  /* 신고된 리뷰는 분석에 넣지 않으니 수에서도 뺀다 */
  const counted = feedbacks.filter((item) => item.status !== "reported").map((item) => item.submittedAt);
  const groups = summary.groups.map((group) => toGroupView(group, feedbacks, detail.testItems));
  /* shortcut: 백엔드는 "어느 그룹에도 들지 않은 리뷰 수"(unanalyzedFeedbackCount)를 주는데, 목업은 마지막 분석 뒤에 낸 리뷰로 센다. 분석 조회 API를 붙이면 그 값을 쓴다 */
  const unanalyzedCount = counted.filter((submittedAt) => submittedAt > summary.analyzedAt).length;
  /* 칭찬 리뷰는 대표 없이 최근 제출 순(백엔드 GET .../analysis/praises와 같다) */
  const praiseReviews = toGroupReviews(summary.praiseFeedbackIds, null, feedbacks, detail.testItems);
  return {
    state: "ready",
    status: "DONE",
    summary: { ...summary, groups, praiseReviews, totalCount: feedbackCount, unanalyzedCount, ...buildTrends(counted, new Date()) },
  };
}

/** 모집 건 하나의 분석 시각과 리뷰를 붙인 그룹. 분석 전이면 null */
async function findAnalyzedGroups(role: Role, recruitmentKey: string) {
  const [summary, feedbacks, detail] = await Promise.all([
    findAiSummary(role, recruitmentKey),
    findFeedbacks(role, recruitmentKey),
    findRecruitmentDetail(role, recruitmentKey),
  ]);
  if (!summary) return null;
  return {
    title: detail.title,
    analyzedAt: summary.analyzedAt,
    groups: summary.groups.map((group) => toGroupView(group, feedbacks, detail.testItems)),
    /* shortcut: getAiAnalysis와 같이 마지막 분석 뒤에 낸 리뷰로 센다. 분석 조회 API를 붙이면 unanalyzedFeedbackCount를 쓴다 */
    unanalyzedCount: feedbacks.filter((item) => item.status !== "reported" && item.submittedAt > summary.analyzedAt).length,
  };
}

/**
 * 버전 별 분석. 직전 버전은 같은 프로젝트에서 버전이 바로 앞인 모집글이고(취소한 모집도 버전을 차지한다), 두 버전 모두 분석을 마쳐야 비교할 수 있다.
 * 백엔드 GET .../version-comparison과 같은 규칙으로, 저장된 요약에 두 버전 그룹을 분류 코드로 이어 붙인다.
 * AUTH_MODE=backend면 비교 조회, 두 버전의 분석 조회, 그룹 리뷰 목록을 부르고, 아니면 목업으로 만든다
 */
export async function getVersionComparison(path: string, recruitmentKey: string): Promise<VersionComparison> {
  if (isBackendAuth) return getBackendVersionComparison(path, recruitmentKey);
  const { role, project, recruitment } = await getMyRecruitment(path, recruitmentKey);
  const currentVersion = versionOf(project.recruitments, recruitment);
  const previousVersion = currentVersion - 1;
  const previous = project.recruitments.find((item) => versionOf(project.recruitments, item) === previousVersion);
  if (!previous) return { state: "noPrevious", currentVersion };
  const [before, after, sample] = await Promise.all([
    findAnalyzedGroups(role, previous.slug),
    findAnalyzedGroups(role, recruitmentKey),
    load(role).then((seed) => seed.versionComparisons[recruitmentKey] ?? null),
  ]);
  if (!before || !after) return { state: "notAnalyzed", previousVersion, currentVersion };
  if (!sample) return { state: "notCompared", previousVersion, currentVersion };
  return {
    state: "ready",
    ...sample,
    previousKey: previous.slug,
    previousVersion,
    currentVersion,
    previousTitle: before.title,
    currentTitle: after.title,
    /* 비교한 뒤 어느 버전을 다시 분석했으면 오래된 비교다(백엔드 정한 것 8) */
    stale: sample.comparedAt < before.analyzedAt || sample.comparedAt < after.analyzedAt,
    unreflectedCount: before.unanalyzedCount + after.unanalyzedCount,
    groups: compareVersions(before.groups, after.groups),
  };
}

const DEVELOPER_RECRUITMENTS = "/api/v1/developer/recruitments";

/** 백엔드 VersionComparisonResponse 중 화면이 쓰는 값. 그룹은 두 버전의 분석 조회에서 코드로 다시 잇는다 */
type BackendVersionComparison = {
  currentVersion: number;
  currentTitle: string;
  previousRecruitmentId: number;
  previousVersion: number;
  previousTitle: string;
  summary: string;
  comparedAt: string;
  stale: boolean;
};

/** 백엔드 ReviewAnalysisResponse 중 화면이 쓰는 값 */
type BackendAnalysis = {
  version: number;
  analysisStatus: AnalysisStatus;
  analyzedAt: string | null;
  analyticsSummary: string | null;
  praiseSummary: string | null;
  unanalyzedFeedbackCount: number;
  groups: BackendAnalysisGroup[];
};

/** 백엔드 FeedbackResponse 중 화면이 쓰는 값. status는 submitted, reported, rewarded, excluded */
type BackendFeedback = { status: string; submittedAt: string };

/** 백엔드 PraiseReviewResponse (GET .../analysis/praises) */
type BackendPraise = Omit<BackendGroupReview, "representative">;

/** 백엔드 오류를 화면 오류로 바꾼다. 없거나 남의 모집글은 404, 나머지는 오류 화면에 문구를 보인다 */
function unwrap<T>(result: BackendResult<T>): T {
  if (result.ok) return result.data;
  if (result.status === 404) notFound();
  throw new Error(result.message);
}

const backendGet = <T,>(path: string) => backendFetch<T>(`${DEVELOPER_RECRUITMENTS}/${path}`).then(unwrap);

/** 분석 그룹에 그룹마다의 리뷰를 붙여 화면 그룹으로 바꾼다 */
async function withGroupReviews(recruitmentId: string | number, analysis: BackendAnalysis) {
  /* shortcut: 그룹마다 리뷰 목록을 따로 부른다(그룹 수만큼 요청). 그룹이 많아져 느리면 고른 그룹의 리뷰만 불러온다 */
  const reviews = await Promise.all(
    analysis.groups.map((group) => backendGet<BackendGroupReview[]>(`${recruitmentId}/analysis/groups/${group.groupId}/reviews`)),
  );
  const byGroup = Object.fromEntries(analysis.groups.map((group, index) => [group.groupId, reviews[index]]));
  return fromBackendGroups(analysis.groups, byGroup);
}

/** 모집글 한 버전의 분석 그룹과 그룹마다의 리뷰 */
async function findBackendGroups(recruitmentId: string | number) {
  const analysis = await backendGet<BackendAnalysis>(`${recruitmentId}/analysis`);
  return { analysis, groups: await withGroupReviews(recruitmentId, analysis) };
}

/**
 * 리뷰 분석 탭(백엔드). 리뷰 수와 시간대별 수는 피드백 목록의 제출·지급 리뷰로 세고(백엔드 분석과 같은 기준),
 * 그룹·요약·칭찬·미반영 수는 분석 조회에서 온다. 분석한 적이 없으면 "empty", 분석 중이어도 지난 결과가 있으면 그대로 보인다
 */
async function getBackendAiAnalysis(path: string, recruitmentId: string): Promise<AiAnalysis> {
  await requireRole(path);
  const id = encodeURIComponent(recruitmentId);
  const [feedbacks, analysis] = await Promise.all([backendGet<BackendFeedback[]>(`${id}/feedbacks`), backendGet<BackendAnalysis>(`${id}/analysis`)]);
  const counted = feedbacks.filter((item) => item.status === "submitted" || item.status === "rewarded").map((item) => item.submittedAt);
  if (counted.length < AI_MIN_FEEDBACKS) return { state: "notEnough", feedbackCount: counted.length, minFeedbacks: AI_MIN_FEEDBACKS };
  const status = analysis.analysisStatus;
  if (analysis.analyzedAt === null) return { state: "empty", status };

  const [groups, praises] = await Promise.all([withGroupReviews(id, analysis), backendGet<BackendPraise[]>(`${id}/analysis/praises`)]);
  return {
    state: "ready",
    status,
    summary: {
      analyzedAt: analysis.analyzedAt,
      analyticsSummary: analysis.analyticsSummary,
      praiseSummary: analysis.praiseSummary,
      groups,
      praiseReviews: praises.map((praise) => ({
        id: String(praise.feedbackId),
        testerNickname: praise.nickname,
        content: praise.content,
        submittedAt: praise.submittedAt,
        testItemTitle: praise.testItemTitle,
        representative: false,
      })),
      totalCount: counted.length,
      unanalyzedCount: analysis.unanalyzedFeedbackCount,
      ...buildTrends(counted, new Date()),
    },
  };
}

/**
 * 버전 별 분석(백엔드). 비교 조회의 오류로 상태를 가른다: 직전 버전 없음(409 NO_PREVIOUS_VERSION),
 * 분석 전(409 ANALYSIS_NOT_DONE), 비교 전(404 COMPARISON_NOT_FOUND). 소유와 구독은 백엔드가 확인한다
 */
async function getBackendVersionComparison(path: string, recruitmentId: string): Promise<VersionComparison> {
  await requireRole(path);
  const result = await backendFetch<BackendVersionComparison>(`${DEVELOPER_RECRUITMENTS}/${encodeURIComponent(recruitmentId)}/version-comparison`);
  if (!result.ok && ["NO_PREVIOUS_VERSION", "ANALYSIS_NOT_DONE", "COMPARISON_NOT_FOUND"].includes(result.code)) {
    const { version: currentVersion } = await backendGet<BackendAnalysis>(`${encodeURIComponent(recruitmentId)}/analysis`);
    if (result.code === "NO_PREVIOUS_VERSION") return { state: "noPrevious", currentVersion };
    /* 모집글 버전은 프로젝트마다 1, 2, 3으로 이어진다(#177) */
    const previousVersion = currentVersion - 1;
    return { state: result.code === "ANALYSIS_NOT_DONE" ? "notAnalyzed" : "notCompared", previousVersion, currentVersion };
  }
  const comparison = unwrap(result);
  const [before, after] = await Promise.all([
    findBackendGroups(comparison.previousRecruitmentId),
    findBackendGroups(encodeURIComponent(recruitmentId)),
  ]);
  return {
    state: "ready",
    summary: comparison.summary,
    comparedAt: comparison.comparedAt,
    previousKey: String(comparison.previousRecruitmentId),
    previousVersion: comparison.previousVersion,
    currentVersion: comparison.currentVersion,
    previousTitle: comparison.previousTitle,
    currentTitle: comparison.currentTitle,
    stale: comparison.stale,
    unreflectedCount: before.analysis.unanalyzedFeedbackCount + after.analysis.unanalyzedFeedbackCount,
    groups: compareVersions(before.groups, after.groups),
  };
}

/* 백엔드는 AI 분석 서버의 응답을 30초까지 기다린다(연결 5초 별도). 그보다 먼저 끊지 않게 넉넉히 기다린다 */
const COMPARISON_TIMEOUT_MS = 40_000;

/* 이슈 등록은 백엔드가 GitHub 응답을 기다린다 */
const ISSUE_TIMEOUT_MS = 20_000;

/** 결과가 없는 요청의 성공·실패. 실패 문구는 백엔드 ErrorCode 문구를 그대로 쓴다 */
export type ActionResult = { ok: true } | { ok: false; message: string };

const toActionResult = (result: BackendResult<unknown>): ActionResult =>
  result.ok ? { ok: true } : { ok: false, message: result.message };

/** AI 버전 비교를 실행한다. 백엔드가 구독·직전 버전·분석 여부와 일주일 3번 한도를 확인한다. 목업에서는 아무것도 바꾸지 않는다 */
export async function runVersionComparison(recruitmentKey: string): Promise<ActionResult> {
  if (!isBackendAuth) return { ok: true };
  return toActionResult(
    await backendFetch(`${DEVELOPER_RECRUITMENTS}/${encodeURIComponent(recruitmentKey)}/version-comparison`, {
      method: "POST",
      timeoutMs: COMPARISON_TIMEOUT_MS,
    }),
  );
}

/**
 * AI 리뷰 분석을 시작한다. 백엔드는 바로 202로 답하고 분석은 따로 돌아, 화면이 조회로 끝나길 기다린다.
 * 이미 분석 중(409)이면 그 분석을 기다리면 되니 성공으로 본다. 구독·일주일 3번 한도는 백엔드가 확인한다
 */
export async function runReviewAnalysis(recruitmentKey: string): Promise<ActionResult> {
  if (!isBackendAuth) return { ok: true };
  const result = await backendFetch(`${DEVELOPER_RECRUITMENTS}/${encodeURIComponent(recruitmentKey)}/analysis`, { method: "POST" });
  if (!result.ok && result.code === "ANALYSIS_IN_PROGRESS") return { ok: true };
  return toActionResult(result);
}

/** 그룹의 GitHub 이슈 초안을 고친다. 등록했거나 등록 중인 초안은 백엔드가 거절한다(409) */
export async function saveIssueDraft(
  recruitmentKey: string,
  groupId: string,
  draft: { title: string; content: string },
): Promise<ActionResult> {
  if (!isBackendAuth) return { ok: true };
  return toActionResult(
    await backendFetch(`${DEVELOPER_RECRUITMENTS}/${encodeURIComponent(recruitmentKey)}/analysis/groups/${encodeURIComponent(groupId)}`, {
      method: "PATCH",
      body: { gitIssueTitle: draft.title, gitIssueContent: draft.content },
    }),
  );
}

/** 이슈 등록 결과. 목업에서는 issue가 null이고 화면이 시연용 번호를 만든다 */
export type RegisterIssueResult = { ok: true; issue: GithubIssue | null } | { ok: false; message: string };

/** 그룹의 이슈 초안을 연결된 GitHub 레포에 등록한다. 레포가 없으면 백엔드가 409로 거절한다 */
export async function registerGithubIssue(recruitmentKey: string, groupId: string): Promise<RegisterIssueResult> {
  if (!isBackendAuth) return { ok: true, issue: null };
  const result = await backendFetch<BackendAnalysis>(
    `${DEVELOPER_RECRUITMENTS}/${encodeURIComponent(recruitmentKey)}/analysis/groups/${encodeURIComponent(groupId)}/github-issue`,
    { method: "POST", timeoutMs: ISSUE_TIMEOUT_MS },
  );
  if (!result.ok) return { ok: false, message: result.message };
  const group = result.data.groups.find((item) => String(item.groupId) === groupId);
  const issue = group?.gitIssueUrl && group.gitIssueNumber !== null ? { number: group.gitIssueNumber, url: group.gitIssueUrl } : null;
  return { ok: true, issue };
}

/** 고친 짝을 저장한다. 목업에서는 화면에만 남는다 */
export async function saveVersionLinks(
  recruitmentKey: string,
  links: Array<{ groupId: string; previousGroupId: string | null }>,
): Promise<ActionResult> {
  if (!isBackendAuth) return { ok: true };
  const body = { links: links.map((link) => ({ groupId: Number(link.groupId), previousGroupId: link.previousGroupId === null ? null : Number(link.previousGroupId) })) };
  return toActionResult(
    await backendFetch(`${DEVELOPER_RECRUITMENTS}/${encodeURIComponent(recruitmentKey)}/version-comparison/links`, { method: "PUT", body }),
  );
}

const FOLLOWUP_NOT_FOUND = "이 피드백을 찾지 못했어요. 새로고침한 뒤 다시 시도해 주세요";

/**
 * 내 모집 건 피드백 하나로 AI 후속 질문을 받는다.
 * 실패 문구는 백엔드 ErrorCode 문구를 그대로 쓴다(구독 필요, 하루 3번 초과, AI 서버 장애). 없는 피드백만 화면 문구로 바꾼다.
 */
export async function recommendFollowupQuestions(recruitmentKey: string, feedbackId: string): Promise<FollowupResult> {
  const { role } = await getMyRecruitment(recruitmentManagePath(recruitmentKey), recruitmentKey);
  const feedbacks = await findFeedbacks(role, recruitmentKey);
  if (!feedbacks.some((item) => item.id === feedbackId)) return { ok: false, message: FOLLOWUP_NOT_FOUND };
  const result = await requestFollowupQuestions(role, recruitmentKey, feedbackId);
  if (result.ok) return { ok: true, questions: result.data.questions };
  return { ok: false, message: result.code === "NOT_FOUND" ? FOLLOWUP_NOT_FOUND : result.message };
}

/** 모집 작성 폼에 보여 줄 보상. 구독 여부는 작성 시점 기준이다 */
export async function getRecruitmentFormInfo(path: string, projectKey: string) {
  const { project } = await getMyProject(path, projectKey);
  const isSubscription = await findIsSubscribed(await requireRole(path));
  return {
    project,
    isSubscription,
    baseReward: BASE_REWARD,
    /* 실제 지급액은 백엔드 RewardPolicy가 정하고 추가 보상은 0이라, 백엔드 모드에서는 추가 보상을 약속하지 않는다 */
    extraReward: isSubscription && !isBackendAuth ? EXTRA_REWARD : 0,
  };
}

/* 작성 폼의 테스트 항목 줄. 제목과 설명이 둘 다 빈 줄은 없는 것으로 보고, 오류를 화면의 원래 줄에 달도록 줄 번호를 남긴다 */
function createItemRows(formData: FormData) {
  const clean = (name: string) => formData.getAll(name).map((item) => String(item).replace(/\r\n/g, "\n").trim());
  const descriptions = clean("testItemDescription");
  const required = new Set(formData.getAll("testItemRequired").map(String));
  return clean("testItemTitle")
    .map((title, index) => ({ index, title, description: descriptions[index] ?? "", required: required.has(String(index)) }))
    .filter((row) => row.title || row.description);
}

/* shortcut: 파일 저장소가 없어(#191) 고른 이미지는 저장하지 못한다. 조용히 버리지 않고 그 칸에 알린다 */
function pickedImageErrors(formData: FormData) {
  const message = "이미지 업로드는 아직 준비 중이에요. 이미지를 빼고 등록해 주세요";
  const errors: Record<string, string> = {};
  if (parseFileMeta(formData.get("recruitmentImagesMeta"))?.length) errors.recruitmentImages = message;
  formData.getAll("testItemImagesMeta").forEach((meta, index) => {
    if (parseFileMeta(meta)?.length) errors[`testItemImages-${index}`] = message;
  });
  return errors;
}

/**
 * 검증을 마친 모집을 백엔드에 저장한다. 성공하면 null, 실패하면 폼에 보여 줄 상태를 돌려준다.
 * 보낸 항목 순서는 빈 줄을 뺀 순서라, 서버의 항목 오류를 화면의 줄 번호로 되돌린다
 */
export async function saveBackendRecruitment(projectKey: string, state: FormState, formData: FormData): Promise<FormState | null> {
  const { values } = state;
  const imageErrors = pickedImageErrors(formData);
  if (Object.keys(imageErrors).length > 0) return { values, errors: imageErrors };
  const rows = createItemRows(formData);
  const result = await backendFetch<{ id: number }>("/api/v1/developer/recruitments", {
    method: "POST",
    body: {
      projectId: Number(projectKey),
      title: values.title,
      description: values.request,
      softwareType: values.softwareType,
      selectionMode: values.selectionMode,
      accessUrl: values.accessUrl,
      conditions: values.conditions,
      recruitDeadline: values.recruitDeadline,
      submitDeadline: values.submitDeadline,
      testItems: rows.map(({ title, description, required }) => ({ title, description, required })),
    },
  });
  if (result.ok) return null;
  if (!result.fields || Object.keys(result.fields).length === 0) return { values, errors: { form: result.message } };
  const fields = Object.entries(result.fields).map(([key, error]) => [
    key.replace(/^testItems\[(\d+)]/, (_, row) => `testItems[${rows[Number(row)]?.index ?? row}]`),
    error,
  ]);
  return { values, errors: toFormFields(Object.fromEntries(fields)) };
}

/* ---------- 폼 검증 ---------- */

/* 브라우저는 폼을 보낼 때 줄바꿈을 두 글자(\r\n)로 바꾼다. 화면에서 센 글자 수와 맞도록 되돌린다 */
const text = (formData: FormData, name: string) => String(formData.get(name) ?? "").replace(/\r\n/g, "\n").trim();
