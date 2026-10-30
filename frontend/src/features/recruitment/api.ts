import "server-only";
import { connection } from "next/server";
import { getDemoDataMode } from "@/lib/demo";
import { buildGeneralRecruitments, buildPromotedRecruitments } from "./mock";
import type { RecruitmentQuery } from "./query";
import { isFull, type Recruitment } from "./types";

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
const byReward = (a: Recruitment, b: Recruitment) => b.baseReward - a.baseReward;

/** 구독 개발자의 모집 건 (상단 노출 혜택) */
export async function getSubscriptionRecruitments(): Promise<Recruitment[]> {
  const { subscription } = await loadAll();
  return [...subscription].sort(byLatest);
}

/** 모집 마감 전이고 정원이 남은 모집 건을 마감이 가까운 순서로 */
export async function getClosingSoon(limit = 5): Promise<Recruitment[]> {
  const { now, subscription, general } = await loadAll();
  return [...subscription, ...general]
    .filter((item) => !isFull(item) && new Date(item.recruitDeadline) > now)
    .sort(byDeadline)
    .slice(0, limit);
}

/** 전체 모집 건을 검색 조건으로 거른다. 검색 대상은 이름, 소개, 요청 내용이다 */
export async function searchRecruitments(query: RecruitmentQuery): Promise<Recruitment[]> {
  const { subscription, general } = await loadAll();
  const keyword = query.q.toLowerCase();
  const sorter = { latest: byLatest, deadline: byDeadline, reward: byReward }[query.sort];
  return [...subscription, ...general]
    .filter((item) => !query.type || item.softwareType === query.type)
    .filter((item) => !query.open || !isFull(item))
    .filter((item) => !keyword || [item.projectName, item.summary, item.request].some((text) => text.toLowerCase().includes(keyword)))
    .sort(sorter);
}
