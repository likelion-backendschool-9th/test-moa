import "server-only";
import { connection } from "next/server";
import { cache } from "react";
import { getDemoDataMode } from "@/lib/demo";
import type { Role } from "@/lib/session";
import { buildGeneralRecruitments, buildPastRecruitments, buildPromotedRecruitments } from "@/features/recruitment/mock";
import type { Recruitment } from "@/features/recruitment/types";
import { readCancellations, readDecisions, saveCancellation, saveDecisions, type Decision } from "./demo-decisions";
import { buildDeveloperProjects, type ProjectSeedData } from "./mock";
import type { AiSummary, Application, Feedback, Project, RecruitmentCancellation, RecruitmentDetail } from "./types";

/*
 * 데이터 계층. 프로젝트·지원·피드백 데이터를 가져온다. 지금은 목업을 돌려준다.
 * 실제 API를 붙일 때는 이 파일의 함수 본문만 바꾸고 시그니처는 유지한다.
 * 이 파일은 service.ts만 불러온다.
 */

const SLOW_DELAY_MS = 1500;
const EMPTY: ProjectSeedData = { projects: [], applications: {}, feedbacks: {}, aiSummaries: {}, details: {}, cancellations: {} };

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

export type PublicRecruitmentData = {
  recruitment: Recruitment;
  /** 모집글 제목, 모집 조건, 테스트 항목. 샘플이 없는 모집 건은 null */
  detail: RecruitmentDetail | null;
  /** 이 모집 건의 프로젝트. 샘플이 없는 모집 건은 null */
  project: Pick<Project, "description" | "image"> | null;
};

/**
 * 누구나 볼 수 있는 모집글 하나. 역할과 상관없이 읽는다. 없거나 취소된 모집 건은 null.
 * 시연용 상세 샘플은 개발자 데모 계정의 모집 건에만 있다.
 */
export async function findPublicRecruitment(slug: string): Promise<PublicRecruitmentData | null> {
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

/** 모집 건의 모집 조건과 테스트 항목 */
export async function findRecruitmentDetail(role: Role, recruitmentKey: string): Promise<RecruitmentDetail> {
  return (await load(role)).details[recruitmentKey] ?? { title: "", selectionMode: "firstCome", accessUrl: "", conditions: "", testItems: [] };
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
  return role === "developer";
}
