"use server";

import { redirect } from "next/navigation";
import {
  getMyProject,
  getRecruitmentFormInfo,
  requireRole,
  validateProjectForm,
  validateRecruitmentForm,
} from "./service";
import type { FormState } from "./types";

/*
 * 폼 제출을 받는 서버 액션. 화면 계층의 입구라 service.ts만 부른다.
 * 목업이라 저장하지 않고, 검증을 통과하면 안내와 함께 이동한다.
 */

/** 프로젝트 등록(projectKey가 null)과 수정 */
export async function saveProject(projectKey: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  if (projectKey) await getMyProject(`/my/projects/${projectKey}/edit`, projectKey);
  else await requireRole("/my/projects/new");

  const result = validateProjectForm(formData);
  if (Object.keys(result.errors).length > 0) return result;
  redirect(projectKey ? `/my/projects/${projectKey}?notice=saved` : "/my/projects?notice=saved");
}

/** 테스트 모집 작성 */
export async function createRecruitment(projectKey: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { maxCapacity } = await getRecruitmentFormInfo(`/my/projects/${projectKey}/recruitments/new`, projectKey);

  const result = validateRecruitmentForm(formData, maxCapacity, new Date());
  if (Object.keys(result.errors).length > 0) return result;
  redirect(`/my/projects/${projectKey}?notice=saved`);
}
