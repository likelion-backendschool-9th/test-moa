"use server";

import { getOwnedProject, saveBackendProject } from "@/features/project/api";
import { PROJECTS_PATH, PROJECT_NEW_PATH, projectEditPath, projectPath } from "@/features/project/paths";
import type { FormState } from "@/features/project/types";
import { validateProjectForm } from "@/features/project/types";
import { requireRole } from "@/features/session/guard";
import { isBackendAuth } from "@/lib/backend";
import { redirect } from "next/navigation";

/*
 * 폼 제출을 받는 서버 액션. 입력을 검사하고 데이터 접근 함수로 권한을 확인한다.
 * AUTH_MODE=backend이면 백엔드에 저장하고, 목업이면 저장하지 않는다. 검증을 통과하면 안내와 함께 이동한다.
 */

/** 프로젝트 등록(projectKey가 null)과 수정 */
export async function saveProject(projectKey: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  const owned = projectKey ? await getOwnedProject(projectEditPath(projectKey), projectKey) : null;
  if (!projectKey) await requireRole(PROJECT_NEW_PATH);

  const result = validateProjectForm(formData);
  if (Object.keys(result.errors).length > 0) return result;
  if (isBackendAuth) {
    const failed = await saveBackendProject(projectKey, result, formData, owned?.image?.url ?? null);
    if (failed) return failed;
  }
  redirect(projectKey ? `${projectPath(projectKey)}?notice=saved` : `${PROJECTS_PATH}?notice=saved`);
}
