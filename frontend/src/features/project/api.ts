import "server-only";
import { connection } from "next/server";
import { cache } from "react";
import { getDemoDataMode } from "@/lib/demo";
import type { Role } from "@/lib/session";
import { buildGeneralRecruitments, buildPromotedRecruitments } from "@/features/recruitment/mock";
import { readCancelRequests, readDecisions, saveCancelRequest, saveDecisions, type Decision } from "./demo-decisions";
import { buildDeveloperProjects, type ProjectSeedData } from "./mock";
import type { AiSummary, Application, CancelRequest, Feedback, Project, RecruitmentDetail } from "./types";

/*
 * 데이터 계층. 프로젝트·지원·피드백 데이터를 가져온다. 지금은 목업을 돌려준다.
 * 실제 API를 붙일 때는 이 파일의 함수 본문만 바꾸고 시그니처는 유지한다.
 * 이 파일은 service.ts만 불러온다.
 */

const SLOW_DELAY_MS = 1500;
const EMPTY: ProjectSeedData = { projects: [], applications: {}, feedbacks: {}, aiSummaries: {}, details: {}, cancelRequests: {} };

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
  return applyDecisions(seed, await readDecisions());
});

/** 시연 중 확정·거절한 결과를 덮어쓰고, 모집 건의 확정 인원을 지원 목록에서 다시 센다 */
function applyDecisions(seed: ProjectSeedData, decisions: Record<string, Decision>): ProjectSeedData {
  const applications = Object.fromEntries(
    Object.entries(seed.applications).map(([key, list]) => [
      key,
      list.map((item) => (item.status === "applied" && decisions[item.id] ? { ...item, status: decisions[item.id] } : item)),
    ]),
  );
  const projects = seed.projects.map((project) => ({
    ...project,
    recruitments: project.recruitments.map((recruitment) => {
      const list = applications[recruitment.slug];
      return list ? { ...recruitment, confirmedCount: list.filter((item) => item.status === "confirmed").length } : recruitment;
    }),
  }));
  return { ...seed, applications, projects };
}

/** 지원자 확정·거절을 저장한다. 서버 액션에서만 부른다. 저장하지 못하면 false */
export async function saveApplicationDecisions(ids: string[], status: Decision): Promise<boolean> {
  return saveDecisions(ids, status);
}

/** 회원의 프로젝트 전체 */
export async function findProjects(role: Role): Promise<Project[]> {
  return (await load(role)).projects;
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
  return (await load(role)).details[recruitmentKey] ?? { conditions: "", testItems: [] };
}

/** 모집 건의 취소 요청. 운영자가 처리한 요청이 있으면 그것을, 아니면 시연 중 보낸 요청(처리 대기)을 돌려준다 */
export async function findCancelRequest(role: Role, recruitmentKey: string): Promise<CancelRequest | null> {
  const processed = (await load(role)).cancelRequests[recruitmentKey];
  const sent = (await readCancelRequests())[recruitmentKey];
  /* 반려된 뒤 다시 보낸 요청은 새 요청이 우선이다 */
  if (sent && (!processed || (processed.status === "rejected" && sent.requestedAt > processed.requestedAt))) {
    return { status: "pending", ...sent };
  }
  return processed ?? null;
}

/** 모집 취소 요청을 저장한다. 서버 액션에서만 부른다. 저장하지 못하면 false */
export async function saveRecruitmentCancelRequest(recruitmentKey: string, reason: string): Promise<boolean> {
  return saveCancelRequest(recruitmentKey, { reason, requestedAt: new Date().toISOString() });
}

/** 회원이 지금 구독 중인지. 시연에서는 개발자 역할만 구독 중이다 */
export async function findIsSubscribed(role: Role): Promise<boolean> {
  return role === "developer";
}
