/* 개발자 프로젝트·모집의 이동 주소. 서버와 클라이언트가 같은 규칙을 쓴다. */

export const DEVELOPER_RECRUITMENTS_PATH = "/developer/recruitments";
export const PROJECTS_PATH = "/developer/projects";
export const PROJECT_NEW_PATH = `${PROJECTS_PATH}/new`;

export function projectPath(projectKey: string) {
  return `${PROJECTS_PATH}/${encodeURIComponent(projectKey)}`;
}

export function projectEditPath(projectKey: string) {
  return `${projectPath(projectKey)}/edit`;
}

export function recruitmentCreatePath(projectKey: string) {
  return `${DEVELOPER_RECRUITMENTS_PATH}/new?project=${encodeURIComponent(projectKey)}`;
}

export function recruitmentManagePath(recruitmentKey: string) {
  return `${DEVELOPER_RECRUITMENTS_PATH}/${encodeURIComponent(recruitmentKey)}`;
}
