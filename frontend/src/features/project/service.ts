import "server-only";
import { notFound, redirect } from "next/navigation";
import { recruitmentManagePath } from "@/lib/project-paths";
import { getSession, type Role } from "@/lib/session";
import type { Recruitment } from "@/features/recruitment/types";
import {
  findAiSummary,
  findApplications,
  findCancellation,
  findFeedbacks,
  findIsSubscribed,
  findOwnedRecruitment,
  findProjects,
  findPublicRecruitment,
  findRecruitmentDetail,
  saveApplicationDecisions,
  saveRecruitmentCancellation,
} from "./api";
import { checkImages, isHttpUrl, parseFileMeta } from "./media";
import {
  AI_MIN_FEEDBACKS,
  BASE_REWARD,
  EXTRA_REWARD,
  PROJECT_MEDIA_LIMIT,
  RECRUITMENT_LIMIT,
  REPORT_WINDOW_HOURS,
  type AiSummary,
  type Application,
  type Feedback,
  type FormState,
  type Project,
  type RecruitmentStatus,
  type SelectionMode,
  type SubmissionStatus,
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

/** 모집 건 상태. 개발자가 취소했으면 취소, 모집 마감 전이면 모집 중, 마감 뒤면 제출 마감일로 나눈다 */
export function getRecruitmentStatus(recruitment: Recruitment, now: Date, cancelled = false): RecruitmentStatus {
  if (cancelled) return "cancelled";
  if (now < new Date(recruitment.recruitDeadline)) return "recruiting";
  return now < new Date(recruitment.submitDeadline) ? "testing" : "closed";
}

/** 신고 대기 중인 피드백이 자동 지급되기까지 남은 시간(시간 단위, 올림). 대기가 아니면 0 */
export function getHoursUntilPaid(feedback: Feedback, now: Date) {
  if (feedback.status !== "waiting") return 0;
  const until = new Date(feedback.submittedAt).getTime() + REPORT_WINDOW_HOURS * HOUR_MS;
  return Math.max(0, Math.ceil((until - now.getTime()) / HOUR_MS));
}

/**
 * 확정된 테스터의 피드백 제출 현황. 테스트가 시작되기 전(모집 중)에는 보여 주지 않으므로 null.
 * 피드백을 냈으면 제출함, 제출 마감이 지났으면 미완료, 아니면 미제출이다.
 */
export function getSubmissionStatus(
  application: Application,
  feedbacks: Feedback[],
  recruitment: RecruitmentView,
  now: Date,
): SubmissionStatus | null {
  if (application.status !== "confirmed") return null;
  if (recruitment.status !== "testing" && recruitment.status !== "closed") return null;
  /* ponytail: 목업은 지원 id가 피드백에 없어 닉네임으로 잇는다. API를 붙이면 지원(Register) id로 잇는다 */
  if (feedbacks.some((item) => item.testerNickname === application.testerNickname)) return "submitted";
  return now >= new Date(recruitment.submitDeadline) ? "incomplete" : "pending";
}

export type RecruitmentAnalytics = {
  applicationCount: number;
  confirmedCount: number;
  feedbackCount: number;
  /** 피드백을 낸 확정 테스터 수 ÷ 확정 수 백분율. 확정이 0이면 0 */
  submitRate: number;
  reportCount: number;
};

/** 분석 탭 숫자 */
export function getAnalytics(applications: Application[], feedbacks: Feedback[]): RecruitmentAnalytics {
  const confirmed = applications.filter((item) => item.status === "confirmed");
  const confirmedCount = confirmed.length;
  /* 피드백은 테스트 항목마다 낼 수 있어 건수가 아니라 낸 사람을 센다. 닉네임으로 잇는 이유는 getSubmissionStatus와 같다 */
  const submitters = new Set(feedbacks.map((item) => item.testerNickname));
  const submittedCount = confirmed.filter((item) => submitters.has(item.testerNickname)).length;
  return {
    applicationCount: applications.length,
    confirmedCount,
    feedbackCount: feedbacks.length,
    submitRate: confirmedCount === 0 ? 0 : Math.round((submittedCount / confirmedCount) * 100),
    reportCount: feedbacks.filter((item) => item.status === "reported").length,
  };
}

/* ---------- 조회 ---------- */

export type RecruitmentView = Recruitment & { status: RecruitmentStatus; title: string };
export type ProjectSummary = Omit<Project, "recruitments"> & {
  recruitments: RecruitmentView[];
  recruitmentCount: number;
  openRecruitmentCount: number;
};

const byLatest = (a: { createdAt: string }, b: { createdAt: string }) => b.createdAt.localeCompare(a.createdAt);

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
  const projects = await findProjects(role);
  const now = new Date();
  return Promise.all(
    [...projects].sort(byLatest).map(async (project) => {
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

/** 내 프로젝트 화면 맨 위 "지금 확인할 일" 한 줄 */
export type TodoItem = {
  kind: "applicants" | "feedback";
  projectName: string;
  /** 이동할 모집 관리 탭 주소 */
  href: string;
  text: string;
};

/** 모든 프로젝트를 합친 숫자. 진행 중인 모집 건을 상태별로 센다(종료·취소는 세지 않는다) */
export type ProjectOverview = Record<Exclude<RecruitmentStatus, "closed" | "cancelled">, number> & { waitingReports: number };

/**
 * 내 프로젝트 화면 전체: 할 일, 전체 현황, 프로젝트 카드.
 * 할 일은 지원자 확정 대기(구독·모집 마감 전)가 먼저, 신고 대기 피드백은 자동 지급이 가까운 순서다.
 */
export async function getMyDashboard(path: string) {
  const projects = await getMyProjects(path);
  const role = await requireRole(path);
  const now = new Date();

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

/** 내 프로젝트 하나와 모집 건(최신순). 없거나 남의 프로젝트면 404 */
export async function getMyProject(path: string, projectKey: string) {
  const role = await requireRole(path);
  const project = (await findProjects(role)).find((item) => item.key === projectKey);
  if (!project) notFound();
  return { project, recruitments: await withStatus(role, [...project.recruitments].sort(byLatest), new Date()) };
}

/** 공개 모집글에 필요한 값. 없거나 취소된 모집 건이면 null */
export async function getPublicRecruitment(slug: string) {
  const data = await findPublicRecruitment(slug);
  if (!data) return null;
  const now = new Date();
  return { ...data, now, status: getRecruitmentStatus(data.recruitment, now) as Exclude<RecruitmentStatus, "cancelled"> };
}

export type PublicRecruitmentView = NonNullable<Awaited<ReturnType<typeof getPublicRecruitment>>>;

export type FeedbackView = Feedback & { hoursUntilPaid: number };

/** 내 모집의 소유권과 현재 상태. 화면 목록이나 통계는 읽지 않는다 */
async function getMyRecruitment(path: string, recruitmentKey: string) {
  const role = await requireRole(path);
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
  const [applications, feedbacks, detail] = await Promise.all([
    findApplications(role, recruitmentKey),
    findFeedbacks(role, recruitmentKey),
    findRecruitmentDetail(role, recruitmentKey),
  ]);
  const recruitment = { ...currentRecruitment, title: detail.title };
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
  };
}

export type ApplicationView = Application & { submission: SubmissionStatus | null };

/**
 * 개발자가 모집을 취소할 수 있는지. 테스트 전(모집 중)에는 확정된 테스터가 없을 때만,
 * 테스트 중에는 사유를 적으면 취소할 수 있다. 종료했거나 이미 취소한 모집은 취소할 수 없다.
 */
export function canCancelRecruitment(recruitment: Pick<RecruitmentView, "status" | "confirmedCount">) {
  if (recruitment.status === "testing") return true;
  return recruitment.status === "recruiting" && recruitment.confirmedCount === 0;
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
  const ok = await saveRecruitmentCancellation(recruitmentKey, testing ? values.reason : "");
  return ok ? { values: {}, errors: {}, ok } : { values, errors: { reason: "취소를 저장하지 못했어요. 다시 시도해 주세요" } };
}

/** 선발형 구독 모집이고 모집 마감 전이면 지원자를 직접 확정·거절할 수 있다 */
export function canSelectApplicants(recruitment: Pick<RecruitmentView, "status" | "isSubscription">, selectionMode: SelectionMode) {
  return recruitment.isSubscription && selectionMode === "selection" && recruitment.status === "recruiting";
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

/** AI 분석 영역의 상태: 결과 있음, 피드백 부족, 아직 정리 전 */
export type AiAnalysis =
  | { state: "ready"; summary: AiSummary }
  | { state: "notEnough"; feedbackCount: number; minFeedbacks: number }
  | { state: "empty" };

/** AI 분석 결과. 신고된 피드백을 뺀 피드백이 최소 수보다 적으면 분석하지 않는다 */
export async function getAiAnalysis(path: string, recruitmentKey: string): Promise<AiAnalysis> {
  const { role } = await getMyRecruitment(path, recruitmentKey);
  const feedbacks = await findFeedbacks(role, recruitmentKey);
  const feedbackCount = feedbacks.filter((item) => item.status !== "reported").length;
  if (feedbackCount < AI_MIN_FEEDBACKS) {
    return { state: "notEnough", feedbackCount, minFeedbacks: AI_MIN_FEEDBACKS };
  }
  const summary = await findAiSummary(role, recruitmentKey);
  return summary ? { state: "ready", summary } : { state: "empty" };
}

/** 모집 작성 폼에 보여 줄 보상. 구독 여부는 작성 시점 기준이다 */
export async function getRecruitmentFormInfo(path: string, projectKey: string) {
  const { project } = await getMyProject(path, projectKey);
  const isSubscription = await findIsSubscribed(await requireRole(path));
  return {
    project,
    isSubscription,
    baseReward: BASE_REWARD,
    extraReward: isSubscription ? EXTRA_REWARD : 0,
  };
}

/* ---------- 폼 검증 ---------- */

/* 브라우저는 폼을 보낼 때 줄바꿈을 두 글자(\r\n)로 바꾼다. 화면에서 센 글자 수와 맞도록 되돌린다 */
const text = (formData: FormData, name: string) => String(formData.get(name) ?? "").replace(/\r\n/g, "\n").trim();

/**
 * 프로젝트 등록·수정 폼 검증. 대표 이미지는 선택이고, 없으면 화면에 기본 이미지가 나온다.
 * 이미지는 화면에서도 거르지만 요청은 조작될 수 있어서 여기서 다시 확인한다.
 */
export function validateProjectForm(formData: FormData): FormState {
  const values = {
    name: text(formData, "name"),
    description: text(formData, "description"),
  };
  const errors: Record<string, string> = {};
  if (!values.name) errors.name = "프로젝트 이름을 적어 주세요";
  else if (values.name.length > 50) errors.name = "이름은 50자까지 적을 수 있어요";
  if (values.description.length > PROJECT_MEDIA_LIMIT.descriptionLength) {
    errors.description = `상세 설명은 ${PROJECT_MEDIA_LIMIT.descriptionLength}자까지 적을 수 있어요`;
  }

  const images = parseFileMeta(formData.get("imagesMeta"));
  const imageError = images ? checkImages(images) : "이미지 정보를 읽지 못했어요";
  if (imageError) errors.images = imageError;
  return { values, errors };
}

/** 오늘 날짜(한국 시간) "2026-10-30" */
function todayInSeoul(now: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(now);
}

/** 모집 작성 폼 검증. 날짜는 "YYYY-MM-DD" 문자열로 비교한다 */
export function validateRecruitmentForm(formData: FormData, isSubscription: boolean, now: Date): FormState {
  const values = {
    title: text(formData, "title"),
    request: text(formData, "request"),
    softwareType: text(formData, "softwareType"),
    selectionMode: text(formData, "selectionMode"),
    accessUrl: text(formData, "accessUrl"),
    conditions: text(formData, "conditions"),
    recruitDeadline: text(formData, "recruitDeadline"),
    submitDeadline: text(formData, "submitDeadline"),
  };
  const errors: Record<string, string> = {};
  if (!values.title) errors.title = "모집글 제목을 적어 주세요";
  else if (values.title.length > RECRUITMENT_LIMIT.titleLength) errors.title = `모집글 제목은 ${RECRUITMENT_LIMIT.titleLength}자까지 적을 수 있어요`;
  if (!values.request) errors.request = "모집 설명을 적어 주세요";
  else if (values.request.length > 200) errors.request = "모집 설명은 200자까지 적을 수 있어요";
  /* 첫 지원 대상이 웹서비스라 유형은 web만 받는다 */
  if (values.softwareType !== "web") errors.softwareType = "지금은 웹서비스만 모집할 수 있어요";
  if (!isHttpUrl(values.accessUrl)) errors.accessUrl = "http:// 또는 https://로 시작하는 주소를 적어 주세요";
  /* 화면에서 막아도 요청은 조작될 수 있어서 여기서 다시 확인한다 */
  if (values.selectionMode !== "firstCome" && values.selectionMode !== "selection") errors.selectionMode = "선정 방식을 골라 주세요";
  else if (values.selectionMode === "selection" && !isSubscription) errors.selectionMode = "선발형은 구독 모집에서만 쓸 수 있어요";
  if (!values.recruitDeadline) errors.recruitDeadline = "모집 마감일을 골라 주세요";
  else if (values.recruitDeadline < todayInSeoul(now)) errors.recruitDeadline = "모집 마감일은 오늘 이후로 골라 주세요";
  if (!values.submitDeadline) errors.submitDeadline = "피드백 제출 마감일을 골라 주세요";
  else if (values.recruitDeadline && values.submitDeadline <= values.recruitDeadline) {
    errors.submitDeadline = "제출 마감일은 모집 마감일보다 뒤여야 해요";
  }
  if (values.conditions.length > RECRUITMENT_LIMIT.conditionsLength) {
    errors.conditions = `모집 조건은 ${RECRUITMENT_LIMIT.conditionsLength}자까지 적을 수 있어요`;
  }

  /* 테스트 항목: 제목과 설명이 둘 다 빈 줄은 없는 것으로 본다 */
  const { min, max, titleLength, descriptionLength, imageCount } = RECRUITMENT_LIMIT.testItems;
  const titles = formData.getAll("testItemTitle").map((item) => String(item).trim());
  const descriptions = formData.getAll("testItemDescription").map((item) => String(item).trim());
  /* 체크를 끈 줄처럼 빠지지 않도록 이미지 정보는 줄마다 하나씩 온다 */
  const images = formData.getAll("testItemImagesMeta").map((item) => parseFileMeta(item));
  const filled = titles.filter((title, index) => title || descriptions[index] || images[index]?.length).length;
  if (filled < min) {
    errors.testItems = `테스트 항목을 ${min}개 이상 적어 주세요`;
    /* 첫 칸에도 오류를 달아 포커스가 그리로 가게 한다 */
    errors["testItemTitle-0"] = "항목 이름을 적어 주세요";
  }
  else if (filled > max) errors.testItems = `테스트 항목은 ${max}개까지 적을 수 있어요`;
  titles.forEach((title, index) => {
    const description = descriptions[index] ?? "";
    const rowImages = images[index];
    if (!title && !description && !rowImages?.length) return;
    const imageError = rowImages === null ? "이미지 정보를 읽지 못했어요" : checkImages(rowImages ?? [], imageCount);
    if (imageError) errors[`testItemImages-${index}`] = imageError;
    if (!title) errors[`testItemTitle-${index}`] = "항목 이름을 적어 주세요";
    else if (title.length > titleLength) errors[`testItemTitle-${index}`] = `항목 이름은 ${titleLength}자까지 적을 수 있어요`;
    if (description.length > descriptionLength) {
      errors[`testItemDescription-${index}`] = `항목 설명은 ${descriptionLength}자까지 적을 수 있어요`;
    }
  });
  return { values, errors };
}
