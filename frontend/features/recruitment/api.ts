import "server-only";
import { connection } from "next/server";
import { getDemoDataMode } from "@/demo/mode";
import { buildGeneralRecruitments, buildPastRecruitments, buildPromotedRecruitments } from "@/demo/recruitment";
import type { RecruitmentQuery } from "./query";
import type { Recruitment, RecruitmentPage } from "./types";

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

/** 구독 개발자의 모집 건 (상단 노출 혜택) */
export async function getSubscriptionRecruitments(): Promise<Recruitment[]> {
  const { subscription } = await loadAll();
  return [...subscription].sort(byLatest);
}

/** 모집 마감 전인 모집 건을 최신순으로. 홈 배너의 교정지 더미에 쓴다 */
export async function getLatestOpenRecruitments(limit = 3): Promise<Recruitment[]> {
  const { now, subscription, general } = await loadAll();
  return [...subscription, ...general]
    .filter((item) => new Date(item.recruitDeadline) > now)
    .sort(byLatest)
    .slice(0, limit);
}

export const RECRUITMENT_PAGE_SIZE = 20;

/** 전체 모집 건을 검색 조건으로 거르고 한 페이지만 잘라 준다. 검색 대상은 이름, 소개, 요청 내용이다 */
export async function searchRecruitments(query: RecruitmentQuery): Promise<RecruitmentPage> {
  const { now, subscription, general } = await loadAll();
  const keyword = query.q.toLowerCase();
  const isClosed = (item: Recruitment) => new Date(item.recruitDeadline) <= now;
  /* 마감 임박순에서 이미 마감한 모집은 맨 뒤로 보낸다 */
  const byUpcomingDeadline = (a: Recruitment, b: Recruitment) => Number(isClosed(a)) - Number(isClosed(b)) || byDeadline(a, b);
  const sorter = { latest: byLatest, deadline: byUpcomingDeadline }[query.sort];
  const matched = [...subscription, ...general]
    .filter((item) => !query.type || item.softwareType === query.type)
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
