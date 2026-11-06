import { getDemoDataMode } from "@/demo/mode";
import { buildParticipations,readDemoFeedback } from "@/demo/participation";
import { getRecruitmentsBySlugs } from "@/features/recruitment/api";
import { getSession } from "@/features/session/session";
import { connection } from "next/server";
import { cache } from "react";
import "server-only";
import {
keyDateOf,
PARTICIPATION_TABS,
rewardOf,
TAB_STATUSES,
tabOf,
type ParticipationCounts,
type ParticipationItem,
type ParticipationSummary,
type ParticipationTab,
} from "./types";

/*
 * 로그인한 사용자의 참여 데이터 접근. 지금은 목업을 돌려준다.
 * 실제 API를 붙일 때는 이 파일의 함수 본문만 바꾸고 시그니처는 유지한다.
 */

const SLOW_DELAY_MS = 1500;

/* 한 요청 안에서 여러 영역이 불러도 한 번만 읽는다 */
const loadAll = cache(async (): Promise<ParticipationItem[]> => {
  const [session, mode] = await Promise.all([getSession(), getDemoDataMode()]);
  if (mode === "slow") await new Promise((resolve) => setTimeout(resolve, SLOW_DELAY_MS));
  await connection();
  /* 샘플 참여 내역은 데모 테스터에게만 있다 */
  if (session.role !== "tester" || mode === "empty") return [];
  const submitted = await readDemoFeedback();
  const participations = buildParticipations(new Date());
  const recruitments = await getRecruitmentsBySlugs(participations.map((item) => item.recruitmentSlug));
  return participations.flatMap((participation) => {
    const recruitment = recruitments.find((item) => item.slug === participation.recruitmentSlug);
    if (!recruitment) return [];
    /* 이 브라우저에서 제출한 피드백이 있으면 제출 전 → 지급 대기로 넘긴다 */
    const feedback = participation.status === "beforeSubmit" ? submitted[participation.key] : undefined;
    return feedback
      ? [{ ...participation, recruitment, status: "payoutPending", submittedAt: feedback.submittedAt, feedbacks: feedback.entries }]
      : [{ ...participation, recruitment }];
  });
});

const byKeyDate = (a: ParticipationItem, b: ParticipationItem) => keyDateOf(a).at.localeCompare(keyDateOf(b).at);

/** 탭의 참여. 지원한·참여 중은 할 일 순서(상태 순서 → 날짜 가까운 순), 참여했던은 최근 순 */
export async function getParticipations(tab: ParticipationTab): Promise<ParticipationItem[]> {
  const items = (await loadAll()).filter((item) => tabOf(item.status) === tab);
  if (tab === "history") return items.sort((a, b) => byKeyDate(b, a));
  const order = TAB_STATUSES[tab];
  return items.sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status) || byKeyDate(a, b));
}

export async function getParticipationCounts(): Promise<ParticipationCounts> {
  const items = await loadAll();
  return Object.fromEntries(
    PARTICIPATION_TABS.map((tab) => [tab, items.filter((item) => tabOf(item.status) === tab).length]),
  ) as ParticipationCounts;
}

export async function getParticipationSummary(): Promise<ParticipationSummary> {
  const items = await loadAll();
  return {
    feedbackToSubmit: items.filter((item) => item.status === "beforeSubmit").length,
    payoutPendingCredits: items
      .filter((item) => item.status === "payoutPending")
      .reduce((sum, item) => sum + rewardOf(item.recruitment), 0),
  };
}

/** 참여 하나. 없거나 이 회원의 참여가 아니면 null */
export async function getParticipation(key: string): Promise<ParticipationItem | null> {
  return (await loadAll()).find((item) => item.key === key) ?? null;
}

/** 이 회원의 제출 전 참여를 피드백 제출 마감이 가까운 순서로. 없으면 빈 배열 */
export async function getUpcomingDeadlines(): Promise<ParticipationItem[]> {
  return (await loadAll()).filter((item) => item.status === "beforeSubmit").sort(byKeyDate);
}


import { saveDemoFeedback } from "@/demo/participation";
import { requireMember } from "@/features/session/guard";
import { participationPath } from "@/lib/participation-paths";

export async function saveFeedback(participationKey: string, entries: Parameters<typeof saveDemoFeedback>[1]) {
  await requireMember(participationPath(participationKey));
  return saveDemoFeedback(participationKey, entries);
}
