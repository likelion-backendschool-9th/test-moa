import "server-only";
import { connection } from "next/server";
import { cache } from "react";
import { getDemoDataMode } from "@/lib/demo";
import type { Role } from "@/lib/session";
import { buildGeneralRecruitments, buildPromotedRecruitments } from "@/features/recruitment/mock";
import { buildDeveloperProjects, type ProjectSeedData } from "./mock";
import type { Application, Feedback, Project } from "./types";

/*
 * 데이터 계층. 프로젝트·지원·피드백 데이터를 가져온다. 지금은 목업을 돌려준다.
 * 실제 API를 붙일 때는 이 파일의 함수 본문만 바꾸고 시그니처는 유지한다.
 * 이 파일은 service.ts만 불러온다.
 */

const SLOW_DELAY_MS = 1500;
const EMPTY: ProjectSeedData = { projects: [], applications: {}, feedbacks: {} };

/** 한 요청 안에서는 목업을 한 번만 만든다 */
const load = cache(async (role: Role): Promise<ProjectSeedData> => {
  const mode = await getDemoDataMode();
  if (mode === "slow") await new Promise((resolve) => setTimeout(resolve, SLOW_DELAY_MS));
  /* 날짜가 요청 시각 기준이라 미리 렌더링하지 않는다 */
  await connection();
  /* 시연에서는 개발자 역할만 프로젝트를 가진다 */
  if (mode === "empty" || role !== "developer") return EMPTY;
  const now = new Date();
  return buildDeveloperProjects(now, [...buildPromotedRecruitments(now), ...buildGeneralRecruitments(now)]);
});

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

/** 회원이 지금 구독 중인지. 시연에서는 개발자 역할만 구독 중이다 */
export async function findIsSubscribed(role: Role): Promise<boolean> {
  return role === "developer";
}
