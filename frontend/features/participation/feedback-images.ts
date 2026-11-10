/*
 * 피드백 이미지 검사. 화면(파일을 고를 때)과 서버(제출할 때)가 같은 규칙을 쓴다.
 * 시연용이라 파일 자체는 서버로 보내지 않고 이름·크기·형식만 보낸다.
 * 실제 업로드는 백엔드 저장소가 정해지면 붙인다. 한도는 프로젝트 이미지(PR #31)와 같다.
 */

export const FEEDBACK_IMAGE_LIMIT = {
  count: 5,
  bytes: 5 * 1024 * 1024,
  types: ["image/png", "image/jpeg", "image/webp"],
} as const;

export const FEEDBACK_IMAGE_HINT = "PNG, JPG, WEBP · 한 장에 5MB까지 · 5장까지";

/** 고른 파일의 이름·크기·형식 */
export type FileMeta = { name: string; size: number; type: string };

/** 이미지 목록이 한도 안인지. 문제가 있으면 안내 문구를 돌려준다 */
export function checkFeedbackImages(files: FileMeta[]): string | undefined {
  const { count, bytes, types } = FEEDBACK_IMAGE_LIMIT;
  if (files.length > count) return `이미지는 ${count}장까지 올릴 수 있어요`;
  if (files.some((file) => !(types as readonly string[]).includes(file.type))) return "PNG, JPG, WEBP 이미지만 올릴 수 있어요";
  if (files.some((file) => file.size > bytes)) return "이미지는 한 장에 5MB까지 올릴 수 있어요";
}

/** 피드백 이미지를 올리는 테스터 주소. key는 참가 id다 */
export function feedbackImageUploadPath(key: string) {
  return `/api/v1/tester/participations/${key}/feedbacks/images`;
}

const IMAGE_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp)$/;

/** 테스터가 다시 보는 주소. 참가 id는 숫자이고 파일 이름은 uuid 이미지다 */
export function isFeedbackImageUrl(value: string) {
  return isImageUrl(value, /^\/api\/v1\/tester\/participations\/\d+\/feedbacks\/images\/([^/]+)$/);
}

/** 개발자가 다시 보는 주소. 피드백 id는 숫자이고 파일 이름은 uuid 이미지다 */
export function isDeveloperFeedbackImageUrl(value: string) {
  return isImageUrl(value, /^\/api\/v1\/developer\/feedbacks\/\d+\/images\/([^/]+)$/);
}

function isImageUrl(value: string, pattern: RegExp) {
  const name = pattern.exec(value)?.[1];
  return name !== undefined && !name.includes("..") && IMAGE_NAME.test(name);
}

/** 폼에 숨겨 보낸 파일 정보(JSON)를 읽는다. 모양이 다르면 null */
export function parseFileMeta(raw: unknown): FileMeta[] | null {
  try {
    const parsed: unknown = JSON.parse(String(raw ?? "[]"));
    if (!Array.isArray(parsed)) return null;
    const ok = parsed.every(
      (item) => typeof item?.name === "string" && typeof item?.size === "number" && typeof item?.type === "string",
    );
    return ok ? (parsed as FileMeta[]) : null;
  } catch {
    return null;
  }
}
