import "server-only";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { isFull, type Recruitment } from "@/features/recruitment/types";
import { findAiSummary, findApplications, findFeedbacks, findIsSubscribed, findProjects } from "./api";
import {
  AI_MIN_FEEDBACKS,
  BASE_REWARD,
  EXTRA_REWARD,
  MAX_CAPACITY,
  REPORT_WINDOW_HOURS,
  type AiSummary,
  type Application,
  type Feedback,
  type FormState,
  type Project,
  type RecruitmentStatus,
} from "./types";

/*
 * 로직 계층. 화면에 필요한 값을 계산하고 폼을 검증한다.
 * 데이터는 api.ts에서만 가져오고, 화면(page.tsx, actions.ts)은 이 파일만 부른다.
 */

const HOUR_MS = 60 * 60 * 1000;

/* ---------- 접근 ---------- */

/** 로그인한 회원의 역할. 비로그인이면 로그인 페이지로 보내고 돌아올 경로를 남긴다 */
export async function requireRole(path: string) {
  const session = await getSession();
  if (session.role === "guest") redirect(`/login?next=${encodeURIComponent(path)}`);
  return session.role;
}

/* ---------- 계산 ---------- */

/** 모집 건 상태. 모집 마감 전이면 정원으로, 마감 뒤면 제출 마감일로 나눈다 */
export function getRecruitmentStatus(recruitment: Recruitment, now: Date): RecruitmentStatus {
  if (now < new Date(recruitment.recruitDeadline)) return isFull(recruitment) ? "full" : "recruiting";
  return now < new Date(recruitment.submitDeadline) ? "testing" : "closed";
}

/** 신고 대기 중인 피드백이 자동 지급되기까지 남은 시간(시간 단위, 올림). 대기가 아니면 0 */
export function getHoursUntilPaid(feedback: Feedback, now: Date) {
  if (feedback.status !== "waiting") return 0;
  const until = new Date(feedback.submittedAt).getTime() + REPORT_WINDOW_HOURS * HOUR_MS;
  return Math.max(0, Math.ceil((until - now.getTime()) / HOUR_MS));
}

export type RecruitmentAnalytics = {
  applicationCount: number;
  confirmedCount: number;
  feedbackCount: number;
  /** 제출 수 ÷ 확정 수 백분율. 확정이 0이면 0 */
  submitRate: number;
  reportCount: number;
};

/** 분석 탭 숫자 */
export function getAnalytics(applications: Application[], feedbacks: Feedback[]): RecruitmentAnalytics {
  const confirmedCount = applications.filter((item) => item.status === "confirmed").length;
  return {
    applicationCount: applications.length,
    confirmedCount,
    feedbackCount: feedbacks.length,
    submitRate: confirmedCount === 0 ? 0 : Math.round((feedbacks.length / confirmedCount) * 100),
    reportCount: feedbacks.filter((item) => item.status === "reported").length,
  };
}

/* ---------- 조회 ---------- */

export type RecruitmentView = Recruitment & { status: RecruitmentStatus };
export type ProjectSummary = Project & { recruitmentCount: number; openRecruitmentCount: number };

const byLatest = (a: { createdAt: string }, b: { createdAt: string }) => b.createdAt.localeCompare(a.createdAt);

function toView(recruitment: Recruitment, now: Date): RecruitmentView {
  return { ...recruitment, status: getRecruitmentStatus(recruitment, now) };
}

/** 내 프로젝트 목록. 최신 등록순이고 모집 건 수와 모집 중인 건 수를 붙인다 */
export async function getMyProjects(path: string): Promise<ProjectSummary[]> {
  const role = await requireRole(path);
  const projects = await findProjects(role);
  const now = new Date();
  return [...projects].sort(byLatest).map((project) => ({
    ...project,
    recruitmentCount: project.recruitments.length,
    openRecruitmentCount: project.recruitments.filter((item) => getRecruitmentStatus(item, now) === "recruiting").length,
  }));
}

/** 내 프로젝트 화면 맨 위 "지금 확인할 일" 한 줄 */
export type TodoItem = {
  kind: "applicants" | "feedback";
  projectName: string;
  /** 이동할 모집 관리 탭 주소 */
  href: string;
  text: string;
};

/** 모든 프로젝트를 합친 숫자 */
export type ProjectOverview = {
  openRecruitments: number;
  confirmedTesters: number;
  feedbacks: number;
  waitingReports: number;
};

/**
 * 내 프로젝트 화면 전체: 할 일, 전체 현황, 프로젝트 카드.
 * 할 일은 지원자 확정 대기(구독·모집 마감 전·정원 남음)가 먼저, 신고 대기 피드백은 자동 지급이 가까운 순서다.
 */
export async function getMyDashboard(path: string) {
  const projects = await getMyProjects(path);
  const role = await requireRole(path);
  const now = new Date();

  const applicantTodos: TodoItem[] = [];
  const feedbackTodos: Array<{ item: TodoItem; hours: number }> = [];
  const overview: ProjectOverview = { openRecruitments: 0, confirmedTesters: 0, feedbacks: 0, waitingReports: 0 };

  for (const project of projects) {
    for (const recruitment of project.recruitments) {
      const [applications, feedbacks] = await Promise.all([
        findApplications(role, recruitment.slug),
        findFeedbacks(role, recruitment.slug),
      ]);
      const status = getRecruitmentStatus(recruitment, now);
      const base = `/my/projects/${project.key}/recruitments/${recruitment.slug}`;
      const confirmed = applications.filter((item) => item.status === "confirmed").length;
      const pending = applications.filter((item) => item.status === "applied").length;
      const waitingHours = feedbacks.map((item) => getHoursUntilPaid(item, now)).filter((hours) => hours > 0);

      if (status === "recruiting") overview.openRecruitments += 1;
      overview.confirmedTesters += confirmed;
      overview.feedbacks += feedbacks.length;
      overview.waitingReports += waitingHours.length;

      /* 지금 확정할 수 있는 지원자만 할 일로 본다. 무료 모집은 자동 확정이라 뺀다 */
      if (recruitment.isSubscription && status === "recruiting" && pending > 0) {
        applicantTodos.push({
          kind: "applicants",
          projectName: project.name,
          href: `${base}?tab=testers`,
          text: `지원자 ${pending}명이 확정을 기다려요 · 남은 자리 ${recruitment.capacity - confirmed}명`,
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

/** 내 프로젝트 하나와 모집 건(최신순). 없거나 남의 프로젝트면 404 */
export async function getMyProject(path: string, projectKey: string) {
  const role = await requireRole(path);
  const project = (await findProjects(role)).find((item) => item.key === projectKey);
  if (!project) notFound();
  const now = new Date();
  return { project, recruitments: [...project.recruitments].sort(byLatest).map((item) => toView(item, now)) };
}

export type FeedbackView = Feedback & { hoursUntilPaid: number };

/** 모집 관리 화면에 필요한 값 전부. 없는 모집 건이면 404 */
export async function getRecruitmentDetail(path: string, projectKey: string, recruitmentKey: string) {
  const { project, recruitments } = await getMyProject(path, projectKey);
  const recruitment = recruitments.find((item) => item.slug === recruitmentKey);
  if (!recruitment) notFound();
  const role = await requireRole(path);
  const [applications, feedbacks] = await Promise.all([
    findApplications(role, recruitmentKey),
    findFeedbacks(role, recruitmentKey),
  ]);
  const now = new Date();
  return {
    project,
    recruitment,
    applications: [...applications].sort((a, b) => a.appliedAt.localeCompare(b.appliedAt)),
    feedbacks: [...feedbacks]
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
      .map((item) => ({ ...item, hoursUntilPaid: getHoursUntilPaid(item, now) })),
    analytics: getAnalytics(applications, feedbacks),
  };
}

/** AI 분석 영역의 상태: 결과 있음, 피드백 부족, 아직 정리 전 */
export type AiAnalysis =
  | { state: "ready"; summary: AiSummary }
  | { state: "notEnough"; feedbackCount: number; minFeedbacks: number }
  | { state: "empty" };

/** AI 분석 결과. 피드백이 최소 수보다 적으면 분석하지 않는다 */
export async function getAiAnalysis(path: string, projectKey: string, recruitmentKey: string): Promise<AiAnalysis> {
  const { feedbacks } = await getRecruitmentDetail(path, projectKey, recruitmentKey);
  if (feedbacks.length < AI_MIN_FEEDBACKS) {
    return { state: "notEnough", feedbackCount: feedbacks.length, minFeedbacks: AI_MIN_FEEDBACKS };
  }
  const summary = await findAiSummary(await requireRole(path), recruitmentKey);
  return summary ? { state: "ready", summary } : { state: "empty" };
}

/** 모집 작성 폼에 보여 줄 보상과 인원 한도. 구독 여부는 작성 시점 기준이다 */
export async function getRecruitmentFormInfo(path: string, projectKey: string) {
  const { project } = await getMyProject(path, projectKey);
  const isSubscription = await findIsSubscribed(await requireRole(path));
  return {
    project,
    isSubscription,
    baseReward: BASE_REWARD,
    extraReward: isSubscription ? EXTRA_REWARD : 0,
    maxCapacity: isSubscription ? MAX_CAPACITY.subscription : MAX_CAPACITY.free,
  };
}

/* ---------- 폼 검증 ---------- */

const text = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

function isHttpUrl(value: string) {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

/** 프로젝트 등록·수정 폼 검증. 첫 지원 대상이 웹서비스라 유형은 web만 받는다 */
export function validateProjectForm(formData: FormData): FormState {
  const values = {
    name: text(formData, "name"),
    summary: text(formData, "summary"),
    softwareType: text(formData, "softwareType"),
    accessUrl: text(formData, "accessUrl"),
  };
  const errors: Record<string, string> = {};
  if (!values.name) errors.name = "프로젝트 이름을 적어 주세요";
  else if (values.name.length > 50) errors.name = "이름은 50자까지 적을 수 있어요";
  if (!values.summary) errors.summary = "한 줄 소개를 적어 주세요";
  else if (values.summary.length > 100) errors.summary = "한 줄 소개는 100자까지 적을 수 있어요";
  if (values.softwareType !== "web") errors.softwareType = "지금은 웹서비스만 등록할 수 있어요";
  if (!isHttpUrl(values.accessUrl)) errors.accessUrl = "http:// 또는 https://로 시작하는 주소를 적어 주세요";
  return { values, errors };
}

/** 오늘 날짜(한국 시간) "2026-10-30" */
function todayInSeoul(now: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(now);
}

/** 모집 작성 폼 검증. 날짜는 "YYYY-MM-DD" 문자열로 비교한다 */
export function validateRecruitmentForm(formData: FormData, maxCapacity: number, now: Date): FormState {
  const values = {
    request: text(formData, "request"),
    recruitDeadline: text(formData, "recruitDeadline"),
    submitDeadline: text(formData, "submitDeadline"),
    capacity: text(formData, "capacity"),
  };
  const errors: Record<string, string> = {};
  if (!values.request) errors.request = "요청 내용을 적어 주세요";
  else if (values.request.length > 200) errors.request = "요청 내용은 200자까지 적을 수 있어요";
  if (!values.recruitDeadline) errors.recruitDeadline = "모집 마감일을 골라 주세요";
  else if (values.recruitDeadline < todayInSeoul(now)) errors.recruitDeadline = "모집 마감일은 오늘 이후로 골라 주세요";
  if (!values.submitDeadline) errors.submitDeadline = "피드백 제출 마감일을 골라 주세요";
  else if (values.recruitDeadline && values.submitDeadline <= values.recruitDeadline) {
    errors.submitDeadline = "제출 마감일은 모집 마감일보다 뒤여야 해요";
  }
  const capacity = Number(values.capacity);
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > maxCapacity) {
    errors.capacity = `1~${maxCapacity}명까지 모집할 수 있어요`;
  }
  return { values, errors };
}
