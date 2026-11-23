"use server";

import { deleteProjectRequest, getOwnedProject, saveBackendProject } from "@/features/project/api";
import { getProjectDetail } from "@/features/recruitment/api";
import { PROJECTS_PATH, PROJECT_NEW_PATH, projectEditPath, projectPath } from "@/features/project/paths";
import type { FormState } from "@/features/project/types";
import { validateProjectForm } from "@/features/project/types";
import { requireRole } from "@/features/session/guard";
import { isBackendAuth } from "@/lib/backend";
import { revalidatePath } from "next/cache";
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
    /* 뒤로 가기로 돌아간 목록·상세·수정 화면에 저장 전 값이 남지 않게 한다 */
    revalidatePath(PROJECTS_PATH, "layout");
  }
  redirect(projectKey ? `${projectPath(projectKey)}?notice=saved` : `${PROJECTS_PATH}?notice=saved`);
}

export type DeleteProjectState = { error?: string };

/**
 * 프로젝트 삭제. 모집글이 하나도 없을 때만 지운다(취소한 모집글도 센다). 화면에서 막아도 요청은 조작될 수 있어서
 * 여기서 모집글을 다시 확인하고, 백엔드도 다시 확인한다. 지우면 내 프로젝트 목록으로 가서 안내를 보인다
 */
export async function deleteProject(_prev: DeleteProjectState, formData: FormData): Promise<DeleteProjectState> {
  const key = formData.get("projectKey");
  const projectKey = typeof key === "string" ? key : "";
  const { recruitments } = await getProjectDetail(projectPath(projectKey), projectKey);
  if (recruitments.length > 0) return { error: "모집글이 있는 프로젝트는 삭제할 수 없어요" };
  const error = await deleteProjectRequest(projectKey);
  if (error) return { error };
  revalidatePath(PROJECTS_PATH, "layout");
  redirect(`${PROJECTS_PATH}?notice=deleted`);
}
