"use server";

import { redirect } from "next/navigation";
import { PROJECTS_PATH, PROJECT_NEW_PATH, projectPath, projectEditPath, recruitmentCreatePath } from "@/lib/project-paths";
import {
  cancelRecruitment as cancel,
  decideApplicants as decide,
  getMyProject,
  getRecruitmentFormInfo,
  recommendFollowupQuestions,
  requireRole,
  validateProjectForm,
  validateRecruitmentForm,
} from "./service";
import type { FollowupResult, FormState } from "./types";

/*
 * 폼 제출을 받는 서버 액션. 화면 계층의 입구라 service.ts만 부른다.
 * 목업이라 저장하지 않고, 검증을 통과하면 안내와 함께 이동한다.
 */

/** 프로젝트 등록(projectKey가 null)과 수정 */
export async function saveProject(projectKey: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  if (projectKey) await getMyProject(projectEditPath(projectKey), projectKey);
  else await requireRole(PROJECT_NEW_PATH);

  const result = validateProjectForm(formData);
  if (Object.keys(result.errors).length > 0) return result;
  redirect(projectKey ? `${projectPath(projectKey)}?notice=saved` : `${PROJECTS_PATH}?notice=saved`);
}

/** 테스트 모집 작성 */
export async function createRecruitment(projectKey: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { isSubscription } = await getRecruitmentFormInfo(recruitmentCreatePath(projectKey), projectKey);

  const result = validateRecruitmentForm(formData, isSubscription, new Date());
  if (Object.keys(result.errors).length > 0) return result;
  redirect(`${projectPath(projectKey)}?notice=saved`);
}

/** 지원자 확정·거절. 시연용이라 결과는 브라우저 쿠키에 남고, 요약·분석·내 프로젝트 화면에도 반영된다 */
export async function decideApplicants(
  recruitmentKey: string,
  ids: string[],
  status: "confirmed" | "rejected",
): Promise<{ ok: boolean }> {
  if (status !== "confirmed" && status !== "rejected") return { ok: false };
  return decide(recruitmentKey, ids, status);
}

/** 모집 취소. 운영자 승인 없이 바로 취소된다. 시연용이라 브라우저 쿠키에 남는다 */
export async function cancelRecruitment(
  recruitmentKey: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState & { ok?: boolean }> {
  return cancel(recruitmentKey, formData);
}

/** 피드백 하나로 AI 후속 질문을 받는다. 하루 3번 한도는 백엔드가 센다 */
export async function getFollowupQuestions(recruitmentKey: string, feedbackId: string): Promise<FollowupResult> {
  if (typeof recruitmentKey !== "string" || typeof feedbackId !== "string") return { ok: false, message: "잘못된 요청이에요" };
  return recommendFollowupQuestions(recruitmentKey, feedbackId);
}
