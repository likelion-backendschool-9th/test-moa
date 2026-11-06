"use server";

import { getOwnedProject } from "@/features/project/api";
import { PROJECTS_PATH, PROJECT_NEW_PATH, projectEditPath, projectPath } from "@/features/project/paths";
import type { FormState } from "@/features/project/types";
import { validateProjectForm } from "@/features/project/types";
import { requireRole } from "@/features/session/guard";
import { redirect } from "next/navigation";

/*
 * 폼 제출을 받는 서버 액션. 화면 계층의 입구라 service.ts만 부른다.
 * 목업이라 저장하지 않고, 검증을 통과하면 안내와 함께 이동한다.
 */

/** 프로젝트 등록(projectKey가 null)과 수정 */
export async function saveProject(projectKey: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  if (projectKey) await getOwnedProject(projectEditPath(projectKey), projectKey);
  else await requireRole(PROJECT_NEW_PATH);

  const result = validateProjectForm(formData);
  if (Object.keys(result.errors).length > 0) return result;
  redirect(projectKey ? `${projectPath(projectKey)}?notice=saved` : `${PROJECTS_PATH}?notice=saved`);
}
