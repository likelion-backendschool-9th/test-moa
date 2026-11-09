import { getDemoDataMode, waitIfSlow } from "@/demo/mode";
import { buildProjectRecords } from "@/demo/project";
import { parseFileMeta } from "@/features/project/media";
import type { FormState, Project } from "@/features/project/types";
import { requireRole } from "@/features/session/guard";
import { backendFetch, isBackendAuth } from "@/lib/backend";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import "server-only";

const PROJECTS_API = "/api/v1/developer/projects";

/** 백엔드 ProjectResponse */
type ProjectResponse = {
  id: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
  createdAt: string;
  recruitmentCount: number;
  openRecruitmentCount: number;
};

function toProject({ id, name, description, imageUrl, createdAt }: ProjectResponse): Project {
  return {
    key: String(id),
    name,
    description: description ?? "",
    image: imageUrl ? { url: imageUrl, name: `${name} 대표 이미지` } : null,
    createdAt,
  };
}

/** 프로젝트 API를 읽는다. 없거나 남의 프로젝트면 404 화면, 그 밖의 실패는 오류 화면으로 보낸다 */
export async function readProjectApi<T>(path = ""): Promise<T> {
  const result = await backendFetch<T>(`${PROJECTS_API}${path}`);
  if (result.ok) return result.data;
  if (result.status === 404) notFound();
  throw new Error(result.message);
}

/** 내 프로젝트 전체(최신순)와 모집 수 */
export async function findBackendProjects() {
  const items = await readProjectApi<ProjectResponse[]>();
  return items.map((item) => ({
    ...toProject(item),
    recruitmentCount: item.recruitmentCount,
    openRecruitmentCount: item.openRecruitmentCount,
  }));
}

/** 백엔드 id(Java Long)의 최댓값. 넘으면 백엔드가 400으로 거절한다 */
const MAX_BACKEND_ID = BigInt("9223372036854775807");

/** 주소의 키가 백엔드 id로 쓸 수 있는 값인지 */
export function isBackendId(key: string) {
  return /^\d+$/.test(key) && BigInt(key) <= MAX_BACKEND_ID;
}

/** 프로젝트 하나. 주소의 키는 프로젝트 id라 숫자가 아니거나 id 범위를 넘으면 없는 프로젝트다 */
export async function findBackendProject(projectKey: string): Promise<Project> {
  if (!isBackendId(projectKey)) notFound();
  return toProject(await readProjectApi<ProjectResponse>(`/${projectKey}`));
}

/** 프로젝트의 존재와 소유자만 확인한다. 모집 목록이나 처리 기록은 읽지 않는다. */
export async function getOwnedProject(path: string, projectKey: string) {
  const role = await requireRole(path);
  if (isBackendAuth) return findBackendProject(projectKey);
  await waitIfSlow();
  await connection();
  if (role !== "developer" || (await getDemoDataMode()) === "empty") notFound();
  const project = buildProjectRecords(new Date()).find(item => item.key === projectKey);
  if (!project) notFound();
  return project;
}

/**
 * 검증을 마친 프로젝트를 백엔드에 저장한다. 성공하면 null, 실패하면 폼에 보여 줄 상태를 돌려준다.
 * 폼의 이미지 정보에서 크기가 0이면 원래 있던 이미지다. 수정 API는 보낸 값으로 모두 바꾸므로 그 주소를 다시 보낸다.
 * shortcut: 파일 저장소가 없어(#119) 새 이미지는 저장하지 못한다. 저장소가 생기면 업로드한 주소를 보낸다
 */
export async function saveBackendProject(
  projectKey: string | null,
  state: FormState,
  formData: FormData,
  currentImageUrl: string | null,
): Promise<FormState | null> {
  const [picked] = parseFileMeta(formData.get("imagesMeta")) ?? [];
  if (picked && picked.size > 0) {
    return { values: state.values, errors: { images: "대표 이미지 업로드는 아직 준비 중이에요. 이미지를 빼고 저장해 주세요" } };
  }
  const result = await backendFetch<ProjectResponse>(projectKey ? `${PROJECTS_API}/${projectKey}` : PROJECTS_API, {
    method: projectKey ? "PUT" : "POST",
    body: { name: state.values.name, description: state.values.description, imageUrl: picked ? currentImageUrl : null },
  });
  if (result.ok) return null;
  return { values: state.values, errors: toFormErrors(result.message, result.fields) };
}

/* 백엔드 칸 이름을 화면 칸 이름으로 바꾼다. 칸이 없는 오류는 폼 아래에 보인다 */
function toFormErrors(message: string, fields?: Record<string, string>): Record<string, string> {
  if (!fields || Object.keys(fields).length === 0) return { form: message };
  return Object.fromEntries(Object.entries(fields).map(([key, error]) => [key === "imageUrl" ? "images" : key, error]));
}
