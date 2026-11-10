import { getDemoDataMode } from "@/demo/mode";
import { buildParticipations, readDemoFeedback } from "@/demo/participation";
import { isBackendId } from "@/features/project/api";
import { getRecruitmentsBySlugs } from "@/features/recruitment/api";
import type { Recruitment, SelectionMode, SoftwareType } from "@/features/recruitment/types";
import { getSession } from "@/features/session/session";
import { backendFetch, isBackendAuth } from "@/lib/backend";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import "server-only";
import {
  keyDateOf,
  PARTICIPATION_TABS,
  rewardOf,
  TAB_STATUSES,
  tabOf,
  type FeedbackEntry,
  type ParticipationCounts,
  type ParticipationItem,
  type ParticipationStatus,
  type ParticipationSummary,
  type ParticipationTab,
} from "@/features/participation/types";
import { OTHER_FEEDBACK_KEY, type FeedbackFieldErrors } from "@/features/participation/feedback-fields";
import { participationPath } from "@/features/participation/paths";

/*
 * 로그인한 사용자의 참여 데이터 접근. AUTH_MODE=backend이면 백엔드를 읽고, 아니면 목업을 돌려준다.
 */

const SLOW_DELAY_MS = 1500;
const PARTICIPATIONS_API = "/api/v1/tester/participations";

/** 백엔드 ParticipationResponse.RecruitmentInfo */
type RecruitmentInfo = {
  id: number;
  title: string;
  description: string | null;
  projectName: string;
  projectImageUrl: string | null;
  status: string;
  selectionMode: SelectionMode;
  softwareType: SoftwareType | null;
  subscription: boolean;
  recruitDeadline: string;
  submitDeadline: string;
};

/** 백엔드 ParticipationListItemResponse. 상세 응답도 이 값을 함께 준다 */
type ParticipationResponse = {
  id: number;
  status: ParticipationStatus;
  keyDate?: string;
  appliedAt: string;
  submittedAt: string | null;
  earnedCredits: number;
  reward: number;
  recruitment: RecruitmentInfo;
};

type ParticipationDetailResponse = ParticipationResponse & {
  accessUrl: string | null;
  testItems: Array<{ id: number; title: string; description: string | null; required: boolean }>;
  feedbacks: Array<{ testItemId: number | null; content: string }>;
};

type ParticipationSummaryResponse = ParticipationSummary & { counts: ParticipationCounts };

/* 화면의 모집 건 모양으로 바꾼다. 보상은 참가에 정해진 값을 쓰고, 추가 보상은 지급하지 않는다 */
function toRecruitment(info: RecruitmentInfo, reward: number): Recruitment {
  return {
    slug: String(info.id),
    projectName: info.projectName,
    ...(info.projectImageUrl ? { projectImage: info.projectImageUrl } : {}),
    summary: info.description ?? "",
    request: info.title,
    softwareTypes: info.softwareType ? [info.softwareType] : [],
    isSubscription: info.subscription,
    createdAt: "",
    recruitDeadline: info.recruitDeadline,
    submitDeadline: info.submitDeadline,
    confirmedCount: 0,
    baseReward: reward,
  };
}

/* 지급·검토·취소 시각은 따로 오지 않고 상태에 맞는 keyDate로 온다 */
function toParticipation(row: ParticipationResponse): ParticipationItem {
  return {
    key: String(row.id),
    recruitmentSlug: String(row.recruitment.id),
    status: row.status,
    appliedAt: row.appliedAt,
    ...(row.submittedAt ? { submittedAt: row.submittedAt } : {}),
    ...(row.status === "paid" ? { paidAt: row.keyDate } : {}),
    ...(row.status === "excluded" ? { reviewedAt: row.keyDate } : {}),
    ...(row.status === "cancelled" ? { cancelledAt: row.keyDate } : {}),
    ...(row.recruitment.status === "cancelled" ? { recruitmentCancelled: true } : {}),
    earnedCredits: row.earnedCredits,
    testItems: [],
    feedbacks: [],
    recruitment: toRecruitment(row.recruitment, row.reward),
  };
}

/**
 * 참여 API를 읽는다. next가 있으면 로그인이 끊겼을 때 그 주소로 돌아오도록 로그인으로 보낸다.
 * 목록 화면은 next 없이 읽는다. 현재 탭을 아는 LoginGate가 로그인 이동을 맡아야 탭이 유지된다
 */
async function readParticipationApi<T>(path: string, next?: string): Promise<T | null> {
  const result = await backendFetch<T>(`${PARTICIPATIONS_API}${path}`);
  if (result.ok) return result.data;
  if (result.status === 401 && next) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (result.status === 401 || result.status === 404) return null;
  throw new Error(result.message);
}

/* 탭 개수와 요약을 한 요청 안에서 한 번만 읽는다 */
const readSummary = cache(async (): Promise<ParticipationSummaryResponse> => {
  const summary = await readParticipationApi<ParticipationSummaryResponse>("/summary");
  return summary ?? { counts: { applied: 0, ongoing: 0, history: 0 }, feedbackToSubmit: 0, payoutPendingCredits: 0 };
});

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
  if (isBackendAuth) {
    const rows = await readParticipationApi<ParticipationResponse[]>(`?tab=${tab}`);
    return (rows ?? []).map(toParticipation);
  }
  const items = (await loadAll()).filter((item) => tabOf(item.status) === tab);
  if (tab === "history") return items.sort((a, b) => byKeyDate(b, a));
  const order = TAB_STATUSES[tab];
  return items.sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status) || byKeyDate(a, b));
}

export async function getParticipationCounts(): Promise<ParticipationCounts> {
  if (isBackendAuth) return (await readSummary()).counts;
  const items = await loadAll();
  return Object.fromEntries(
    PARTICIPATION_TABS.map((tab) => [tab, items.filter((item) => tabOf(item.status) === tab).length]),
  ) as ParticipationCounts;
}

export async function getParticipationSummary(): Promise<ParticipationSummary> {
  if (isBackendAuth) {
    const { feedbackToSubmit, payoutPendingCredits } = await readSummary();
    return { feedbackToSubmit, payoutPendingCredits };
  }
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
  if (isBackendAuth) {
    if (!isBackendId(key)) return null;
    const detail = await readParticipationApi<ParticipationDetailResponse>(`/${key}`, participationPath(key));
    if (!detail) return null;
    /* 상세 응답에는 keyDate가 없어, 끝난 참여의 지급·검토·취소 시각은 참여했던 탭의 행에서 가져온다 */
    const ended = detail.status === "paid" || detail.status === "excluded" || detail.status === "cancelled";
    const history = ended ? await readParticipationApi<ParticipationResponse[]>("?tab=history", participationPath(key)) : null;
    const keyDate = history?.find((row) => row.id === detail.id)?.keyDate;
    return {
      ...toParticipation({ ...detail, keyDate }),
      ...(detail.accessUrl ? { accessUrl: detail.accessUrl } : {}),
      testItems: detail.testItems.map((item) => ({ id: String(item.id), title: item.title, description: item.description ?? "", required: item.required })),
      feedbacks: detail.feedbacks.map((feedback) => ({
        testItemId: feedback.testItemId === null ? null : String(feedback.testItemId),
        content: feedback.content,
        imageNames: [],
      })),
    };
  }
  return (await loadAll()).find((item) => item.key === key) ?? null;
}

/** 이 회원의 제출 전 참여를 피드백 제출 마감이 가까운 순서로. 없으면 빈 배열 */
export async function getUpcomingDeadlines(): Promise<ParticipationItem[]> {
  if (isBackendAuth) return ((await readParticipationApi<ParticipationResponse[]>("/deadlines")) ?? []).map(toParticipation);
  return (await loadAll()).filter((item) => item.status === "beforeSubmit").sort(byKeyDate);
}


import { saveDemoFeedback } from "@/demo/participation";
import { requireMember } from "@/features/session/guard";

/** 서버가 준 칸 이름(testItems.{id}, etc)을 화면 칸 키로 바꾼다 */
function toFeedbackFieldErrors(fields: Record<string, string>): FeedbackFieldErrors {
  return Object.fromEntries(Object.entries(fields).map(([key, error]) => [key === "etc" ? OTHER_FEEDBACK_KEY : key.replace(/^testItems\./, ""), error]));
}

/**
 * 검증을 마친 피드백을 백엔드에 저장한다. 성공하면 null, 실패하면 폼에 보여 줄 오류를 돌려준다.
 * 이미지 주소는 브라우저가 올린 뒤에 칸마다 넘어온다. 없으면 빈 목록이다.
 */
export async function saveBackendFeedback(participationKey: string, entries: FeedbackEntry[]): Promise<{ errors: FeedbackFieldErrors; error?: string } | null> {
  const path = participationPath(participationKey);
  await requireMember(path);
  const etc = entries.find((entry) => entry.testItemId === null);
  const result = await backendFetch(`${PARTICIPATIONS_API}/${participationKey}/feedbacks`, {
    method: "POST",
    body: {
      items: entries.flatMap((entry) => (entry.testItemId === null ? [] : [{ testItemId: Number(entry.testItemId), content: entry.content, imageUrls: entry.imageUrls ?? [] }])),
      etc: etc?.content ?? null,
      etcImageUrls: etc?.imageUrls ?? [],
    },
  });
  if (result.ok) return null;
  if (result.status === 401) redirect(`/login?next=${encodeURIComponent(path)}`);
  if (result.fields && Object.keys(result.fields).length > 0) return { errors: toFeedbackFieldErrors(result.fields) };
  return { errors: {}, error: result.message };
}

export async function saveFeedback(participationKey: string, entries: Parameters<typeof saveDemoFeedback>[1]) {
  await requireMember(participationPath(participationKey));
  return saveDemoFeedback(participationKey, entries);
}
