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
